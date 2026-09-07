from __future__ import annotations

from datetime import datetime, timezone

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user
from app.api.friends import router as friends_router
from app.api.messages import router as messages_router
from app.api.rooms import router as rooms_router
from app.api.sessions import router as sessions_router
from app.db import get_db
from app.limiter import limiter
from app.models import SessionRecord, User
from app.schemas import MeStatsOut, OnboardIn, UserOut
from app.settings import settings


def create_fastapi_app() -> FastAPI:
    app = FastAPI(title="genzen-backend", version="0.1.0")

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_url],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health(db: AsyncSession = Depends(get_db)) -> dict[str, str]:
        import logging
        from app.redis_client import get_redis

        checks: dict[str, str] = {}
        log = logging.getLogger(__name__)

        try:
            await db.execute(__import__("sqlalchemy").text("SELECT 1"))
            checks["db"] = "ok"
        except Exception as exc:
            log.error("Health check DB failed: %s", exc)
            checks["db"] = "error"

        try:
            r = get_redis()
            await r.ping()
            checks["redis"] = "ok"
        except Exception as exc:
            log.error("Health check Redis failed: %s", exc)
            checks["redis"] = "error"

        overall = "ok" if all(v == "ok" for v in checks.values()) else "degraded"
        checks["status"] = overall
        return checks

    @app.get("/me", response_model=UserOut)
    async def me(current: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> UserOut:
        user = await _get_or_create_user(db, current)
        return UserOut.model_validate(user, from_attributes=True)

    @app.get("/me/stats", response_model=MeStatsOut)
    async def me_stats(current: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> MeStatsOut:
        start_of_day = datetime.now(tz=timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        result = await db.execute(
            select(func.coalesce(func.sum(SessionRecord.focus_seconds), 0)).where(
                SessionRecord.owner_id == current.id,
                SessionRecord.started_at >= start_of_day,
            )
        )
        total = result.scalar_one()
        return MeStatsOut(focused_seconds_today=int(total))

    @app.post("/users/onboard", response_model=UserOut)
    async def onboard(
        payload: OnboardIn, current: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)
    ) -> UserOut:
        user = await _get_or_create_user(db, current)
        user.display_name = payload.display_name
        user.emoji = payload.emoji
        await db.commit()
        await db.refresh(user)
        return UserOut.model_validate(user, from_attributes=True)

    app.include_router(friends_router)
    app.include_router(sessions_router)
    app.include_router(rooms_router)
    app.include_router(messages_router)

    return app


async def _get_or_create_user(db: AsyncSession, current: CurrentUser) -> User:
    existing = await db.get(User, current.id)
    if existing:
        changed = False
        if current.email and existing.email != current.email:
            existing.email = current.email
            changed = True
        if current.name and existing.name != current.name:
            existing.name = current.name
            changed = True
        if current.image and existing.image != current.image:
            existing.image = current.image
            changed = True
        if changed:
            await db.commit()
            await db.refresh(existing)
        return existing

    user = User(id=current.id, email=current.email, name=current.name, image=current.image)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
