export type RunListItem = {
  id: string;
  scenario_id: string;
  equipment_id: string;
  region: string;
  operation_type: string;
  status: string;
  has_attachments: boolean;
  runtime_mode: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
};

export type Artifact = {
  id: string;
  name: string;
  kind: string;
  media_type: string;
  size_bytes: number;
  storage_key: string;
  created_at: string;
};

export type EventItem = {
  id: string;
  agent_name: string | null;
  event_type: string;
  message: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type AgentStep = {
  id: string;
  agent_name: string;
  model_name: string;
  runtime_name: string;
  status: string;
  input_summary: Record<string, unknown>;
  output_summary: Record<string, unknown>;
  error_text: string | null;
  started_at: string;
  completed_at: string | null;
};

export type RiskAssessment = {
  id: string;
  run_id: string;
  risk_score: number;
  risk_level: string;
  drivers: Array<Record<string, unknown>>;
  recommendations: string[];
  explanation: string;
  generated_at: string;
};

export type Report = {
  id: string;
  run_id: string | null;
  report_type: string;
  title: string;
  content: string;
  runs_analyzed: number;
  top_risks: Array<Record<string, unknown>>;
  repeated_failures: string[];
  suggested_actions: string[];
  system_notes: string;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
};

export type PolicyDecision = {
  id: string;
  run_id: string;
  proposal_id: string;
  action_type: string;
  risk_class: string;
  decision: string;
  decision_reason: string;
  execution_mode: string;
  proposal_payload: Record<string, unknown>;
  created_at: string;
};

export type RunDetail = RunListItem & {
  telemetry_payload: Record<string, unknown>;
  scenario_metadata: Record<string, unknown>;
  artifacts: Artifact[];
  events: EventItem[];
  agent_steps: AgentStep[];
  risk_assessments: RiskAssessment[];
  reports: Report[];
  policy_decisions: PolicyDecision[];
};

export type HourlyReportResponse = {
  report: Report | null;
};

export type Health = {
  status: string;
  app_env: string;
  database: string;
  storage: string;
  openclaw_runtime: string;
  openclaw_mode: string;
};

export type BreakdownCount = {
  label: string;
  count: number;
};

export type BreakdownRisk = BreakdownCount & {
  average_risk_score: number | null;
  high_risk_runs: number;
};

export type DriverHotspot = {
  driver_name: string;
  occurrences: number;
  average_driver_value: number;
  average_risk_score: number;
};

export type PrioritizedAction = {
  action: string;
  occurrences: number;
};

export type RecentRiskRun = {
  run_id: string;
  scenario_id: string;
  region: string;
  operation_type: string;
  status: string;
  risk_level: string;
  risk_score: number;
  created_at: string;
};

export type ReportSnapshot = {
  title: string;
  created_at: string;
  runs_analyzed: number;
};

export type PortfolioSummaryStats = {
  total_runs: number;
  completed_runs: number;
  in_progress_runs: number;
  runs_with_attachments: number;
  runs_with_assessment: number;
  high_risk_runs: number;
  average_risk_score: number | null;
};

export type PortfolioSummary = {
  period_hours: number;
  generated_at: string;
  stats: PortfolioSummaryStats;
  status_breakdown: BreakdownCount[];
  risk_level_breakdown: BreakdownCount[];
  region_breakdown: BreakdownRisk[];
  operation_breakdown: BreakdownRisk[];
  top_driver_hotspots: DriverHotspot[];
  prioritized_actions: PrioritizedAction[];
  recent_high_risk_runs: RecentRiskRun[];
  latest_hourly_report: ReportSnapshot | null;
};
