from __future__ import annotations

import time
import pytest
from jose import jwt

from app.settings import settings


def _auth_header(sub: str = "user-abc") -> dict[str, str]:
    now = int(time.time())
    token = jwt.encode(
        {"sub": sub, "email": f"{sub}@example.com", "name": "Test", "iat": now, "exp": now + 3600},
        settings.nextauth_secret,
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_and_end_session(client):
    headers = _auth_header()
    started_at = "2026-01-01T09:00:00+00:00"

    # Create
    resp = await client.post(
        "/sessions",
        json={"room_name": "deep-work", "started_at": started_at},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    session_id = data["id"]
    assert data["owner_id"] == "user-abc"

    # End with reflection
    resp2 = await client.patch(
        f"/sessions/{session_id}",
        json={"ended_at": "2026-01-01T09:50:00+00:00", "duration_seconds": 3000, "reflection": "Great focus!"},
        headers=headers,
    )
    assert resp2.status_code == 200
    d2 = resp2.json()
    assert d2["duration_seconds"] == 3000
    assert d2["reflection"] == "Great focus!"


@pytest.mark.asyncio
async def test_list_sessions(client):
    headers = _auth_header(sub="list-user")
    await client.post(
        "/sessions",
        json={"room_name": "morning", "started_at": "2026-01-01T08:00:00+00:00"},
        headers=headers,
    )
    resp = await client.get("/sessions", headers=headers)
    assert resp.status_code == 200
    sessions = resp.json()
    assert len(sessions) >= 1
    assert all(s["owner_id"] == "list-user" for s in sessions)


@pytest.mark.asyncio
async def test_end_session_wrong_user(client):
    headers_a = _auth_header(sub="owner-user")
    headers_b = _auth_header(sub="other-user")

    resp = await client.post(
        "/sessions",
        json={"room_name": "private-room", "started_at": "2026-01-01T10:00:00+00:00"},
        headers=headers_a,
    )
    session_id = resp.json()["id"]

    resp2 = await client.patch(
        f"/sessions/{session_id}",
        json={"ended_at": "2026-01-01T10:50:00+00:00"},
        headers=headers_b,
    )
    assert resp2.status_code == 404
