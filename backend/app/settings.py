from __future__ import annotations

from pydantic import model_validator
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

    @model_validator(mode="after")
    def _validate_production(self) -> "Settings":
        if self.env == "production":
            if self.allow_guests:
                raise ValueError("ALLOW_GUESTS must be 0/false in production")
            if not self.nextauth_secret and not self.nextauth_jwks_url:
                raise ValueError("Either NEXTAUTH_SECRET or NEXTAUTH_JWKS_URL must be set in production")
            if not self.livekit_url or not self.livekit_api_key or not self.livekit_api_secret:
                raise ValueError("LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET must be set in production")
        return self


settings = Settings()
