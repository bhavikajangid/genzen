from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user
from app.db import get_db
from app.models import Room, SessionRecord
from app.schemas import SessionCreateIn, SessionEndIn, SessionOut


router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionOut)
async def create_session(
    payload: SessionCreateIn, current: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> SessionOut:
    room = await db.get(Room, payload.room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")

    record = SessionRecord(room_id=payload.room_id, owner_id=current.id, started_at=payload.started_at)
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return SessionOut.model_validate(record, from_attributes=True)


@router.patch("/{session_id}", response_model=SessionOut)
async def end_session(
    session_id: UUID,
    payload: SessionEndIn,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SessionOut:
    record = await db.get(SessionRecord, session_id)
    if not record or record.owner_id != current.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    record.ended_at = payload.ended_at
    record.duration_seconds = payload.duration_seconds
    record.reflection = payload.reflection
    await db.commit()
    await db.refresh(record)
    return SessionOut.model_validate(record, from_attributes=True)


@router.get("", response_model=list[SessionOut])
async def list_sessions(
    me: int = Query(default=1),
    limit: int = Query(default=50, ge=1, le=200),
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[SessionOut]:
    q = select(SessionRecord)
    if me:
        q = q.where(SessionRecord.owner_id == current.id)
    q = q.order_by(desc(SessionRecord.started_at)).limit(limit)
    records = (await db.execute(q)).scalars().all()
    return [SessionOut.model_validate(r, from_attributes=True) for r in records]

