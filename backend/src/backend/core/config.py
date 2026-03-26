from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SOMPO Agentic Prototype"
    app_env: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    )

    database_url: str = "postgresql+psycopg://sompo:sompo@postgres:5432/sompo_proto"
    storage_backend: str = "minio"
    minio_endpoint: str = "minio:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "sompo-artifacts"
    minio_secure: bool = False
    local_storage_path: Path = Path("./.data/artifacts")

    openclaw_runtime_mode: str = "auto"
    openclaw_model_main: str = "gpt-5.4"
    openclaw_model_mini: str = "gpt-5-mini"
    openclaw_command: str = "openclaw"
    openclaw_timeout_seconds: int = 90
    auto_seed_demo_on_empty: bool = True

    poll_interval_seconds: int = 2
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
