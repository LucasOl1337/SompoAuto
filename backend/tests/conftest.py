import os
import shutil
import sys
from importlib import reload
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


def reload_backend_modules() -> None:
    for module_name in [
        "backend.db",
        "backend.models",
        "backend.services.analytics",
        "backend.services.workflow",
        "backend.services.bootstrap",
        "backend.api.routes",
        "backend.main",
    ]:
        if module_name in sys.modules:
            reload(sys.modules[module_name])


@pytest.fixture(scope="session", autouse=True)
def test_env() -> Generator[None, None, None]:
    os.environ["DATABASE_URL"] = "sqlite:///./test.db"
    os.environ["STORAGE_BACKEND"] = "local"
    os.environ["LOCAL_STORAGE_PATH"] = "./.test-artifacts"
    os.environ["OPENCLAW_RUNTIME_MODE"] = "mock"
    os.environ["AUTO_SEED_DEMO_ON_EMPTY"] = "false"
    from backend.core.config import get_settings

    get_settings.cache_clear()
    yield


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    from backend.core.config import get_settings

    get_settings.cache_clear()
    reload_backend_modules()
    from backend.main import create_app

    with TestClient(create_app()) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def reset_state() -> Generator[None, None, None]:
    from backend.core.config import get_settings

    get_settings.cache_clear()
    reload_backend_modules()
    from backend.db import Base, engine
    import backend.models  # noqa: F401

    storage_path = Path(".test-artifacts")
    if storage_path.exists():
        shutil.rmtree(storage_path)
    storage_path.mkdir(parents=True, exist_ok=True)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
