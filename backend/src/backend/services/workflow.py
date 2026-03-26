from __future__ import annotations

import asyncio
import uuid
from collections.abc import Sequence
from contextlib import suppress
from datetime import timedelta
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from ..agents.registry import AGENTS
from .. import db as db_module
from ..models import AgentStep, Event, PolicyDecision, Report, RiskAssessment, Run, utcnow
from ..runtime.openclaw import OpenClawRuntime


class WorkflowService:
    def __init__(self, runtime: OpenClawRuntime) -> None:
        self.runtime = runtime
        self.tasks: dict[str, asyncio.Task[None]] = {}

    def dispatch_run(self, run_id: str) -> asyncio.Task[None]:
        task = asyncio.create_task(self._execute_run(run_id))
        self.tasks[run_id] = task
        return task

    async def _execute_run(self, run_id: str) -> None:
        try:
            with db_module.SessionLocal() as db:
                run = db.get(Run, run_id)
                if run is None:
                    return
                run.status = "running"
                run.started_at = utcnow()
                run.runtime_mode = self.runtime.describe_health()[0]
                self._add_event(db, run.id, None, "run_started", "Run execution started.", {})
                db.commit()

            with db_module.SessionLocal() as db:
                run = self._load_run(db, run_id)
                supervisor_output = self._run_supervisor(db, run)
                self._run_ingestion(db, run)
                assessment = self._run_risk(db, run)
                if supervisor_output.get("should_run_vision") and run.has_attachments:
                    self._run_vision_stub(db, run)
                self._run_auto_implementation(db, run, assessment)
                self._run_report(db, run, assessment)
                self._run_audit(db, run)
                run.status = "completed"
                run.completed_at = utcnow()
                self._add_event(db, run.id, None, "run_completed", "Run execution completed.", {})
                db.commit()
        except Exception as exc:  # noqa: BLE001
            with db_module.SessionLocal() as db:
                run = db.get(Run, run_id)
                if run is not None:
                    run.status = "partial_failure"
                    run.completed_at = utcnow()
                    self._add_event(
                        db,
                        run.id,
                        None,
                        "run_failed",
                        "Run completed with failure.",
                        {"error": str(exc)},
                    )
                    db.commit()
        finally:
            with suppress(KeyError):
                self.tasks.pop(run_id)

    def _load_run(self, db: Session, run_id: str) -> Run:
        statement = (
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
        )
        return db.execute(statement).scalar_one()

    def _start_step(self, db: Session, run: Run, agent_key: str, input_summary: dict[str, Any]) -> AgentStep:
        agent = AGENTS[agent_key]
        step = AgentStep(
            run_id=run.id,
            agent_name=agent.name,
            model_name=agent.model_name,
            runtime_name="internal",
            status="running",
            input_summary=input_summary,
        )
        db.add(step)
        self._add_event(db, run.id, agent.name, "agent_started", f"{agent.name} started.", input_summary)
        db.flush()
        return step

    def _finish_step(
        self,
        db: Session,
        run: Run,
        step: AgentStep,
        output_summary: dict[str, Any],
        runtime_name: str,
        status: str = "completed",
        error_text: str | None = None,
    ) -> None:
        step.status = status
        step.runtime_name = runtime_name
        step.output_summary = output_summary
        step.error_text = error_text
        step.completed_at = utcnow()
        self._add_event(
            db,
            run.id,
            step.agent_name,
            "agent_completed" if status == "completed" else "agent_failed",
            f"{step.agent_name} {status}.",
            output_summary,
        )
        db.flush()

    def _run_supervisor(self, db: Session, run: Run) -> dict[str, Any]:
        step = self._start_step(
            db,
            run,
            "supervisor",
            {"scenario_id": run.scenario_id, "has_attachments": run.has_attachments},
        )
        payload = {
            "scenario_id": run.scenario_id,
            "equipment_id": run.equipment_id,
            "region": run.region,
            "operation_type": run.operation_type,
            "telemetry_payload": run.telemetry_payload,
            "attachments": [artifact.name for artifact in run.artifacts],
        }
        result = self.runtime.invoke(AGENTS["supervisor"], payload)
        self._finish_step(db, run, step, result.content, result.runtime_name)
        db.commit()
        return result.content

    def _run_ingestion(self, db: Session, run: Run) -> None:
        step = self._start_step(
            db,
            run,
            "ingestion",
            {"telemetry_keys": sorted(run.telemetry_payload.keys()), "has_attachments": run.has_attachments},
        )
        output = {
            "validated": True,
            "attachment_count": len(run.artifacts),
            "metadata_keys": sorted(run.scenario_metadata.keys()),
        }
        self._finish_step(db, run, step, output, "internal")
        db.commit()

    def _run_risk(self, db: Session, run: Run) -> RiskAssessment:
        step = self._start_step(db, run, "risk", {"telemetry_payload": run.telemetry_payload})
        score, drivers = calculate_risk(run.telemetry_payload, run.has_attachments)
        level = classify_risk(score)
        recommendations = build_recommendations(level, drivers)
        result = self.runtime.invoke(
            AGENTS["risk"],
            {
                "summary": f"Risk score {score} classified as {level}. Drivers: {drivers}.",
                "telemetry_payload": run.telemetry_payload,
                "drivers": drivers,
                "recommendations": recommendations,
            },
        )
        assessment = RiskAssessment(
            run_id=run.id,
            risk_score=score,
            risk_level=level,
            drivers=drivers,
            recommendations=recommendations,
            explanation=result.content.get("summary", result.raw_text),
        )
        db.add(assessment)
        db.flush()
        self._finish_step(
            db,
            run,
            step,
            {"risk_score": score, "risk_level": level, "recommendations": recommendations},
            result.runtime_name,
        )
        db.commit()
        return assessment

    def _run_vision_stub(self, db: Session, run: Run) -> None:
        step = self._start_step(
            db,
            run,
            "vision",
            {"artifact_names": [artifact.name for artifact in run.artifacts]},
        )
        output = {
            "status": "simulated",
            "detections": [
                {
                    "label": "possible_obstacle_exposure",
                    "confidence": 0.81,
                    "severity": "medium",
                }
            ],
            "contract_version": "v1",
        }
        self._finish_step(db, run, step, output, "stub")
        db.commit()

    def _run_auto_implementation(self, db: Session, run: Run, assessment: RiskAssessment) -> None:
        step = self._start_step(
            db,
            run,
            "auto_implementation",
            {"risk_level": assessment.risk_level, "risk_score": assessment.risk_score},
        )
        result = self.runtime.invoke(
            AGENTS["auto_implementation"],
            {
                "risk_level": assessment.risk_level,
                "risk_score": assessment.risk_score,
                "recommendations": assessment.recommendations,
            },
        )
        decision = PolicyDecision(
            run_id=run.id,
            proposal_id=f"proposal-{uuid.uuid4()}",
            action_type="adjust_thresholds",
            risk_class=assessment.risk_level,
            decision="review_required",
            decision_reason=result.content.get(
                "decision_reason",
                "Prototype only; action remains simulated for governance validation.",
            ),
            execution_mode="simulated",
            proposal_payload={
                "proposal": result.content.get("proposal", "No-op simulated adjustment."),
                "risk_score": assessment.risk_score,
            },
        )
        db.add(decision)
        db.flush()
        self._finish_step(
            db,
            run,
            step,
            {
                "proposal_id": decision.proposal_id,
                "execution_mode": decision.execution_mode,
                "decision": decision.decision,
            },
            result.runtime_name,
        )
        db.commit()

    def _run_report(self, db: Session, run: Run, assessment: RiskAssessment) -> None:
        step = self._start_step(
            db,
            run,
            "report",
            {"risk_level": assessment.risk_level, "risk_score": assessment.risk_score},
        )
        result = self.runtime.invoke(
            AGENTS["report"],
            {
                "scenario_id": run.scenario_id,
                "risk_level": assessment.risk_level,
                "risk_score": assessment.risk_score,
                "drivers": assessment.drivers,
                "recommendations": assessment.recommendations,
            },
        )
        report = Report(
            run_id=run.id,
            report_type="run",
            title=f"Run report for {run.scenario_id}",
            content=result.content.get("summary", result.raw_text),
            runs_analyzed=1,
            top_risks=[{"risk_level": assessment.risk_level, "risk_score": assessment.risk_score}],
            repeated_failures=[driver["name"] for driver in assessment.drivers[:2]],
            suggested_actions=assessment.recommendations,
            system_notes=result.content.get("system_notes", "Run report generated."),
        )
        db.add(report)
        db.flush()
        self._finish_step(db, run, step, {"report_id": report.id, "report_type": report.report_type}, result.runtime_name)
        db.commit()

    def _run_audit(self, db: Session, run: Run) -> None:
        step = self._start_step(
            db,
            run,
            "audit",
            {"step_count": len(run.agent_steps)},
        )
        output = {
            "status": "traceable",
            "events_recorded": len(run.events),
            "artifacts_recorded": len(run.artifacts),
            "policy_decisions": len(run.policy_decisions),
        }
        self._finish_step(db, run, step, output, "internal")
        db.commit()

    def generate_hourly_report(self, db: Session) -> Report:
        period_end = utcnow()
        period_start = period_end - timedelta(hours=1)
        runs = db.scalars(
            select(Run)
            .where(Run.created_at >= period_start)
            .options(selectinload(Run.risk_assessments))
            .order_by(desc(Run.created_at))
        ).all()
        top_risks: list[dict[str, Any]] = []
        repeated_failures: list[str] = []
        actions: list[str] = []
        for run in runs:
            if run.risk_assessments:
                assessment = run.risk_assessments[-1]
                top_risks.append(
                    {
                        "run_id": run.id,
                        "scenario_id": run.scenario_id,
                        "risk_level": assessment.risk_level,
                        "risk_score": assessment.risk_score,
                    }
                )
                repeated_failures.extend(driver["name"] for driver in assessment.drivers[:1])
                actions.extend(assessment.recommendations[:1])

        result = self.runtime.invoke(
            AGENTS["report"],
            {
                "runs_analyzed": len(runs),
                "top_risks": top_risks[:5],
                "repeated_failures": repeated_failures[:5],
                "suggested_actions": actions[:5],
            },
        )
        report = Report(
            report_type="hourly",
            title="Latest hourly operations report",
            content=result.content.get("summary", result.raw_text),
            runs_analyzed=len(runs),
            top_risks=top_risks[:5],
            repeated_failures=repeated_failures[:5],
            suggested_actions=actions[:5],
            system_notes=result.content.get("system_notes", "Hourly report generated."),
            period_start=period_start,
            period_end=period_end,
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        return report

    def latest_hourly_report(self, db: Session) -> Report | None:
        return db.scalars(
            select(Report).where(Report.report_type == "hourly").order_by(desc(Report.created_at)).limit(1)
        ).first()

    def _add_event(
        self,
        db: Session,
        run_id: str,
        agent_name: str | None,
        event_type: str,
        message: str,
        payload: dict[str, Any],
    ) -> None:
        db.add(
            Event(
                run_id=run_id,
                agent_name=agent_name,
                event_type=event_type,
                message=message,
                payload=payload,
            )
        )
        db.flush()


def calculate_risk(telemetry: dict[str, Any], has_attachments: bool) -> tuple[float, list[dict[str, Any]]]:
    score = 15.0
    drivers: list[dict[str, Any]] = []
    thresholds = {
        "temperature": (85, 18),
        "vibration": (65, 22),
        "speed": (45, 12),
        "obstacle_density": (60, 16),
        "proximity_water": (50, 15),
        "load_factor": (80, 10),
    }
    for name, (limit, weight) in thresholds.items():
        value = float(telemetry.get(name, 0))
        if value >= limit:
            score += weight
            drivers.append({"name": name, "value": value, "weight": weight})
    if has_attachments:
        score += 5
        drivers.append({"name": "visual_context_present", "value": 1, "weight": 5})
    return min(score, 100.0), drivers


def classify_risk(score: float) -> str:
    if score >= 75:
        return "high"
    if score >= 45:
        return "medium"
    return "low"


def build_recommendations(level: str, drivers: Sequence[dict[str, Any]]) -> list[str]:
    mapping = {
        "temperature": "Inspect cooling conditions before continuing the operation.",
        "vibration": "Schedule preventive maintenance and reduce operation intensity.",
        "speed": "Reduce movement speed in critical operating windows.",
        "obstacle_density": "Review route and obstacle avoidance policy for the operator.",
        "proximity_water": "Avoid operation near water or soften access controls.",
        "load_factor": "Redistribute load before the next cycle.",
        "visual_context_present": "Review attached visual evidence for operator briefing.",
    }
    recommendations = [mapping[driver["name"]] for driver in drivers if driver["name"] in mapping]
    if not recommendations:
        recommendations.append("Keep monitoring the current operation; no immediate corrective action required.")
    if level == "high":
        recommendations.append("Escalate to technical review before the next critical cycle.")
    return recommendations[:4]
