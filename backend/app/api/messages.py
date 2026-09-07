from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user
from app.crud import get_or_create_room
from app.db import get_db
from app.models import RoomMessage, User
from app.schemas import MessageOut


router = APIRouter(prefix="/rooms", tags=["messages"])


@router.get("/{room_name}/messages", response_model=list[MessageOut])
async def list_room_messages(
    room_name: str,
    limit: int = Query(default=50, ge=1, le=200),
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MessageOut]:
    room = await get_or_create_room(db, room_name)
    await db.commit()

    result = await db.execute(
        select(RoomMessage, User)
        .join(User, User.id == RoomMessage.user_id)
        .where(RoomMessage.room_id == room.id)
        .order_by(desc(RoomMessage.created_at))
        .limit(limit)
    )
    rows = result.all()

    messages = [
        MessageOut(
            id=msg.id,
            room_id=msg.room_id,
            user_id=msg.user_id,
            user_name=user.display_name or user.name,
            user_emoji=user.emoji,
            content=msg.content,
            created_at=msg.created_at,
        )
        for msg, user in rows
    ]
    messages.reverse()
    return messages
