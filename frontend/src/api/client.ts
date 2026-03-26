import type { Health, HourlyReportResponse, PortfolioSummary, RunDetail, RunListItem } from "../types/api";

function normalizeApiBaseUrl(value: string | undefined): string {
  if (!value || value.trim() === "") {
    return "http://localhost:8000";
  }
  const normalized = value.trim();
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }
  return `https://${normalized}`;
}

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

type ScenarioPayload = {
  scenario_id: string;
  equipment_id: string;
  region: string;
  operation_type: string;
  telemetry_payload: Record<string, unknown>;
  scenario_metadata: Record<string, unknown>;
  timestamp: string;
};

export type RunCreated = {
  run_id: string;
  status: string;
};

async function unwrap<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<T>;
}

export async function fetchHealth(): Promise<Health> {
  return unwrap<Health>(await fetch(`${API_BASE_URL}/health`));
}

export async function fetchRuns(): Promise<RunListItem[]> {
  return unwrap<RunListItem[]>(await fetch(`${API_BASE_URL}/runs`));
}

export async function fetchRunDetail(runId: string): Promise<RunDetail> {
  return unwrap<RunDetail>(await fetch(`${API_BASE_URL}/runs/${runId}`));
}

export async function submitScenario(payload: ScenarioPayload, files: File[]): Promise<RunCreated> {
  const form = new FormData();
  form.append("scenario", JSON.stringify(payload));
  files.forEach((file) => form.append("files", file));
  return unwrap<RunCreated>(
    await fetch(`${API_BASE_URL}/scenarios`, {
      method: "POST",
      body: form,
    }),
  );
}

export async function fetchLatestHourlyReport(): Promise<HourlyReportResponse> {
  return unwrap<HourlyReportResponse>(await fetch(`${API_BASE_URL}/reports/hourly/latest`));
}

export async function generateHourlyReport(): Promise<HourlyReportResponse> {
  return unwrap<HourlyReportResponse>(
    await fetch(`${API_BASE_URL}/reports/hourly/generate`, {
      method: "POST",
    }),
  );
}

export async function fetchPortfolioSummary(hours = 24): Promise<PortfolioSummary> {
  return unwrap<PortfolioSummary>(await fetch(`${API_BASE_URL}/analytics/portfolio?hours=${hours}`));
}
