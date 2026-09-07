from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Room


async def get_or_create_room(db: AsyncSession, name: str, created_by_id: str | None = None) -> Room:
    result = await db.execute(select(Room).where(Room.name == name))
    room = result.scalar_one_or_none()
    if room:
        return room

    room = Room(name=name, mode="focus", created_by_id=created_by_id)
    db.add(room)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        result = await db.execute(select(Room).where(Room.name == name))
        room = result.scalar_one()
    return room
