from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    # DB is always available in tests (SQLite); Redis may not be running
    # locally (CLAUDE.md: "Tests use SQLite — no Postgres/Redis needed"),
    # so only the DB check is asserted strictly here.
    assert data["db"] == "ok"
    assert data["status"] in ("ok", "degraded")
