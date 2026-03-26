# Feature Documentation

## Overview

The portfolio analytics dashboard provides a high-level operational view of recent runs. It is intended to help operators understand concentration of risk without opening each run individually.

## Where to find it

- Frontend tab: `Portfolio Overview`
- Backend endpoint: `GET /analytics/portfolio`

## Frontend behavior

The page automatically refreshes every 5 seconds and supports three windows:

- last 24 hours
- last 72 hours
- last 7 days

The page shows:

- KPI summary cards
- run status and risk mix
- regional hotspot table
- operation hotspot table
- driver hotspot table
- repeated action priorities
- recent high-risk runs
- latest hourly report snapshot

## Backend behavior

The endpoint aggregates runs created inside the requested time window and uses the latest risk assessment for each run.

Current aggregation includes:

- counts by run status
- counts by risk level
- grouped averages by region
- grouped averages by operation type
- frequent risk drivers
- repeated recommended actions
- recent high-risk runs

## Verification commands

### Backend

```bash
cd backend
uv run pytest
```

### Frontend

```bash
cd frontend
npm run lint
npm run build
```

## Extension guidance

If continuing this feature, the safest next additions are:

1. Add UI filters that map to backend query parameters.
2. Add export actions after the summary shape stabilizes.
3. Add browser automation tests that exercise:
   - tab navigation
   - portfolio refresh
   - open run detail from dashboard
   - open hourly reports from dashboard
