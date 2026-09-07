# genzen

Monorepo with:

- `backend/` — FastAPI + Socket.IO (ASGI) + Postgres + Redis + LiveKit token minting
- `frontend/` — Next.js app (focus room + breakout rooms + dashboard)

## Run locally

### 1) Backend

From repo root:

```bash
cd backend
cp .env.example .env
docker compose up -d
uv sync
source .venv/bin/activate
alembic upgrade head
uvicorn app.asgi:app --reload --host 0.0.0.0 --port 8000
```

Check: `GET http://localhost:8000/health` — returns `{"status":"ok","db":"ok","redis":"ok"}`

### 2) Frontend

In a second terminal:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open: `http://localhost:3000`

## Login (NextAuth)

Frontend login is powered by NextAuth (Google OAuth). Configure in `frontend/.env.local`:

- `NEXTAUTH_URL=http://localhost:3000`
- `NEXTAUTH_SECRET=...` (must match `backend/.env` `NEXTAUTH_SECRET` for backend JWT verification)
- `GOOGLE_CLIENT_ID=...` / `GOOGLE_CLIENT_SECRET=...`

After login, users land on the focus room. The dashboard is at `/dashboard`.

## How tokens work (LiveKit)

LiveKit tokens must be generated on the server (never in the browser) because they require `LIVEKIT_API_SECRET`.

### Frontend flow (recommended)

- Frontend calls `GET /api/rooms/token?room=<roomName>&id=<guestId>&name=<guestName>&emoji=<emoji>`
- That route proxies to backend `POST /rooms/token`
- Backend returns `{ token, url }`
- Frontend uses `token` (and `url` if `NEXT_PUBLIC_LIVEKIT_URL` is not set)

### Backend flow (curl)

Guest mode (local) requires `ALLOW_GUESTS=1` in `backend/.env`:

```bash
curl -sS -X POST http://localhost:8000/rooms/token \
  -H 'content-type: application/json' \
  -H 'x-guest-id: guest-123' \
  -H 'x-guest-name: Bhavika' \
  -d '{"room_name":"deep-work","user_id":"guest-123","user_name":"Bhavika"}'
```

Auth mode (production) uses:

- `Authorization: Bearer <NextAuth JWT>`

## Socket.IO (presence + timer sync + chat)

- Frontend connects to `NEXT_PUBLIC_SOCKET_URL` (usually `http://localhost:8000`)
- Server supports guest connections when `ALLOW_GUESTS=1`
- Events used by the current frontend:
  - emit `room:join` / `room:leave`
  - emit `room:mode`
  - emit `session:start` / `session:end`
  - emit `chat:send` `{ roomId, text }` — sends a chat message
  - receive `presence:update`
  - receive `session:tick`
  - receive `chat:message` `{ id, roomId, text, ts, user }` — incoming chat

## REST API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | none | DB + Redis liveness check |
| GET | `/me` | bearer | Get/create current user |
| POST | `/users/onboard` | bearer | Set display_name + emoji |
| POST | `/rooms/token` | bearer or guest | Mint LiveKit JWT |
| POST | `/sessions` | bearer | Start a session (upserts room by name) |
| PATCH | `/sessions/{id}` | bearer | End session + save reflection |
| GET | `/sessions` | bearer | List your sessions |
| POST | `/friends/request` | bearer | Send friend request |
| POST | `/friends/accept` | bearer | Accept friend request |
| GET | `/friends` | bearer | List accepted friends |

## Breakout rooms

From the main focus room, click **Breakout** to navigate to `/breakout/{roomName}`.

The breakout room has:
- **Chat tab** — real-time messages via Socket.IO (`chat:send` / `chat:message`). Messages from authenticated users are persisted to the `room_messages` table.
- **Voice tab** — LiveKit voice call (lazy-loads token on demand)

## Dashboard

`/dashboard` shows the current user's profile and **Focused today** minutes (tracked via localStorage, incremented every second while a session is active).

## Focus sessions

When a session ends (timer or manual), a reflection textarea appears. On submit, the frontend calls `PATCH /sessions/{id}` with `duration_seconds` and the optional reflection text.

## Production deployment

### Required env vars (backend)

```
ENV=production
FRONTEND_URL=https://your-domain.com
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=redis://...
ALLOW_GUESTS=0
NEXTAUTH_SECRET=<strong random secret>
LIVEKIT_URL=wss://...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

### Required env vars (frontend)

```
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<same as backend>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_SOCKET_URL=https://your-api-domain.com
BACKEND_URL=https://your-api-domain.com
NEXT_PUBLIC_LIVEKIT_URL=wss://...
```

### Docker

```bash
# Backend
docker build -t genzen-backend ./backend
docker run -p 8000:8000 --env-file backend/.env genzen-backend

# Frontend
docker build -t genzen-frontend ./frontend
docker run -p 3000:3000 --env-file frontend/.env.local genzen-frontend
```

### Notes

- `ENV=production` enforces `ALLOW_GUESTS=0` and requires LiveKit config — the app will refuse to start if these are missing.
- The Socket.IO server uses a Redis pub/sub adapter (`AsyncRedisManager`) so multiple backend replicas share presence state.
- Rate limits: `POST /rooms/token` → 20/min, `POST /sessions` → 30/min, `POST /friends/request` → 10/min (per IP).

## Running backend tests

```bash
cd backend
uv sync
source .venv/bin/activate
pytest
```

Tests use SQLite (via `aiosqlite`) — no Postgres or Redis required.
