from __future__ import annotations

import pytest
import pytest_asyncio
from fakeredis import aioredis as fakeredis

from app import socket_server as ss
from app.auth import CurrentUser


class InMemorySessions:
    def __init__(self) -> None:
        self.store: dict[str, dict] = {}

    async def save(self, sid, session, namespace=None):
        self.store[sid] = session

    async def get(self, sid, namespace=None):
        return self.store.setdefault(sid, {})


class InMemoryRooms:
    def __init__(self) -> None:
        self.rooms: dict[str, set[str]] = {}

    async def enter(self, sid, room, namespace=None):
        self.rooms.setdefault(room, set()).add(sid)

    async def leave(self, sid, room, namespace=None):
        self.rooms.get(room, set()).discard(sid)


class RecordingEmitter:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict, str | None]] = []

    async def emit(self, event, data=None, room=None, **kwargs):
        self.calls.append((event, data, room))


@pytest_asyncio.fixture()
async def sio_env(monkeypatch):
    fake_redis = fakeredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr(ss, "redis", fake_redis)

    sessions = InMemorySessions()
    monkeypatch.setattr(ss.sio, "save_session", sessions.save)
    monkeypatch.setattr(ss.sio, "get_session", sessions.get)

    rooms = InMemoryRooms()
    monkeypatch.setattr(ss.sio, "enter_room", rooms.enter)
    monkeypatch.setattr(ss.sio, "leave_room", rooms.leave)

    emitter = RecordingEmitter()
    monkeypatch.setattr(ss.sio, "emit", emitter.emit)

    return {"redis": fake_redis, "sessions": sessions, "rooms": rooms, "emitter": emitter}


def _user(uid: str, name: str = "Test", guest: bool = False) -> CurrentUser:
    return CurrentUser(id=uid, email=None, name=name, image=None, raw_claims={"guest": guest, "emoji": "🧑‍💻"})


@pytest.mark.asyncio
async def test_room_join_adds_presence_and_broadcasts(sio_env):
    sid = "sid-1"
    user = _user("u1", "Alice")
    sio_env["sessions"].store[sid] = {"user": user, "rooms": set()}
    await ss._ensure_user_cache(user)

    await ss.room_join(sid, {"roomId": "room-a"})

    members = await sio_env["redis"].smembers(ss._presence_key("room-a"))
    assert members == {"u1"}
    assert sid in sio_env["rooms"].rooms["room-a"]

    presence_events = [c for c in sio_env["emitter"].calls if c[0] == "presence:update"]
    assert presence_events
    event, data, room = presence_events[-1]
    assert room == "room-a"
    assert data["users"][0]["id"] == "u1"
    assert data["users"][0]["name"] == "Alice"


@pytest.mark.asyncio
async def test_room_leave_removes_presence(sio_env):
    sid = "sid-2"
    sio_env["sessions"].store[sid] = {"user": _user("u2", "Bob"), "rooms": set()}

    await ss.room_join(sid, {"roomId": "room-b"})
    await ss.room_leave(sid, {"roomId": "room-b"})

    members = await sio_env["redis"].smembers(ss._presence_key("room-b"))
    assert members == set()

    presence_events = [c for c in sio_env["emitter"].calls if c[0] == "presence:update"]
    _, last_data, _ = presence_events[-1]
    assert last_data["users"] == []


@pytest.mark.asyncio
async def test_disconnect_clears_presence_for_all_rooms(sio_env):
    sid = "sid-3"
    sio_env["sessions"].store[sid] = {"user": _user("u3", "Cara"), "rooms": set()}

    await ss.room_join(sid, {"roomId": "room-c"})
    await ss.room_join(sid, {"roomId": "room-d"})

    await ss.disconnect(sid)

    assert await sio_env["redis"].smembers(ss._presence_key("room-c")) == set()
    assert await sio_env["redis"].smembers(ss._presence_key("room-d")) == set()


@pytest.mark.asyncio
async def test_room_mode_broadcasts_mode(sio_env):
    await ss.room_mode("sid-x", {"roomId": "room-e", "mode": "social"})

    mode_events = [c for c in sio_env["emitter"].calls if c[0] == "room:mode"]
    assert mode_events[-1] == ("room:mode", {"mode": "social"}, "room-e")


@pytest.mark.asyncio
async def test_chat_send_persists_only_for_authenticated_users(sio_env, engine):
    from sqlalchemy import select
    from app.db import SessionLocal
    from app.models import RoomMessage, Room

    auth_sid = "sid-auth"
    guest_sid = "sid-guest"
    sio_env["sessions"].store[auth_sid] = {"user": _user("auth-user", "Auth", guest=False), "rooms": set()}
    sio_env["sessions"].store[guest_sid] = {"user": _user("guest-user", "Guest", guest=True), "rooms": set()}

    await ss.chat_send(auth_sid, {"roomId": "chat-room", "text": "hello from auth"})
    await ss.chat_send(guest_sid, {"roomId": "chat-room", "text": "hello from guest"})

    chat_events = [c for c in sio_env["emitter"].calls if c[0] == "chat:message"]
    assert len(chat_events) == 2

    async with SessionLocal() as db:
        room = (await db.execute(select(Room).where(Room.name == "chat-room"))).scalar_one()
        messages = (await db.execute(select(RoomMessage).where(RoomMessage.room_id == room.id))).scalars().all()

    assert len(messages) == 1
    assert messages[0].user_id == "auth-user"
    assert messages[0].content == "hello from auth"


@pytest.mark.asyncio
async def test_chat_send_ignores_blank_text(sio_env):
    sid = "sid-blank"
    sio_env["sessions"].store[sid] = {"user": _user("u-blank", "Blank", guest=True), "rooms": set()}

    await ss.chat_send(sid, {"roomId": "room-f", "text": "   "})

    chat_events = [c for c in sio_env["emitter"].calls if c[0] == "chat:message"]
    assert chat_events == []


@pytest.mark.asyncio
async def test_connect_creates_guest_when_no_token(sio_env, monkeypatch):
    monkeypatch.setattr(ss.settings, "allow_guests", True)

    await ss.connect("sid-guest-connect", {}, {"name": "Newcomer", "emoji": "🌱"})

    session = sio_env["sessions"].store["sid-guest-connect"]
    user = session["user"]
    assert user.name == "Newcomer"
    assert user.id.startswith("guest-")


@pytest.mark.asyncio
async def test_connect_rejects_when_guests_disallowed_and_no_token(sio_env, monkeypatch):
    monkeypatch.setattr(ss.settings, "allow_guests", False)

    with pytest.raises(ConnectionRefusedError):
        await ss.connect("sid-reject", {}, None)
