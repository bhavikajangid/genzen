from __future__ import annotations

import time

import pytest
from jose import jwt

from app.settings import settings


def _auth_header(sub: str = "room-user") -> dict[str, str]:
    now = int(time.time())
    token = jwt.encode(
        {"sub": sub, "email": f"{sub}@example.com", "name": "Test", "iat": now, "exp": now + 3600},
        settings.nextauth_secret,
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_mint_token_requires_livekit_config(client, monkeypatch):
    monkeypatch.setattr(settings, "livekit_api_key", None)
    monkeypatch.setattr(settings, "livekit_api_secret", None)
    monkeypatch.setattr(settings, "livekit_url", None)

    resp = await client.post(
        "/rooms/token",
        json={"room_name": "deep-work"},
        headers=_auth_header(),
    )
    assert resp.status_code == 500


@pytest.mark.asyncio
async def test_mint_token_success(client, monkeypatch):
    monkeypatch.setattr(settings, "livekit_api_key", "test-key")
    monkeypatch.setattr(settings, "livekit_api_secret", "test-secret")
    monkeypatch.setattr(settings, "livekit_url", "wss://example.livekit.cloud")

    resp = await client.post(
        "/rooms/token",
        json={"room_name": "deep-work"},
        headers=_auth_header(sub="room-user-2"),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["url"] == "wss://example.livekit.cloud"

    claims = jwt.decode(data["token"], "test-secret", algorithms=["HS256"], options={"verify_aud": False})
    assert claims["sub"] == "room-user-2"
    assert claims["video"]["room"] == "deep-work"
    assert claims["video"]["roomJoin"] is True


@pytest.mark.asyncio
async def test_mint_token_requires_auth(client, monkeypatch):
    monkeypatch.setattr(settings, "livekit_api_key", "test-key")
    monkeypatch.setattr(settings, "livekit_api_secret", "test-secret")
    monkeypatch.setattr(settings, "livekit_url", "wss://example.livekit.cloud")
    monkeypatch.setattr(settings, "allow_guests", False)

    resp = await client.post("/rooms/token", json={"room_name": "deep-work"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_mint_token_guest_allowed(client, monkeypatch):
    monkeypatch.setattr(settings, "livekit_api_key", "test-key")
    monkeypatch.setattr(settings, "livekit_api_secret", "test-secret")
    monkeypatch.setattr(settings, "livekit_url", "wss://example.livekit.cloud")
    monkeypatch.setattr(settings, "allow_guests", True)

    resp = await client.post(
        "/rooms/token",
        json={"room_name": "deep-work"},
        headers={"x-guest-id": "guest-1", "x-guest-name": "Guest One"},
    )
    assert resp.status_code == 200, resp.text
    claims = jwt.decode(resp.json()["token"], "test-secret", algorithms=["HS256"], options={"verify_aud": False})
    assert claims["sub"] == "guest-1"
    assert claims["name"] == "Guest One"
