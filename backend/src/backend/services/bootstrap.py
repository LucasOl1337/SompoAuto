from __future__ import annotations

import asyncio
import json
from pathlib import Path

from sqlalchemy import select

from .. import db as db_module
from ..models import Artifact, Event, Run
from .storage import ArtifactStorage
from .workflow import WorkflowService


class DemoBootstrapService:
    def __init__(self, workflow: WorkflowService, storage: ArtifactStorage) -> None:
        self.workflow = workflow
        self.storage = storage
        self.sample_data_dir = Path(__file__).resolve().parents[4] / "sample_data"

    async def bootstrap_if_empty(self) -> None:
        with db_module.SessionLocal() as db:
            existing_run = db.scalars(select(Run.id).limit(1)).first()
            if existing_run is not None:
                return

        run_ids = self._create_demo_runs()
        if not run_ids:
            return

        tasks = [self.workflow.dispatch_run(run_id) for run_id in run_ids]
        await asyncio.gather(*tasks)

        with db_module.SessionLocal() as db:
            self.workflow.generate_hourly_report(db)

    def _create_demo_runs(self) -> list[str]:
        run_ids: list[str] = []
        seed_specs = [
            ("low-risk", self.sample_data_dir / "low-risk" / "scenario.json", None),
            ("high-risk", self.sample_data_dir / "high-risk" / "scenario.json", None),
            (
                "image-risk",
                self.sample_data_dir / "image-risk" / "scenario.json",
                self.sample_data_dir / "image-risk" / "inspection.svg",
            ),
        ]

        with db_module.SessionLocal() as db:
            for seed_key, scenario_path, attachment_path in seed_specs:
                payload = json.loads(scenario_path.read_text(encoding="utf-8"))
                scenario_metadata = dict(payload.get("scenario_metadata", {}))
                scenario_metadata["demo_seed"] = {
                    "source": "auto_bootstrap",
                    "version": "v1",
                    "seed_key": seed_key,
                }

                run = Run(
                    scenario_id=str(payload["scenario_id"]),
                    equipment_id=str(payload["equipment_id"]),
                    region=str(payload["region"]),
                    operation_type=str(payload["operation_type"]),
                    telemetry_payload=dict(payload.get("telemetry_payload", {})),
                    scenario_metadata=scenario_metadata,
                    has_attachments=attachment_path is not None,
                )
                db.add(run)
                db.flush()

                if attachment_path is not None:
                    content = attachment_path.read_bytes()
                    storage_key = f"{run.id}/{attachment_path.name}"
                    stored = self.storage.save_bytes(storage_key, content, "image/svg+xml")
                    db.add(
                        Artifact(
                            run_id=run.id,
                            name=attachment_path.name,
                            kind="attachment",
                            storage_key=stored.storage_key,
                            media_type="image/svg+xml",
                            size_bytes=stored.size_bytes,
                        )
                    )

                db.add(
                    Event(
                        run_id=run.id,
                        agent_name="Ingestion Agent",
                        event_type="scenario_received",
                        message="Demo scenario bootstrapped and queued for execution.",
                        payload=payload,
                    )
                )
                run_ids.append(run.id)

            db.commit()

        return run_ids
