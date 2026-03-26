from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import Artifact, Event, Run
from ..schemas import (
    HealthRead,
    HourlyReportRead,
    PortfolioSummaryRead,
    ReportRead,
    RunCreated,
    RunDetail,
    RunListItem,
    ScenarioCreate,
)
from ..services.analytics import PortfolioAnalyticsService
from ..services.storage import ArtifactStorage
from ..services.workflow import WorkflowService


def create_router(workflow: WorkflowService, storage: ArtifactStorage, runtime_health: HealthRead) -> APIRouter:
    router = APIRouter()
    analytics = PortfolioAnalyticsService()

    @router.post("/scenarios", response_model=RunCreated)
    async def create_scenario(
        scenario: str = Form(...),
        files: list[UploadFile] = File(default_factory=list),
        db: Session = Depends(get_db),
    ) -> RunCreated:
        try:
            parsed = ScenarioCreate.model_validate_json(scenario)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=422, detail=f"Invalid scenario payload: {exc}") from exc

        run = Run(
            scenario_id=parsed.scenario_id,
            equipment_id=parsed.equipment_id,
            region=parsed.region,
            operation_type=parsed.operation_type,
            telemetry_payload=parsed.telemetry_payload,
            scenario_metadata=parsed.scenario_metadata,
            has_attachments=bool(files),
        )
        db.add(run)
        db.flush()

        for upload in files:
            content = await upload.read()
            storage_key = f"{run.id}/{upload.filename}"
            stored = storage.save_bytes(storage_key, content, upload.content_type or "application/octet-stream")
            db.add(
                Artifact(
                    run_id=run.id,
                    name=upload.filename or "attachment.bin",
                    kind="attachment",
                    storage_key=stored.storage_key,
                    media_type=upload.content_type or "application/octet-stream",
                    size_bytes=stored.size_bytes,
                )
            )

        db.add(
            Event(
                run_id=run.id,
                agent_name="Ingestion Agent",
                event_type="scenario_received",
                message="Scenario received and queued for execution.",
                payload=parsed.model_dump(mode="json"),
            )
        )
        db.commit()
        workflow.dispatch_run(run.id)
        return RunCreated(run_id=run.id, status="queued")

    @router.get("/runs", response_model=list[RunListItem])
    def list_runs(db: Session = Depends(get_db)) -> list[RunListItem]:
        runs = db.scalars(select(Run).order_by(desc(Run.created_at))).all()
        return [RunListItem.model_validate(run, from_attributes=True) for run in runs]

    @router.get("/runs/{run_id}", response_model=RunDetail)
    def get_run(run_id: str, db: Session = Depends(get_db)) -> RunDetail:
        run = _get_run_with_relations(db, run_id)
        if run is None:
            raise HTTPException(status_code=404, detail="Run not found")
        return RunDetail.model_validate(
            {
                **run.__dict__,
                "artifacts": run.artifacts,
                "events": run.events,
                "agent_steps": run.agent_steps,
                "risk_assessments": run.risk_assessments,
                "reports": run.reports,
                "policy_decisions": run.policy_decisions,
            },
            from_attributes=True,
        )

    @router.get("/runs/{run_id}/events")
    def get_run_events(run_id: str, db: Session = Depends(get_db)) -> list[dict]:
        run = _get_run_with_relations(db, run_id)
        if run is None:
            raise HTTPException(status_code=404, detail="Run not found")
        return [
            {
                "id": event.id,
                "agent_name": event.agent_name,
                "event_type": event.event_type,
                "message": event.message,
                "payload": event.payload,
                "created_at": event.created_at,
            }
            for event in run.events
        ]

    @router.get("/runs/{run_id}/artifacts")
    def get_run_artifacts(run_id: str, db: Session = Depends(get_db)) -> list[dict]:
        run = _get_run_with_relations(db, run_id)
        if run is None:
            raise HTTPException(status_code=404, detail="Run not found")
        return [
            {
                "id": artifact.id,
                "name": artifact.name,
                "kind": artifact.kind,
                "media_type": artifact.media_type,
                "size_bytes": artifact.size_bytes,
                "storage_key": artifact.storage_key,
                "created_at": artifact.created_at,
            }
            for artifact in run.artifacts
        ]

    @router.get("/reports/hourly/latest", response_model=HourlyReportRead)
    def latest_hourly_report(db: Session = Depends(get_db)) -> HourlyReportRead:
        report = workflow.latest_hourly_report(db)
        return HourlyReportRead(report=ReportRead.model_validate(report, from_attributes=True) if report else None)

    @router.post("/reports/hourly/generate", response_model=HourlyReportRead)
    def generate_hourly_report(db: Session = Depends(get_db)) -> HourlyReportRead:
        report = workflow.generate_hourly_report(db)
        return HourlyReportRead(report=ReportRead.model_validate(report, from_attributes=True))

    @router.get("/analytics/portfolio", response_model=PortfolioSummaryRead)
    def portfolio_summary(hours: int = Query(default=24, ge=1, le=168), db: Session = Depends(get_db)) -> PortfolioSummaryRead:
        return PortfolioSummaryRead.model_validate(analytics.summarize_portfolio(db, hours=hours))

    @router.get("/health", response_model=HealthRead)
    def health() -> HealthRead:
        return runtime_health

    return router


def _get_run_with_relations(db: Session, run_id: str) -> Run | None:
    return db.execute(
        select(Run)
        .options(
            selectinload(Run.artifacts),
            selectinload(Run.events),
            selectinload(Run.agent_steps),
            selectinload(Run.risk_assessments),
            selectinload(Run.reports),
            selectinload(Run.policy_decisions),
        )
        .where(Run.id == run_id)
    ).scalar_one_or_none()
