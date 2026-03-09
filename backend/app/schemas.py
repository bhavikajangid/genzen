from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class UserOut(BaseModel):
    id: str
    email: str | None = None
    name: str | None = None
    image: str | None = None
    display_name: str | None = None
    emoji: str | None = None


class OnboardIn(BaseModel):
    display_name: str = Field(min_length=1, max_length=80)
    emoji: str | None = Field(default=None, max_length=16)


class RoomTokenIn(BaseModel):
    room_name: str = Field(min_length=1, max_length=120)
    user_id: str | None = None
    user_name: str | None = None
    emoji: str | None = Field(default=None, max_length=16)


class RoomTokenOut(BaseModel):
    token: str
    url: str


class SessionCreateIn(BaseModel):
    room_id: UUID
    started_at: datetime


class SessionEndIn(BaseModel):
    ended_at: datetime
    duration_seconds: int | None = None
    reflection: str | None = None


class SessionOut(BaseModel):
    id: UUID
    room_id: UUID
    owner_id: str
    started_at: datetime
    ended_at: datetime | None = None
    duration_seconds: int | None = None
    reflection: str | None = None


class FriendRequestIn(BaseModel):
    user_id: str


class FriendAcceptIn(BaseModel):
    user_id: str
