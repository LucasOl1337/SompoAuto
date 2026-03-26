from __future__ import annotations

from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import create_router
from .core.config import get_settings
from .db import Base, engine
from .runtime.openclaw import OpenClawRuntime
from .schemas import HealthRead
from .services.bootstrap import DemoBootstrapService
from .services.storage import ArtifactStorage
from .services.workflow import WorkflowService

@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    runtime = OpenClawRuntime()
    storage = ArtifactStorage()
    workflow = WorkflowService(runtime)
    Base.metadata.create_all(bind=engine)
    storage.ensure_ready()
    if settings.auto_seed_demo_on_empty:
        bootstrap = DemoBootstrapService(workflow, storage)
        await bootstrap.bootstrap_if_empty()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    runtime = OpenClawRuntime()
    storage = ArtifactStorage()
    workflow = WorkflowService(runtime)
    app = FastAPI(title=settings.app_name, lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    runtime_status, runtime_mode = runtime.describe_health()
    app.include_router(
        create_router(
            workflow,
            storage,
            HealthRead(
                status="ok",
                app_env=settings.app_env,
                database="configured",
                storage=storage.backend,
                openclaw_runtime=runtime_status,
                openclaw_mode=runtime_mode,
            ),
        )
    )
    return app


app = create_app()


def main() -> None:
    settings = get_settings()
    uvicorn.run("backend.main:app", host=settings.api_host, port=settings.api_port, reload=False)
