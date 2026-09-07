from __future__ import annotations

import asyncio
import contextlib
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

import socketio
from redis.asyncio import Redis
from sqlalchemy import select

from app.auth import CurrentUser, verify_nextauth_jwt
from app.db import SessionLocal
from app.models import Room, RoomMessage
from app.redis_client import get_redis
from app.settings import settings

logger = logging.getLogger(__name__)


def create_sio() -> socketio.AsyncServer:
    kwargs: dict = dict(async_mode="asgi", cors_allowed_origins=[settings.frontend_url])
    if settings.redis_url:
        mgr = socketio.AsyncRedisManager(settings.redis_url)
        kwargs["client_manager"] = mgr
    return socketio.AsyncServer(**kwargs)


sio = create_sio()
redis: Redis = get_redis()


@dataclass
class ActiveSession:
    session_id: str
    room_id: str
    started_at: datetime
    duration_seconds: int
    task: asyncio.Task[None]


active_sessions: dict[str, ActiveSession] = {}


def _presence_key(room_id: str) -> str:
    return f"presence:{room_id}"


def _user_key(user_id: str) -> str:
    return f"user:{user_id}"


async def _broadcast_presence(room_id: str) -> None:
    user_ids = await redis.smembers(_presence_key(room_id))
    users: list[dict[str, str]] = []
    for uid in sorted(user_ids):
        data = await redis.hgetall(_user_key(uid))
        users.append(
            {
                "id": uid,
                "name": (data.get("name") or uid)[:80],
                "emoji": (data.get("emoji") or "")[:16],
            }
        )
    await sio.emit("presence:update", {"users": users}, room=room_id)

async def _get_user_public(user_id: str) -> dict[str, str]:
    data = await redis.hgetall(_user_key(user_id))
    return {
        "id": user_id,
        "name": (data.get("name") or user_id)[:80],
        "emoji": (data.get("emoji") or "")[:16],
    }


async def _ensure_user_cache(user: CurrentUser) -> None:
    emoji = ""
    if isinstance(user.raw_claims, dict) and isinstance(user.raw_claims.get("emoji"), str):
        emoji = user.raw_claims["emoji"]
    await redis.hset(
        _user_key(user.id),
        mapping={
            "name": user.name or "",
            "email": user.email or "",
            "image": user.image or "",
            "emoji": emoji,
            "last_seen": datetime.now(tz=timezone.utc).isoformat(),
        },
    )


async def _sid_user(sid: str) -> CurrentUser:
    session = await sio.get_session(sid)
    user = session.get("user") if isinstance(session, dict) else None
    if not isinstance(user, CurrentUser):
        raise ConnectionRefusedError("unauthorized")
    return user


@sio.event
async def connect(sid: str, environ: dict[str, Any], auth: dict[str, Any] | None) -> None:
    token = None
    if auth and isinstance(auth.get("token"), str):
        token = auth["token"]
    if not token:
        header = (environ.get("HTTP_AUTHORIZATION") or "").strip()
        if header.lower().startswith("bearer "):
            token = header.split(" ", 1)[1].strip()

    user: CurrentUser | None = None
    if token:
        try:
            user = await verify_nextauth_jwt(token)
        except Exception:
            user = None

    if user is None:
        if not settings.allow_guests:
            raise ConnectionRefusedError("unauthorized")
        guest_id = ""
        guest_name = "Guest"
        guest_emoji = ""
        if auth:
            guest_id = str(auth.get("id") or auth.get("userId") or "")
            guest_name = str(auth.get("name") or auth.get("userName") or "Guest")
            guest_emoji = str(auth.get("emoji") or "")
        if not guest_id:
            guest_id = f"guest-{uuid4().hex[:12]}"
        user = CurrentUser(id=guest_id, email=None, name=guest_name, image=None, raw_claims={"guest": True, "emoji": guest_emoji})

    await sio.save_session(sid, {"user": user, "rooms": set()})
    await _ensure_user_cache(user)


@sio.event
async def disconnect(sid: str) -> None:
    session = await sio.get_session(sid)
    rooms = set()
    if isinstance(session, dict) and isinstance(session.get("rooms"), set):
        rooms = session["rooms"]
    user = None
    if isinstance(session, dict) and isinstance(session.get("user"), CurrentUser):
        user = session["user"]
    if not user:
        return

    for room_id in list(rooms):
        await redis.srem(_presence_key(room_id), user.id)
        await sio.leave_room(sid, room_id)
        await _broadcast_presence(room_id)


@sio.on("room:join")
async def room_join(sid: str, data: dict[str, Any]) -> None:
    room_id = str(data.get("roomId") or data.get("room_id") or "")
    if not room_id:
        return
    user = await _sid_user(sid)
    if isinstance(data.get("name"), str) or isinstance(data.get("emoji"), str):
        next_name = str(data.get("name") or user.name or "Guest")
        next_emoji = str(data.get("emoji") or user.raw_claims.get("emoji") or "")
        user = CurrentUser(
            id=user.id,
            email=user.email,
            name=next_name,
            image=user.image,
            raw_claims={**user.raw_claims, "emoji": next_emoji},
        )
        session = await sio.get_session(sid)
        rooms = set()
        if isinstance(session, dict) and isinstance(session.get("rooms"), set):
            rooms = session["rooms"]
        await sio.save_session(sid, {"user": user, "rooms": rooms})
        await _ensure_user_cache(user)
    await redis.sadd(_presence_key(room_id), user.id)
    await sio.enter_room(sid, room_id)
    session = await sio.get_session(sid)
    if isinstance(session, dict) and isinstance(session.get("rooms"), set):
        session["rooms"].add(room_id)
        await sio.save_session(sid, session)
    await _broadcast_presence(room_id)


