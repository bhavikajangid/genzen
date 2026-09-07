import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user
from app.db import get_db
from app.limiter import limiter
from app.models import User
from app.schemas import RoomTokenIn, RoomTokenOut
from app.settings import settings


router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.post("/token", response_model=RoomTokenOut)
@limiter.limit("20/minute")
async def mint_livekit_token(
    request: Request, payload: RoomTokenIn, current: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> RoomTokenOut:
    if not (settings.livekit_api_key and settings.livekit_api_secret and settings.livekit_url):
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="LiveKit not configured")

    user_id = payload.user_id or current.id
    display = payload.user_name or current.name
    user = await db.get(User, user_id)
    if user and not payload.user_name:
        display = user.display_name or user.name or display
    display = display or user_id

    now = datetime.now(tz=timezone.utc)
    exp = now + timedelta(hours=1)
    claims = {
        "iss": settings.livekit_api_key,
        "sub": user_id,
        "name": display,
        "nbf": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "jti": str(uuid.uuid4()),
        "video": {
            "room": payload.room_name,
            "roomJoin": True,
            "canPublish": True,
            "canSubscribe": True,
            "canPublishData": True,
        },
    }
    token = jwt.encode(claims, settings.livekit_api_secret, algorithm="HS256")
    return RoomTokenOut(token=token, url=settings.livekit_url)
