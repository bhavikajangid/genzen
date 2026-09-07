# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**genzen** is a monorepo for a collaborative focus-room web app where users join focus sessions, track time, and optionally break into voice/chat rooms. The app supports both authenticated users (Google OAuth via NextAuth) and guest sessions.

- **Backend**: FastAPI + Socket.IO (ASGI), PostgreSQL + Redis + LiveKit
- **Frontend**: Next.js (App Router) + React + Socket.IO client + TanStack Query
- **Key features**: Focus sessions with timers, presence tracking, breakout rooms with voice (LiveKit) and chat, friend requests, session reflection

## Getting Started

### Backend Setup
```bash
cd backend
cp .env.example .env
docker compose up -d  # Start PostgreSQL + Redis
uv sync
source .venv/bin/activate
alembic upgrade head  # Run migrations
uvicorn app.asgi:app --reload --host 0.0.0.0 --port 8000
```
Health check: `GET http://localhost:8000/health` → `{"status":"ok","db":"ok","redis":"ok"}`

### Frontend Setup
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev  # Opens http://localhost:3000
```

### Backend Tests
```bash
cd backend
source .venv/bin/activate
pytest           # Run all tests
pytest tests/test_sessions.py -v  # Run specific test file
pytest tests/test_sessions.py::test_name -v  # Run single test
```
Tests use SQLite (aiosqlite) — no Postgres/Redis needed.

## Backend Architecture

### Core Structure
- **`app/main.py`**: FastAPI app factory (`create_fastapi_app()`), route definitions, health/me/onboard endpoints
- **`app/asgi.py`**: ASGI entry point that wraps FastAPI with Socket.IO
- **`app/settings.py`**: Pydantic Settings with env vars; production validation enforces `ALLOW_GUESTS=0`, LiveKit config
- **`app/models.py`**: SQLAlchemy ORM models — User, Room, SessionRecord, Friendship, RoomMessage
- **`app/db.py`**: AsyncSession setup, `SessionLocal`, `Base` declarative
- **`app/auth.py`**: JWT verification (`verify_nextauth_jwt`), `CurrentUser` dataclass, `get_current_user` dependency
- **`app/socket_server.py`**: Socket.IO event handlers for presence/timers/chat, Redis for ephemeral state
- **`app/redis_client.py`**: Redis connection pool
- **`app/limiter.py`**: slowapi rate limiters (20/min for token minting, 30/min for sessions, 10/min for friend requests)

### API Modules (`app/api/`)
- **`rooms.py`**: `POST /rooms/token` — mints LiveKit JWT (requires bearer or guest auth, rate-limited)
- **`sessions.py`**: `POST /sessions` (start), `PATCH /sessions/{id}` (end + reflection), `GET /sessions` (list)
- **`friends.py`**: `POST /friends/request`, `POST /friends/accept`, `GET /friends`

### Socket.IO Events
**Presence & timers** (real-time sync via Redis pub/sub):
- `room:join` → stores presence in Redis, broadcasts `presence:update`
- `room:leave` → removes presence
- `session:start` / `session:end` → server broadcasts `session:tick` every second
- `room:mode` → updates room mode (e.g., focus → breakout)

**Chat** (ephemeral + persistence):
- `chat:send` → broadcasts `chat:message` to room; if sender is authenticated, persists to `room_messages` table

**User caching**: On connection, user metadata (name, emoji, image) cached in Redis for quick presence lookup.

### Database Migrations
Alembic migrations in `alembic/versions/` with auto-generated timestamped files. To create a new migration:
```bash
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### Authentication Flow
1. **Guest mode** (`ALLOW_GUESTS=1`): Socket.IO connects without auth, REST calls with `x-guest-id` / `x-guest-name` headers
2. **Production mode**: Socket.IO and REST require NextAuth JWT (verified against `NEXTAUTH_SECRET` or JWKS endpoint)
3. User record auto-created on first `/me` call

### LiveKit Token Generation
`POST /rooms/token` endpoint (frontend proxies via `GET /api/rooms/token`):
- Requires `LIVEKIT_API_SECRET` (server-side only, never in browser)
- Returns `{ token, url }` where `url` is optional if `NEXT_PUBLIC_LIVEKIT_URL` is set in frontend env

