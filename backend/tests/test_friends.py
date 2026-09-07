from __future__ import annotations

import time

import pytest
from jose import jwt

from app.settings import settings


def _auth_header(sub: str) -> dict[str, str]:
    now = int(time.time())
    token = jwt.encode(
        {"sub": sub, "email": f"{sub}@example.com", "name": sub, "iat": now, "exp": now + 3600},
        settings.nextauth_secret,
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


async def _ensure_user(client, sub: str) -> None:
    resp = await client.get("/me", headers=_auth_header(sub))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_request_then_accept_flow(client):
    await _ensure_user(client, "alice")
    await _ensure_user(client, "bob")

    resp = await client.post("/friends/request", json={"user_id": "bob"}, headers=_auth_header("alice"))
    assert resp.status_code == 200
    assert resp.json()["status"] == "pending"

    pending = await client.get("/friends/pending", headers=_auth_header("bob"))
    assert pending.status_code == 200
    ids = [p["user_id"] for p in pending.json()["pending"]]
    assert "alice" in ids

    accept = await client.post("/friends/accept", json={"user_id": "alice"}, headers=_auth_header("bob"))
    assert accept.status_code == 200
    assert accept.json()["status"] == "accepted"

    friends_alice = await client.get("/friends", headers=_auth_header("alice"))
    friends_bob = await client.get("/friends", headers=_auth_header("bob"))
    assert any(f["id"] == "bob" for f in friends_alice.json()["friends"])
    assert any(f["id"] == "alice" for f in friends_bob.json()["friends"])


@pytest.mark.asyncio
async def test_mutual_request_auto_accepts(client):
    await _ensure_user(client, "carol")
    await _ensure_user(client, "dave")

    resp1 = await client.post("/friends/request", json={"user_id": "dave"}, headers=_auth_header("carol"))
    assert resp1.json()["status"] == "pending"

    resp2 = await client.post("/friends/request", json={"user_id": "carol"}, headers=_auth_header("dave"))
    assert resp2.json()["status"] == "accepted"


@pytest.mark.asyncio
async def test_cannot_friend_self(client):
    await _ensure_user(client, "erin")
    resp = await client.post("/friends/request", json={"user_id": "erin"}, headers=_auth_header("erin"))
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_request_unknown_user_404(client):
    await _ensure_user(client, "frank")
    resp = await client.post("/friends/request", json={"user_id": "does-not-exist"}, headers=_auth_header("frank"))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_accept_without_pending_request_404(client):
    await _ensure_user(client, "gina")
    await _ensure_user(client, "harold")
    resp = await client.post("/friends/accept", json={"user_id": "harold"}, headers=_auth_header("gina"))
    assert resp.status_code == 404
