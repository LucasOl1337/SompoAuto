from __future__ import annotations

from dataclasses import dataclass

from minio import Minio
from minio.error import S3Error

from ..core.config import get_settings


@dataclass
class StoredArtifact:
    storage_key: str
    size_bytes: int


class ArtifactStorage:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.backend = self.settings.storage_backend
        self._client: Minio | None = None
        if self.backend == "minio":
            self._client = Minio(
                self.settings.minio_endpoint,
                access_key=self.settings.minio_access_key,
                secret_key=self.settings.minio_secret_key,
                secure=self.settings.minio_secure,
            )
        else:
            self.settings.local_storage_path.mkdir(parents=True, exist_ok=True)

    def ensure_ready(self) -> str:
        if self.backend == "minio":
            assert self._client is not None
            found = self._client.bucket_exists(self.settings.minio_bucket)
            if not found:
                self._client.make_bucket(self.settings.minio_bucket)
            return "ok"
        self.settings.local_storage_path.mkdir(parents=True, exist_ok=True)
        return "ok"

    def save_bytes(self, key: str, content: bytes, content_type: str) -> StoredArtifact:
        if self.backend == "minio":
            assert self._client is not None
            self._client.put_object(
                self.settings.minio_bucket,
                key,
                data=BytesReader(content),
                length=len(content),
                content_type=content_type,
            )
            return StoredArtifact(storage_key=key, size_bytes=len(content))

        path = self.settings.local_storage_path / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return StoredArtifact(storage_key=key, size_bytes=len(content))

    def healthcheck(self) -> str:
        try:
            return self.ensure_ready()
        except S3Error:
            return "error"


class BytesReader:
    def __init__(self, payload: bytes) -> None:
        self.payload = payload
        self.offset = 0

    def read(self, size: int = -1) -> bytes:
        if size < 0:
            size = len(self.payload) - self.offset
        chunk = self.payload[self.offset : self.offset + size]
        self.offset += len(chunk)
        return chunk