@sio.on("room:leave")
async def room_leave(sid: str, data: dict[str, Any]) -> None:
    room_id = str(data.get("roomId") or data.get("room_id") or "")
    if not room_id:
        return
    user = await _sid_user(sid)
    await redis.srem(_presence_key(room_id), user.id)
    await sio.leave_room(sid, room_id)
    session = await sio.get_session(sid)
    if isinstance(session, dict) and isinstance(session.get("rooms"), set):
        session["rooms"].discard(room_id)
        await sio.save_session(sid, session)
    await _broadcast_presence(room_id)


@sio.on("room:mode")
async def room_mode(sid: str, data: dict[str, Any]) -> None:
    room_id = str(data.get("roomId") or data.get("room_id") or "")
    mode = str(data.get("mode") or "")
    if not room_id or not mode:
        return
    await sio.emit("room:mode", {"mode": mode}, room=room_id)


@sio.on("session:start")
async def session_start(sid: str, data: dict[str, Any]) -> None:
    room_id = str(data.get("roomId") or data.get("room_id") or "")
    duration_seconds = data.get("durationSeconds") if "durationSeconds" in data else data.get("duration_seconds")
    if not room_id:
        return

    if isinstance(duration_seconds, (int, float)):
        duration_seconds = int(duration_seconds)
    else:
        duration_seconds = 50 * 60

    started_at = datetime.now(tz=timezone.utc)
    session_id = uuid4().hex

    await sio.emit(
        "session:start",
        {"roomId": room_id, "sessionId": session_id, "startedAt": started_at.isoformat(), "durationSeconds": duration_seconds},
        room=room_id,
    )

    await _start_timer(room_id=room_id, session_id=session_id, started_at=started_at, duration_seconds=duration_seconds)


@sio.on("session:end")
async def session_end(sid: str, data: dict[str, Any]) -> None:
    room_id = str(data.get("roomId") or data.get("room_id") or "")
    if not room_id:
        return

    ended_at = datetime.now(tz=timezone.utc)
    await _stop_timer(room_id)
    await sio.emit("session:end", {"roomId": room_id, "endedAt": ended_at.isoformat()}, room=room_id)

async def _upsert_room(room_name: str) -> Room:
    """Get or create a room by name, returning the ORM object."""
    async with SessionLocal() as db:
        result = await db.execute(select(Room).where(Room.name == room_name))
        room = result.scalar_one_or_none()
        if not room:
            room = Room(name=room_name, mode="focus")
            db.add(room)
            await db.commit()
            await db.refresh(room)
        return room


@sio.on("chat:send")
async def chat_send(sid: str, data: dict[str, Any]) -> None:
    room_id = str(data.get("roomId") or data.get("room_id") or "")
    text = data.get("text")
    if not room_id or not isinstance(text, str):
        return
    text = text.strip()
    if not text:
        return
    if len(text) > 800:
        text = text[:800]

    user = await _sid_user(sid)
    await _ensure_user_cache(user)
    public = await _get_user_public(user.id)

    msg_id = uuid4().hex
    now = datetime.now(tz=timezone.utc)

    # Persist to DB for authenticated users only
    is_guest = bool(user.raw_claims.get("guest"))
    if not is_guest:
        try:
            room = await _upsert_room(room_id)
            async with SessionLocal() as db:
                db.add(RoomMessage(id=uuid4(), room_id=room.id, user_id=user.id, content=text, created_at=now))
                await db.commit()
        except Exception:
            logger.exception("Failed to persist chat message for room=%s user=%s", room_id, user.id)

    payload = {
        "id": msg_id,
        "roomId": room_id,
        "text": text,
        "ts": now.isoformat(),
        "user": public,
    }
    await sio.emit("chat:message", payload, room=room_id)


async def _start_timer(room_id: str, session_id: str, started_at: datetime, duration_seconds: int) -> None:
    await _stop_timer(room_id)

    async def run() -> None:
        while True:
            now = datetime.now(tz=timezone.utc)
            elapsed = int((now - started_at).total_seconds())
            seconds_left = max(0, duration_seconds - elapsed)
            done = seconds_left == 0
            await sio.emit(
                "session:tick",
                {"secondsLeft": seconds_left, "totalSeconds": duration_seconds},
                room=room_id,
            )
            if done:
                asyncio.create_task(session_end("server", {"roomId": room_id}))
                return
            await asyncio.sleep(1)

    task = asyncio.create_task(run())
    active_sessions[room_id] = ActiveSession(
        session_id=session_id,
        room_id=room_id,
        started_at=started_at,
        duration_seconds=duration_seconds,
        task=task,
    )


async def _stop_timer(room_id: str) -> None:
    current = active_sessions.pop(room_id, None)
    if current and not current.task.done():
        current.task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await current.task


#
# Note: Socket.IO events are intentionally "guest-friendly" for local MVP.
# Persistence happens via REST endpoints (Sessions/Friends/etc.) once auth is wired.
#
