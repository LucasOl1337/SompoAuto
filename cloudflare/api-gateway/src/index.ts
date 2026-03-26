export interface Env {
  BACKEND_ORIGIN: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

function normalizeOrigin(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.replace(/\/+$/, "");
  }
  return `https://${trimmed.replace(/\/+$/, "")}`;
}

type RunStatus = "queued" | "running" | "completed" | "partial_failure" | "failed";
type RiskLevel = "low" | "medium" | "high";

type Run = {
  id: string;
  scenario_id: string;
  equipment_id: string;
  region: string;
  operation_type: string;
  status: RunStatus;
  telemetry_payload: Record<string, number>;
  scenario_metadata: Record<string, unknown>;
  has_attachments: boolean;
  runtime_mode: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  risk_assessments: RiskAssessment[];
  reports: Report[];
  artifacts: Artifact[];
  events: EventItem[];
  agent_steps: AgentStep[];
  policy_decisions: PolicyDecision[];
};

type RiskAssessment = {
  id: string;
  run_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  drivers: Array<Record<string, unknown>>;
  recommendations: string[];
  explanation: string;
  generated_at: string;
};

type Report = {
  id: string;
  run_id: string | null;
  report_type: "run" | "hourly";
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

type Artifact = {
  id: string;
  name: string;
  kind: string;
  media_type: string;
  size_bytes: number;
  storage_key: string;
  created_at: string;
};

type EventItem = {
  id: string;
  agent_name: string | null;
  event_type: string;
  message: string;
  payload: Record<string, unknown>;
  created_at: string;
};

type AgentStep = {
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

type PolicyDecision = {
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

type State = {
  runs: Run[];
  latestHourlyReport: Report | null;
};

function getState(): State {
  const key = "__sompo_state__";
  const globalObj = globalThis as unknown as Record<string, unknown>;
  const existing = globalObj[key] as State | undefined;
  if (existing) {
    return existing;
  }
  const seeded = seedState();
  globalObj[key] = seeded;
  return seeded;
}

function seedState(): State {
  const now = Date.now();
  const runs = [
    createDemoRun({
      scenarioId: "sample-low-risk",
      equipmentId: "tractor-14",
      region: "mt-north",
      operationType: "field_operation",
      telemetry: { temperature: 52, vibration: 35, speed: 24, obstacle_density: 20, proximity_water: 18, load_factor: 45 },
      preset: "low",
      hasAttachments: false,
      createdAtMs: now - 120000,
    }),
    createDemoRun({
      scenarioId: "sample-high-risk",
      equipmentId: "harvester-91",
      region: "go-south",
      operationType: "transport",
      telemetry: { temperature: 94, vibration: 78, speed: 53, obstacle_density: 74, proximity_water: 64, load_factor: 88 },
      preset: "high",
      hasAttachments: false,
      createdAtMs: now - 90000,
    }),
    createDemoRun({
      scenarioId: "sample-image-risk",
      equipmentId: "sprayer-22",
      region: "ms-west",
      operationType: "field_operation",
      telemetry: { temperature: 88, vibration: 62, speed: 31, obstacle_density: 66, proximity_water: 59, load_factor: 71 },
      preset: "image",
      hasAttachments: true,
      createdAtMs: now - 60000,
    }),
  ];

  const latestHourlyReport = buildHourlyReport(runs);
  return { runs, latestHourlyReport };
}

function createDemoRun(input: {
  scenarioId: string;
  equipmentId: string;
  region: string;
  operationType: string;
  telemetry: Record<string, number>;
  preset: string;
  hasAttachments: boolean;
  createdAtMs: number;
}): Run {
  const runId = crypto.randomUUID();
  const createdAt = new Date(input.createdAtMs).toISOString();
  const assessment = calculateRisk(runId, input.telemetry, input.hasAttachments);
  const runReport: Report = {
    id: crypto.randomUUID(),
    run_id: runId,
    report_type: "run",
    title: `Run report for ${input.scenarioId}`,
    content: assessment.explanation,
    runs_analyzed: 1,
    top_risks: [{ risk_level: assessment.risk_level, risk_score: assessment.risk_score }],
    repeated_failures: assessment.drivers.map((d) => String(d.name)).slice(0, 2),
    suggested_actions: assessment.recommendations,
    system_notes: "Run report generated from Worker fallback.",
    period_start: null,
    period_end: null,
    created_at: createdAt,
  };

  const artifactList: Artifact[] = input.hasAttachments
    ? [
        {
          id: crypto.randomUUID(),
          name: "inspection.svg",
          kind: "attachment",
          media_type: "image/svg+xml",
          size_bytes: 688,
          storage_key: `${runId}/inspection.svg`,
          created_at: createdAt,
        },
      ]
    : [];

  const steps: AgentStep[] = [
    step(runId, "Supervisor Agent", { scenario_id: input.scenarioId }),
    step(runId, "Ingestion Agent", { telemetry_keys: Object.keys(input.telemetry) }),
    step(runId, "Risk Agent", { risk_score: assessment.risk_score, risk_level: assessment.risk_level }),
    ...(input.hasAttachments ? [step(runId, "Vision Agent", { detections: ["possible_obstacle_exposure"] })] : []),
    step(runId, "Auto-Implementation Agent", { action: "review_required" }),
    step(runId, "Report Agent", { report_type: "run" }),
    step(runId, "Audit Agent", { status: "traceable" }),
  ];

  const policy: PolicyDecision = {
    id: crypto.randomUUID(),
    run_id: runId,
    proposal_id: `proposal-${crypto.randomUUID()}`,
    action_type: "adjust_thresholds",
    risk_class: assessment.risk_level,
    decision: "review_required",
    decision_reason: "Prototype only; action remains simulated for governance validation.",
    execution_mode: "simulated",
    proposal_payload: { risk_score: assessment.risk_score },
    created_at: createdAt,
  };

  const run: Run = {
    id: runId,
    scenario_id: input.scenarioId,
    equipment_id: input.equipmentId,
    region: input.region,
    operation_type: input.operationType,
    status: "completed",
    telemetry_payload: input.telemetry,
    scenario_metadata: {
      preset: input.preset,
      demo_seed: { source: "worker_fallback", version: "v1", seed_key: input.preset },
    },
    has_attachments: input.hasAttachments,
    runtime_mode: "mock",
    created_at: createdAt,
    updated_at: createdAt,
    started_at: createdAt,
    completed_at: createdAt,
    risk_assessments: [assessment],
    reports: [runReport],
    artifacts: artifactList,
    events: [
      event(runId, "Ingestion Agent", "scenario_received", "Scenario received and queued for execution.", createdAt),
      event(runId, null, "run_started", "Run execution started.", createdAt),
      event(runId, null, "run_completed", "Run execution completed.", createdAt),
    ],
    agent_steps: steps,
    policy_decisions: [policy],
  };
  return run;
}

function step(runId: string, agentName: string, output: Record<string, unknown>): AgentStep {
  const t = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    agent_name: agentName,
    model_name: "gpt-5.4",
    runtime_name: "mock",
    status: "completed",
    input_summary: { run_id: runId },
    output_summary: output,
    error_text: null,
    started_at: t,
    completed_at: t,
  };
}

function event(
  runId: string,
  agentName: string | null,
  eventType: string,
  message: string,
  createdAt: string,
): EventItem {
  return {
    id: crypto.randomUUID(),
    run_id: runId,
    agent_name: agentName,
    event_type: eventType,
    message,
    payload: {},
    created_at: createdAt,
  } as EventItem;
}

function calculateRisk(runId: string, telemetry: Record<string, number>, hasAttachments: boolean): RiskAssessment {
  const weights: Array<[string, number, number]> = [
    ["temperature", 85, 18],
    ["vibration", 65, 22],
    ["speed", 45, 12],
    ["obstacle_density", 60, 16],
    ["proximity_water", 50, 15],
    ["load_factor", 80, 10],
  ];
  let score = 15;
  const drivers: Array<Record<string, unknown>> = [];
  for (const [name, limit, weight] of weights) {
    const value = Number(telemetry[name] ?? 0);
    if (value >= limit) {
      score += weight;
      drivers.push({ name, value, weight });
    }
  }
  if (hasAttachments) {
    score += 5;
    drivers.push({ name: "visual_context_present", value: 1, weight: 5 });
  }
  score = Math.min(100, score);
  const level: RiskLevel = score >= 75 ? "high" : score >= 45 ? "medium" : "low";
  const recommendations = buildRecommendations(level, drivers);
  return {
    id: crypto.randomUUID(),
    run_id: runId,
    risk_score: score,
    risk_level: level,
    drivers,
    recommendations,
    explanation: `Risk score ${score} classified as ${level}. Drivers: ${drivers.map((d) => String(d.name)).join(", ") || "none"}.`,
    generated_at: new Date().toISOString(),
  };
}

function buildRecommendations(level: RiskLevel, drivers: Array<Record<string, unknown>>): string[] {
  const mapping: Record<string, string> = {
    temperature: "Inspect cooling conditions before continuing the operation.",
    vibration: "Schedule preventive maintenance and reduce operation intensity.",
    speed: "Reduce movement speed in critical operating windows.",
    obstacle_density: "Review route and obstacle avoidance policy for the operator.",
    proximity_water: "Avoid operation near water or soften access controls.",
    load_factor: "Redistribute load before the next cycle.",
    visual_context_present: "Review attached visual evidence for operator briefing.",
  };
  const items = drivers.map((driver) => mapping[String(driver.name)]).filter(Boolean);
  if (items.length === 0) {
    items.push("Keep monitoring the current operation; no immediate corrective action required.");
  }
  if (level === "high") {
    items.push("Escalate to technical review before the next critical cycle.");
  }
  return items.slice(0, 4);
}

function buildHourlyReport(runs: Run[]): Report {
  const now = new Date();
  const high = runs
    .map((run) => ({ run, risk: run.risk_assessments[0] }))
    .filter((x) => x.risk.risk_level === "high")
    .slice(0, 5);
  return {
    id: crypto.randomUUID(),
    run_id: null,
    report_type: "hourly",
    title: "Latest hourly operations report",
    content: "Hourly report consolidated the available runs and highlighted the dominant operational risks.",
    runs_analyzed: runs.length,
    top_risks: high.map((x) => ({
      run_id: x.run.id,
      scenario_id: x.run.scenario_id,
      risk_level: x.risk.risk_level,
      risk_score: x.risk.risk_score,
    })),
    repeated_failures: high.flatMap((x) => x.risk.drivers.map((d) => String(d.name))).slice(0, 5),
    suggested_actions: high.flatMap((x) => x.risk.recommendations).slice(0, 5),
    system_notes: "Hourly report generated from Worker fallback.",
    period_start: new Date(now.getTime() - 3600_000).toISOString(),
    period_end: now.toISOString(),
    created_at: now.toISOString(),
  };
}

function runListItem(run: Run) {
  return {
    id: run.id,
    scenario_id: run.scenario_id,
    equipment_id: run.equipment_id,
    region: run.region,
    operation_type: run.operation_type,
    status: run.status,
    has_attachments: run.has_attachments,
    runtime_mode: run.runtime_mode,
    created_at: run.created_at,
    updated_at: run.updated_at,
    started_at: run.started_at,
    completed_at: run.completed_at,
  };
}

function runDetail(run: Run) {
  return {
    ...runListItem(run),
    telemetry_payload: run.telemetry_payload,
    scenario_metadata: run.scenario_metadata,
    artifacts: run.artifacts,
    events: run.events,
    agent_steps: run.agent_steps,
    risk_assessments: run.risk_assessments,
    reports: run.reports,
    policy_decisions: run.policy_decisions,
  };
}

function portfolioSummary(runs: Run[], latestHourly: Report | null, hours: number) {
  const assessed = runs.filter((r) => r.risk_assessments.length > 0);
  const avg = assessed.length
    ? Number((assessed.reduce((sum, r) => sum + r.risk_assessments[0].risk_score, 0) / assessed.length).toFixed(1))
    : null;
  const high = assessed.filter((r) => r.risk_assessments[0].risk_level === "high");
  const breakdown = (items: string[]) =>
    Object.entries(items.reduce<Record<string, number>>((acc, value) => {
      acc[value] = (acc[value] ?? 0) + 1;
      return acc;
    }, {})).map(([label, count]) => ({ label, count }));

  const now = new Date().toISOString();
  return {
    period_hours: hours,
    generated_at: now,
    stats: {
      total_runs: runs.length,
      completed_runs: runs.filter((r) => r.status === "completed").length,
      in_progress_runs: runs.filter((r) => r.status === "queued" || r.status === "running").length,
      runs_with_attachments: runs.filter((r) => r.has_attachments).length,
      runs_with_assessment: assessed.length,
      high_risk_runs: high.length,
      average_risk_score: avg,
    },
    status_breakdown: breakdown(runs.map((r) => r.status)),
    risk_level_breakdown: breakdown(assessed.map((r) => r.risk_assessments[0].risk_level)),
    region_breakdown: breakdown(runs.map((r) => r.region)).map((b) => ({
      ...b,
      average_risk_score: avg,
      high_risk_runs: high.filter((r) => r.region === b.label).length,
    })),
    operation_breakdown: breakdown(runs.map((r) => r.operation_type)).map((b) => ({
      ...b,
      average_risk_score: avg,
      high_risk_runs: high.filter((r) => r.operation_type === b.label).length,
    })),
    top_driver_hotspots: [],
    prioritized_actions: [],
    recent_high_risk_runs: high.slice(0, 5).map((run) => ({
      run_id: run.id,
      scenario_id: run.scenario_id,
      region: run.region,
      operation_type: run.operation_type,
      status: run.status,
      risk_level: run.risk_assessments[0].risk_level,
      risk_score: run.risk_assessments[0].risk_score,
      created_at: run.created_at,
    })),
    latest_hourly_report: latestHourly
      ? {
          title: latestHourly.title,
          created_at: latestHourly.created_at,
          runs_analyzed: latestHourly.runs_analyzed,
        }
      : null,
  };
}

function jsonResponse(data: unknown, status = 200): Response {
  return withCors(
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

async function handleLocalApi(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const state = getState();

  if (url.pathname === "/health" && request.method === "GET") {
    return jsonResponse({
      status: "ok",
      app_env: "production",
      database: "worker-memory",
      storage: "worker-memory",
      openclaw_runtime: "mock",
      openclaw_mode: "mock",
    });
  }

  if (url.pathname === "/runs" && request.method === "GET") {
    return jsonResponse(state.runs.map(runListItem).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)));
  }

  if (url.pathname.startsWith("/runs/") && request.method === "GET") {
    const runId = url.pathname.split("/")[2];
    const run = state.runs.find((item) => item.id === runId);
    if (!run) {
      return jsonResponse({ detail: "Run not found" }, 404);
    }
    return jsonResponse(runDetail(run));
  }

  if (url.pathname === "/reports/hourly/latest" && request.method === "GET") {
    return jsonResponse({ report: state.latestHourlyReport });
  }

  if (url.pathname === "/reports/hourly/generate" && request.method === "POST") {
    state.latestHourlyReport = buildHourlyReport(state.runs);
    return jsonResponse({ report: state.latestHourlyReport });
  }

  if (url.pathname === "/analytics/portfolio" && request.method === "GET") {
    const hours = Number(url.searchParams.get("hours") ?? "24");
    return jsonResponse(portfolioSummary(state.runs, state.latestHourlyReport, Number.isFinite(hours) ? hours : 24));
  }

  if (url.pathname === "/scenarios" && request.method === "POST") {
    const formData = await request.formData();
    const scenarioRaw = String(formData.get("scenario") ?? "{}");
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(scenarioRaw) as Record<string, unknown>;
    } catch {
      return jsonResponse({ detail: "Invalid scenario payload" }, 422);
    }
    const telemetry = (parsed.telemetry_payload as Record<string, number> | undefined) ?? {};
    const hasAttachments = Array.from(formData.keys()).includes("files");
    const newRun = createDemoRun({
      scenarioId: String(parsed.scenario_id ?? `custom-${crypto.randomUUID().slice(0, 8)}`),
      equipmentId: String(parsed.equipment_id ?? "unknown-equipment"),
      region: String(parsed.region ?? "unknown-region"),
      operationType: String(parsed.operation_type ?? "field_operation"),
      telemetry,
      preset: "default",
      hasAttachments,
      createdAtMs: Date.now(),
    });
    state.runs.unshift(newRun);
    state.latestHourlyReport = buildHourlyReport(state.runs);
    return jsonResponse({ run_id: newRun.id, status: "queued" });
  }

  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const backendOrigin = normalizeOrigin(env.BACKEND_ORIGIN);
    const shouldUseLocalApi = !backendOrigin || backendOrigin.includes("localhost");
    if (shouldUseLocalApi) {
      const local = await handleLocalApi(request);
      if (local) {
        return local;
      }
      return jsonResponse({ detail: "Not found" }, 404);
    }

    const incomingUrl = new URL(request.url);
    const upstreamUrl = `${backendOrigin}${incomingUrl.pathname}${incomingUrl.search}`;

    const upstreamHeaders = new Headers(request.headers);
    upstreamHeaders.delete("host");
    upstreamHeaders.delete("cf-connecting-ip");
    upstreamHeaders.delete("x-forwarded-for");
    upstreamHeaders.delete("x-real-ip");

    try {
      const upstreamResponse = await fetch(upstreamUrl, {
        method: request.method,
        headers: upstreamHeaders,
        body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
        redirect: "follow",
      });
      return withCors(upstreamResponse);
    } catch {
      const local = await handleLocalApi(request);
      if (local) {
        return local;
      }
      return jsonResponse({ detail: "Upstream unavailable" }, 502);
    }
  },
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
