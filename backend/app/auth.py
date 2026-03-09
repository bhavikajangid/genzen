from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx
from fastapi import Depends, HTTPException, Request, status
from jose import jwt
from jose.exceptions import JWTError

from app.settings import settings


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str | None
    name: str | None
    image: str | None
    raw_claims: dict[str, Any]


class JwksCache:
    def __init__(self) -> None:
        self._jwks: dict[str, Any] | None = None

    async def get(self) -> dict[str, Any]:
        if not settings.nextauth_jwks_url:
            raise RuntimeError("NEXTAUTH_JWKS_URL not configured")
        if self._jwks is not None:
            return self._jwks
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(settings.nextauth_jwks_url)
            resp.raise_for_status()
            self._jwks = resp.json()
            return self._jwks


jwks_cache = JwksCache()


def _extract_bearer(request: Request) -> str:
    auth = request.headers.get("authorization") or ""
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    return auth.split(" ", 1)[1].strip()


async def verify_nextauth_jwt(token: str) -> CurrentUser:
    try:
        if settings.nextauth_secret:
            claims = jwt.decode(token, settings.nextauth_secret, algorithms=["HS256"], options={"verify_aud": False})
        elif settings.nextauth_jwks_url:
            jwks = await jwks_cache.get()
            claims = jwt.decode(
                token,
                jwks,
                algorithms=["RS256"],
                issuer=settings.nextauth_issuer,
                audience=settings.nextauth_audience,
            )
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Auth not configured")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    sub = claims.get("sub")
    if not sub or not isinstance(sub, str):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing subject")

    email = claims.get("email") if isinstance(claims.get("email"), str) else None
    name = claims.get("name") if isinstance(claims.get("name"), str) else None
    image = claims.get("picture") if isinstance(claims.get("picture"), str) else None
    return CurrentUser(id=sub, email=email, name=name, image=image, raw_claims=claims)


async def get_current_user(request: Request) -> CurrentUser:
    auth = request.headers.get("authorization") or ""
    if auth.lower().startswith("bearer "):
        token = auth.split(" ", 1)[1].strip()
        return await verify_nextauth_jwt(token)

    if settings.allow_guests:
        guest_id = request.headers.get("x-guest-id") or "guest"
        guest_name = request.headers.get("x-guest-name") or "Guest"
        guest_emoji = request.headers.get("x-guest-emoji") or ""
        return CurrentUser(
            id=guest_id,
            email=None,
            name=guest_name,
            image=None,
            raw_claims={"guest": True, "emoji": guest_emoji},
        )

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")


CurrentUserDep = Depends(get_current_user)
