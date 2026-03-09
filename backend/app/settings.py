from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    env: str = "local"
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/genzen"
    redis_url: str = "redis://localhost:6379/0"

    allow_guests: bool = True

    nextauth_secret: str | None = None
    nextauth_jwks_url: str | None = None
    nextauth_issuer: str | None = None
    nextauth_audience: str | None = None

    livekit_url: str | None = None
    livekit_api_key: str | None = None
    livekit_api_secret: str | None = None


settings = Settings()
