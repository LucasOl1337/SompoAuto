from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ScenarioCreate(BaseModel):
    scenario_id: str
    equipment_id: str
    region: str
    operation_type: str
    telemetry_payload: dict[str, Any] = Field(default_factory=dict)
    scenario_metadata: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime


class ArtifactRead(BaseModel):
    id: str
    name: str
    kind: str
    media_type: str
    size_bytes: int
    storage_key: str
    created_at: datetime


class EventRead(BaseModel):
    id: str
    agent_name: str | None
    event_type: str
    message: str
    payload: dict[str, Any]
    created_at: datetime


class AgentStepRead(BaseModel):
    id: str
    agent_name: str
    model_name: str
    runtime_name: str
    status: str
    input_summary: dict[str, Any]
    output_summary: dict[str, Any]
    error_text: str | None
    started_at: datetime
    completed_at: datetime | None


class RiskAssessmentRead(BaseModel):
    id: str
    run_id: str
    risk_score: float
    risk_level: str
    drivers: list[dict[str, Any]]
    recommendations: list[str]
    explanation: str
    generated_at: datetime


class ReportRead(BaseModel):
    id: str
    run_id: str | None
    report_type: str
    title: str
    content: str
    runs_analyzed: int
    top_risks: list[dict[str, Any]]
    repeated_failures: list[str]
    suggested_actions: list[str]
    system_notes: str
    period_start: datetime | None
    period_end: datetime | None
    created_at: datetime


class PolicyDecisionRead(BaseModel):
    id: str
    run_id: str
    proposal_id: str
    action_type: str
    risk_class: str
    decision: str
    decision_reason: str
    execution_mode: str
    proposal_payload: dict[str, Any]
    created_at: datetime


class RunListItem(BaseModel):
    id: str
    scenario_id: str
    equipment_id: str
    region: str
    operation_type: str
    status: str
    has_attachments: bool
    runtime_mode: str
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None
    completed_at: datetime | None


class RunDetail(RunListItem):
    telemetry_payload: dict[str, Any]
    scenario_metadata: dict[str, Any]
    artifacts: list[ArtifactRead]
    events: list[EventRead]
    agent_steps: list[AgentStepRead]
    risk_assessments: list[RiskAssessmentRead]
    reports: list[ReportRead]
    policy_decisions: list[PolicyDecisionRead]


class HealthRead(BaseModel):
    status: str
    app_env: str
    database: str
    storage: str
    openclaw_runtime: str
    openclaw_mode: str


class HourlyReportRead(BaseModel):
    report: ReportRead | None


class RunCreated(BaseModel):
    run_id: str
    status: str


class BreakdownCountRead(BaseModel):
    label: str
    count: int


class BreakdownRiskRead(BreakdownCountRead):
    average_risk_score: float | None
    high_risk_runs: int


class DriverHotspotRead(BaseModel):
    driver_name: str
    occurrences: int
    average_driver_value: float
    average_risk_score: float


class PrioritizedActionRead(BaseModel):
    action: str
    occurrences: int


class RecentRiskRunRead(BaseModel):
    run_id: str
    scenario_id: str
    region: str
    operation_type: str
    status: str
    risk_level: str
    risk_score: float
    created_at: datetime


class ReportSnapshotRead(BaseModel):
    title: str
    created_at: datetime
    runs_analyzed: int


class PortfolioSummaryStatsRead(BaseModel):
    total_runs: int
    completed_runs: int
    in_progress_runs: int
    runs_with_attachments: int
    runs_with_assessment: int
    high_risk_runs: int
    average_risk_score: float | None


class PortfolioSummaryRead(BaseModel):
    period_hours: int
    generated_at: datetime
    stats: PortfolioSummaryStatsRead
    status_breakdown: list[BreakdownCountRead]
    risk_level_breakdown: list[BreakdownCountRead]
    region_breakdown: list[BreakdownRiskRead]
    operation_breakdown: list[BreakdownRiskRead]
    top_driver_hotspots: list[DriverHotspotRead]
    prioritized_actions: list[PrioritizedActionRead]
    recent_high_risk_runs: list[RecentRiskRunRead]
    latest_hourly_report: ReportSnapshotRead | None