## Frontend Architecture

### App Router Structure
- **`src/app/page.tsx`**: Home → redirects to `/login` if not authenticated, else shows FocusRoomApp
- **`src/app/login/page.tsx`**: NextAuth login (Google OAuth)
- **`src/app/dashboard/page.tsx`**: User profile + "Focused today" stats
- **`src/app/breakout/[room]/page.tsx`**: Breakout room (chat + voice tabs)
- **`src/app/api/auth/[...nextauth]/route.ts`**: NextAuth API route (Google OAuth config)
- **`src/app/api/rooms/token/route.ts`**: Proxy to backend `POST /rooms/token`
- **`src/app/layout.tsx`**: RootLayout with providers (NextAuth, TanStack Query, Socket.IO)
- **`src/app/providers.tsx`**: Wraps app with QueryClientProvider, Socket.IO context

### Key Hooks
- **`useRoomSocket`**: Connects to Socket.IO, handles presence/timer/chat events
- **`useRoomChat`**: Sends/receives chat messages
- **`useSessionSync`**: Syncs focus session state with backend (start/end/reflection)

### Services Layer
- **`services/api.ts`**: Base HTTP client (adds auth token + CORS headers)
- **`services/rooms.ts`**: `/rooms/token` minting
- **`services/sessions.ts`**: Session CRUD
- **`services/user.ts`**: User onboarding
- **`services/friends.ts`**: Friend requests

### State Management
- **`stores/useRoomStore`**: Zustand store for focus room state (room name, participants, session mode)
- **`lib/auth.ts`**: NextAuth config (Google OAuth) + JWT extraction
- **`lib/focusStats.ts`**: localStorage tracking of "Focused today" minutes

### Components
- **`FocusRoomApp.tsx`**: Main focus room UI (timer, mode toggle, presence list)
- **`BreakoutCafeRoom.tsx`**: Chat tab in breakout room
- **`BreakoutVoicePanel.tsx`**: Voice tab with LiveKit
- **`DashboardClient.tsx`**: Profile display + stats

### Key Libraries
- **next-auth**: OAuth + JWT session management
- **livekit-client** + **@livekit/components-react**: WebRTC for voice/video
- **socket.io-client**: Presence/timer/chat signaling
- **@tanstack/react-query**: Data fetching + caching
- **zustand**: Lightweight state management
- **framer-motion**: Animations

## Environment Variables

