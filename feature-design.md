# Feature Design

## Feature goal

Give operators a portfolio-level view of recent execution risk so they can:

- understand current workload and risk concentration
- identify regional and operational hotspots
- prioritize recurring corrective actions
- jump quickly into the most urgent runs

## Scope chosen

### Backend

- New analytics service to aggregate recent runs over a configurable time window.
- New API response models for dashboard consumption.
- New endpoint:
  - `GET /analytics/portfolio`
  - query param: `hours`
  - allowed range: 1 to 168

### Frontend

- New `Portfolio Overview` tab
- Automatic polling every 5 seconds
- Time-window switcher:
  - 24h
  - 72h
  - 7d

## API shape

The portfolio summary returns:

- `period_hours`
- `generated_at`
- `stats`
  - total runs
  - completed runs
  - in-progress runs
  - runs with attachments
  - runs with assessments
  - high-risk runs
  - average risk score
- `status_breakdown`
- `risk_level_breakdown`
- `region_breakdown`
- `operation_breakdown`
- `top_driver_hotspots`
- `prioritized_actions`
- `recent_high_risk_runs`
- `latest_hourly_report`

## UI composition

### Summary row

- Runs monitored
- Average risk score
- High-risk runs
- Attachments detected

### Diagnostic sections

- Status mix
- Hourly report coverage
- Regional hotspots
- Operational hotspots
- Driver hotspots
- Priority actions
- Recent high-risk runs

## Key design decisions

- No database migration was added because the source data already existed.
- The feature is read-only and observational.
- The dashboard surfaces recent high-risk runs and deep-links into `Run Detail`.
- The dashboard also links operators into `Hourly Reports`.

## Testing strategy

- Backend:
  - create deterministic low-risk and high-risk runs
  - generate an hourly report
  - validate aggregate summary values and hotspot output
- Frontend:
  - TypeScript compile via `npm run build`
  - lint via `npm run lint`

## Deferred items

- Chart visualizations
- CSV export
- richer filters
- browser-based integration testing
- auth-aware scoping
