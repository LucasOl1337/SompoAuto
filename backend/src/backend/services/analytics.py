from __future__ import annotations

from collections import Counter, defaultdict
from datetime import timedelta
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from ..models import Report, RiskAssessment, Run, utcnow


class PortfolioAnalyticsService:
    def summarize_portfolio(self, db: Session, hours: int = 24) -> dict[str, Any]:
        period_end = utcnow()
        period_start = period_end - timedelta(hours=hours)
        runs = db.scalars(
            select(Run)
            .where(Run.created_at >= period_start)
            .options(selectinload(Run.risk_assessments))
            .order_by(desc(Run.created_at))
        ).all()
        run_assessments = [(run, assessment) for run in runs if (assessment := self._latest_assessment(run)) is not None]

        latest_hourly_report = db.scalars(
            select(Report).where(Report.report_type == "hourly").order_by(desc(Report.created_at)).limit(1)
        ).first()

        completed_runs = sum(1 for run in runs if run.status == "completed")
        in_progress_runs = sum(1 for run in runs if run.status in {"queued", "running"})
        runs_with_attachments = sum(1 for run in runs if run.has_attachments)
        high_risk_runs = sum(1 for _, assessment in run_assessments if assessment.risk_level == "high")
        average_risk_score = (
            round(sum(assessment.risk_score for _, assessment in run_assessments) / len(run_assessments), 1)
            if run_assessments
            else None
        )

        return {
            "period_hours": hours,
            "generated_at": period_end,
            "stats": {
                "total_runs": len(runs),
                "completed_runs": completed_runs,
                "in_progress_runs": in_progress_runs,
                "runs_with_attachments": runs_with_attachments,
                "runs_with_assessment": len(run_assessments),
                "high_risk_runs": high_risk_runs,
                "average_risk_score": average_risk_score,
            },
            "status_breakdown": self._build_count_breakdown(Counter(run.status for run in runs)),
            "risk_level_breakdown": self._build_count_breakdown(
                Counter(assessment.risk_level for _, assessment in run_assessments)
            ),
            "region_breakdown": self._build_risk_breakdown(run_assessments, lambda run: run.region),
            "operation_breakdown": self._build_risk_breakdown(run_assessments, lambda run: run.operation_type),
            "top_driver_hotspots": self._build_driver_hotspots(run_assessments),
            "prioritized_actions": self._build_prioritized_actions(run_assessments),
            "recent_high_risk_runs": [
                {
                    "run_id": run.id,
                    "scenario_id": run.scenario_id,
                    "region": run.region,
                    "operation_type": run.operation_type,
                    "status": run.status,
                    "risk_level": assessment.risk_level,
                    "risk_score": assessment.risk_score,
                    "created_at": run.created_at,
                }
                for run, assessment in run_assessments
                if assessment.risk_level == "high"
            ][:5],
            "latest_hourly_report": (
                {
                    "title": latest_hourly_report.title,
                    "created_at": latest_hourly_report.created_at,
                    "runs_analyzed": latest_hourly_report.runs_analyzed,
                }
                if latest_hourly_report is not None
                else None
            ),
        }

    def _latest_assessment(self, run: Run) -> RiskAssessment | None:
        if not run.risk_assessments:
            return None
        return max(run.risk_assessments, key=lambda item: item.generated_at)

    def _build_count_breakdown(self, counter: Counter[str]) -> list[dict[str, Any]]:
        return [
            {"label": label, "count": count}
            for label, count in sorted(counter.items(), key=lambda item: (-item[1], item[0]))
        ]

    def _build_risk_breakdown(
        self,
        run_assessments: list[tuple[Run, RiskAssessment]],
        key_fn,
    ) -> list[dict[str, Any]]:
        grouped: dict[str, list[RiskAssessment]] = defaultdict(list)
        for run, assessment in run_assessments:
            grouped[key_fn(run)].append(assessment)

        items = []
        for label, assessments in grouped.items():
            count = len(assessments)
            high_risk_runs = sum(1 for assessment in assessments if assessment.risk_level == "high")
            average_risk_score = round(sum(assessment.risk_score for assessment in assessments) / count, 1)
            items.append(
                {
                    "label": label,
                    "count": count,
                    "average_risk_score": average_risk_score,
                    "high_risk_runs": high_risk_runs,
                }
            )

        return sorted(items, key=lambda item: (-item["high_risk_runs"], -item["average_risk_score"], item["label"]))

    def _build_driver_hotspots(self, run_assessments: list[tuple[Run, RiskAssessment]]) -> list[dict[str, Any]]:
        grouped: dict[str, dict[str, float]] = defaultdict(
            lambda: {"occurrences": 0, "driver_value_sum": 0.0, "risk_score_sum": 0.0}
        )

        for _, assessment in run_assessments:
            for driver in assessment.drivers:
                driver_name = str(driver.get("name", "unknown"))
                grouped[driver_name]["occurrences"] += 1
                grouped[driver_name]["driver_value_sum"] += float(driver.get("value", 0))
                grouped[driver_name]["risk_score_sum"] += assessment.risk_score

        hotspots = []
        for driver_name, values in grouped.items():
            occurrences = int(values["occurrences"])
            hotspots.append(
                {
                    "driver_name": driver_name,
                    "occurrences": occurrences,
                    "average_driver_value": round(values["driver_value_sum"] / occurrences, 1),
                    "average_risk_score": round(values["risk_score_sum"] / occurrences, 1),
                }
            )

        return sorted(
            hotspots,
            key=lambda item: (-item["occurrences"], -item["average_risk_score"], item["driver_name"]),
        )[:8]

    def _build_prioritized_actions(self, run_assessments: list[tuple[Run, RiskAssessment]]) -> list[dict[str, Any]]:
        action_counter: Counter[str] = Counter(
            action for _, assessment in run_assessments for action in assessment.recommendations
        )
        return [
            {"action": action, "occurrences": count}
            for action, count in action_counter.most_common(5)
        ]
