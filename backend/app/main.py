from __future__ import annotations

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user
from app.api.friends import router as friends_router
from app.api.rooms import router as rooms_router
from app.api.sessions import router as sessions_router
from app.db import get_db
from app.models import User
from app.schemas import OnboardIn, UserOut
from app.settings import settings


def create_fastapi_app() -> FastAPI:
    app = FastAPI(title="genzen-backend", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_url],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/me", response_model=UserOut)
    async def me(current: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> UserOut:
        user = await _get_or_create_user(db, current)
        return UserOut.model_validate(user, from_attributes=True)

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
