import json
import time

from backend.core.config import get_settings


def create_payload(scenario_id: str, with_image: bool = False) -> tuple[dict, dict]:
    payload = {
        "scenario": json.dumps(
            {
                "scenario_id": scenario_id,
                "equipment_id": "tractor-77",
                "region": "mt-north",
                "operation_type": "field_operation",
                "telemetry_payload": {
                    "temperature": 92 if "high" in scenario_id else 52,
                    "vibration": 71 if "high" in scenario_id else 35,
                    "speed": 49 if "high" in scenario_id else 22,
                    "obstacle_density": 74 if "high" in scenario_id else 25,
                    "proximity_water": 58 if with_image else 18,
                    "load_factor": 84 if "high" in scenario_id else 45,
                },
                "scenario_metadata": {"source": "pytest"},
                "timestamp": "2026-03-24T09:00:00Z",
            }
        )
    }
    files = {}
    if with_image:
        files = {"files": ("inspection.svg", b"<svg xmlns='http://www.w3.org/2000/svg'></svg>", "image/svg+xml")}
    return payload, files


def wait_for_completion(client, run_id: str) -> dict:
    for _ in range(60):
        response = client.get(f"/runs/{run_id}")
        data = response.json()
        if data["status"] in {"completed", "partial_failure", "failed"}:
            return data
        time.sleep(0.05)
    raise AssertionError("Run did not complete in time")


def create_seeded_client(monkeypatch):
    from fastapi.testclient import TestClient

    from conftest import reload_backend_modules

    monkeypatch.setenv("AUTO_SEED_DEMO_ON_EMPTY", "true")
    get_settings.cache_clear()
    reload_backend_modules()
    from backend.main import create_app
    return TestClient(create_app())


def test_run_without_attachment_generates_risk_and_report(client) -> None:
    payload, files = create_payload("low-risk")
    response = client.post("/scenarios", data=payload, files=files)
    assert response.status_code == 200
    run_id = response.json()["run_id"]
    run = wait_for_completion(client, run_id)
    assert run["status"] == "completed"
    assert len(run["risk_assessments"]) >= 1
    assert len(run["reports"]) >= 1
    assert len(run["events"]) >= 1
    assert len(run["artifacts"]) == 0


def test_run_with_attachment_triggers_vision_stub(client) -> None:
    payload, files = create_payload("high-risk", with_image=True)
    response = client.post("/scenarios", data=payload, files=files)
    assert response.status_code == 200
    run = wait_for_completion(client, response.json()["run_id"])
    step_names = [step["agent_name"] for step in run["agent_steps"]]
    assert "Vision Agent" in step_names
    assert run["artifacts"][0]["media_type"] == "image/svg+xml"
    assert run["policy_decisions"][0]["execution_mode"] == "simulated"


def test_manual_hourly_report_aggregates_runs(client) -> None:
    payload, files = create_payload("high-risk-2")
    client.post("/scenarios", data=payload, files=files)
    report_response = client.post("/reports/hourly/generate")
    assert report_response.status_code == 200
    latest = client.get("/reports/hourly/latest")
    assert latest.status_code == 200
    assert latest.json()["report"]["report_type"] == "hourly"


def test_portfolio_summary_aggregates_current_runs(client) -> None:
    low_payload, low_files = create_payload("low-risk")
    low_response = client.post("/scenarios", data=low_payload, files=low_files)
    assert low_response.status_code == 200
    wait_for_completion(client, low_response.json()["run_id"])

    high_payload, high_files = create_payload("high-risk", with_image=True)
    high_response = client.post("/scenarios", data=high_payload, files=high_files)
    assert high_response.status_code == 200
    high_run = wait_for_completion(client, high_response.json()["run_id"])
    assert high_run["risk_assessments"][0]["risk_level"] == "high"

    client.post("/reports/hourly/generate")

    summary_response = client.get("/analytics/portfolio?hours=24")
    assert summary_response.status_code == 200
    summary = summary_response.json()

    assert summary["period_hours"] == 24
    assert summary["stats"]["total_runs"] == 2
    assert summary["stats"]["completed_runs"] == 2
    assert summary["stats"]["runs_with_attachments"] == 1
    assert summary["stats"]["runs_with_assessment"] == 2
    assert summary["stats"]["high_risk_runs"] == 1
    assert summary["latest_hourly_report"]["runs_analyzed"] == 2

    risk_levels = {item["label"]: item["count"] for item in summary["risk_level_breakdown"]}
    assert risk_levels == {"high": 1, "low": 1}

    hotspots = {item["driver_name"]: item["occurrences"] for item in summary["top_driver_hotspots"]}
    assert hotspots["visual_context_present"] == 1
    assert "temperature" in hotspots

    recent_high_risk = summary["recent_high_risk_runs"][0]
    assert recent_high_risk["scenario_id"] == "high-risk"
    assert recent_high_risk["risk_level"] == "high"


def test_startup_bootstraps_demo_portfolio_once(monkeypatch) -> None:
    with create_seeded_client(monkeypatch) as client:
        runs = client.get("/runs")
        assert runs.status_code == 200
        payload = runs.json()
        assert len(payload) == 3
        assert {run["scenario_id"] for run in payload} == {
            "sample-low-risk",
            "sample-high-risk",
            "sample-image-risk",
        }

        latest = client.get("/reports/hourly/latest")
        assert latest.status_code == 200
        assert latest.json()["report"]["runs_analyzed"] == 3

    get_settings.cache_clear()
    monkeypatch.setenv("AUTO_SEED_DEMO_ON_EMPTY", "true")
    with create_seeded_client(monkeypatch) as client:
        runs = client.get("/runs")
        assert runs.status_code == 200
        assert len(runs.json()) == 3

    get_settings.cache_clear()


def test_bootstrap_image_seed_creates_artifact_and_vision_step(monkeypatch) -> None:
    with create_seeded_client(monkeypatch) as client:
        runs = client.get("/runs")
        image_run = next(run for run in runs.json() if run["scenario_id"] == "sample-image-risk")
        detail = client.get(f"/runs/{image_run['id']}")
        assert detail.status_code == 200
        data = detail.json()

        assert data["scenario_metadata"]["demo_seed"]["seed_key"] == "image-risk"
        assert data["artifacts"][0]["media_type"] == "image/svg+xml"
        assert "Vision Agent" in [step["agent_name"] for step in data["agent_steps"]]

    get_settings.cache_clear()


def test_startup_respects_disabled_demo_seed(monkeypatch) -> None:
    from fastapi.testclient import TestClient

    from conftest import reload_backend_modules

    monkeypatch.setenv("AUTO_SEED_DEMO_ON_EMPTY", "false")
    get_settings.cache_clear()
    reload_backend_modules()
    from backend.main import create_app

    with TestClient(create_app()) as client:
        runs = client.get("/runs")
        assert runs.status_code == 200
        assert runs.json() == []

        latest = client.get("/reports/hourly/latest")
        assert latest.status_code == 200
        assert latest.json()["report"] is None

    get_settings.cache_clear()
