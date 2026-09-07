from __future__ import annotations

import time
import pytest
from jose import jwt

from app.auth import verify_nextauth_jwt
from app.settings import settings


def _make_token(sub: str = "user-123", expired: bool = False) -> str:
    now = int(time.time())
    exp = now - 10 if expired else now + 3600
    claims = {"sub": sub, "email": "test@example.com", "name": "Test User", "iat": now, "exp": exp}
    return jwt.encode(claims, settings.nextauth_secret, algorithm="HS256")


@pytest.mark.asyncio
async def test_valid_token():
    token = _make_token()
    user = await verify_nextauth_jwt(token)
    assert user.id == "user-123"
    assert user.email == "test@example.com"


@pytest.mark.asyncio
async def test_expired_token():
    from fastapi import HTTPException
    token = _make_token(expired=True)
    with pytest.raises(HTTPException) as exc:
        await verify_nextauth_jwt(token)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_invalid_token():
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        await verify_nextauth_jwt("not.a.valid.token")
    assert exc.value.status_code == 401