### Backend (`.env`)
```bash
ENV=local|production
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/genzen
REDIS_URL=redis://localhost:6379/0
ALLOW_GUESTS=1|0
NEXTAUTH_SECRET=<strong random secret>
LIVEKIT_URL=wss://... (production)
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

### Frontend (`.env.local`)
```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<same as backend>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_LIVEKIT_URL=wss://... (optional if using backend proxy)
```

## Common Development Tasks

### Add a new REST endpoint
1. Create a file in `backend/app/api/` (e.g., `new_feature.py`)
2. Define router and endpoints: `router = APIRouter(prefix="/feature", tags=["feature"])`
3. Add auth dependency: `get_current_user` for authenticated, `x-guest-id` header for guests
4. Apply rate limiter if needed: `@limiter.limit("10/minute")`
5. Include router in `app/main.py`: `app.include_router(new_router)`
6. Write tests in `backend/tests/test_new_feature.py`

### Add a new Socket.IO event
1. Define handler in `backend/app/socket_server.py` with `@sio.event` decorator
2. Use `sio.emit()` for server→client, `sio.to(room)` for room broadcast
3. Leverage Redis pub/sub for multi-instance deployments (via AsyncRedisManager)
4. Frontend listens with `socket.on("event", handler)` in `useRoomSocket` hook

### Update database schema
1. Make changes to `backend/app/models.py`
2. Generate migration: `alembic revision --autogenerate -m "description"`
3. Review + edit `alembic/versions/TIMESTAMP_*.py`
4. Apply: `alembic upgrade head`
5. For production, ensure backward compatibility (add columns nullable, deprecate old ones gradually)

### Modify authentication
- **Backend JWT verification**: `app/auth.py` → `verify_nextauth_jwt()`
- **Frontend JWT extraction**: `lib/auth.ts` → `getToken()` in NextAuth callbacks
- **Guest mode toggle**: Set `ALLOW_GUESTS` in backend `.env` and remove auth checks on Socket.IO/REST if needed
- **JWKS endpoint** (for delegated auth): Set `NEXTAUTH_JWKS_URL` in backend `.env` (production alternative to `NEXTAUTH_SECRET`)

### Deploy to production
1. Build backend image: `docker build -t genzen-backend ./backend`
2. Build frontend image: `docker build -t genzen-frontend ./frontend`
3. Set production env vars (see Backend/Frontend env sections above)
4. Ensure `ENV=production` in backend (enforces security: `ALLOW_GUESTS=0`, requires LiveKit + NEXTAUTH_SECRET/JWKS)
5. Use CloudSQL/RDS for PostgreSQL, CloudMemorystoreRedis/ElastiCache for Redis
6. Frontend should use relative URLs for Socket.IO if on same domain, or `NEXT_PUBLIC_SOCKET_URL` for separate backend
7. Rate limits are per-IP; use a load balancer with sticky sessions for Socket.IO (connection affinity)

## Code Patterns

### Backend
- **Async all the way**: Use `async`/`await`, `AsyncSession`, async context managers
- **Dependency injection**: FastAPI `Depends()` for auth, DB, rate limiting
- **Error handling**: Raise HTTPException with status_code + detail for API errors
- **Type hints**: Use `Mapped[type]` for SQLAlchemy columns, full type annotations on functions

### Frontend
- **Server vs. Client Components**: Use `"use client"` sparingly; prefer Server Components for auth checks
- **Hook conventions**: Hooks in `src/hooks/`, services in `src/services/`, state in `src/stores/`
- **Optimistic updates**: Use React Query `optimisticData` for instant UI feedback
- **Error boundaries**: Wrap error-prone components; see `ErrorBoundary.tsx`

## Testing Strategy

- **Backend**: pytest with SQLite backend (no Postgres/Redis needed)
  - `conftest.py` provides test fixtures: async DB, fixtures for users/rooms
  - Place tests in `backend/tests/test_*.py`
  - Use `async def test_*` with `pytest-asyncio`
- **Frontend**: No automated tests currently; manual testing recommended
  - Test auth flow (login/logout)
  - Test focus session lifecycle (start/end/reflection)
  - Test breakout room joining (presence, chat, voice)
  - Test guest mode locally (`ALLOW_GUESTS=1`)

## Known Constraints & Tradeoffs

1. **Presence is ephemeral**: Redis stores it; on backend crash, presence is lost. Reconnection resync from client side.
2. **Chat persistence**: Only authenticated user messages persist to `room_messages` table; guests' messages are ephemeral.
3. **LiveKit tokens**: Generated server-side only; frontend must fetch on demand. Tokens expire per LiveKit config (typically 1 hour).
4. **Rate limits**: Per IP; multi-user behind a NAT counts as one. For testing, use `x-forwarded-for` header or mock limiter.
5. **Socket.IO adapter**: Redis pub/sub is optional (for local single-instance dev, omit REDIS_URL). For production, requires Redis.
6. **Next.js Image optimization**: None currently; avatar images served as-is. Consider adding next/image if optimizing for bandwidth.

## Debugging

- **Backend logs**: Set `LOG_LEVEL=debug` in `.env`, or import logger in code
- **Socket.IO events**: Add `print()` / logging in `socket_server.py` event handlers; Socket.IO admin UI at `http://localhost:8000/admin` (if configured)
- **Frontend network**: Browser DevTools → Network tab to inspect API/Socket.IO traffic
- **Auth issues**: Check `NEXTAUTH_SECRET` matches between backend + frontend; check Google OAuth credentials
- **LiveKit token failures**: Verify `LIVEKIT_API_SECRET` is set on backend; check token generation logs
