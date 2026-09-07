from __future__ import annotations

import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Use SQLite for tests so no Postgres is needed
TEST_DB = "sqlite+aiosqlite:///./test.db"
os.environ.setdefault("DATABASE_URL", TEST_DB)
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/1")
os.environ.setdefault("NEXTAUTH_SECRET", "test-secret-for-tests-only")
os.environ.setdefault("ALLOW_GUESTS", "1")
os.environ.setdefault("ENV", "local")

from app.db import Base
from app.asgi import app as asgi_app
from app.main import create_fastapi_app


@pytest_asyncio.fixture(scope="session")
async def engine():
    eng = create_async_engine(TEST_DB, echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest_asyncio.fixture()
async def client(engine):
    fastapi_app = create_fastapi_app()
    async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as c:
        yield c
