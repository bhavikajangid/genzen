# genzen

Monorepo with:

- `backend/` — FastAPI + Socket.IO (ASGI) + Postgres + Redis + LiveKit token minting
- `frontend/` — Next.js app (focus room + breakout rooms)

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

Check: `GET http://localhost:8000/health`

### 2) Frontend

In a second terminal:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open: `http://localhost:3000`

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

## Socket.IO (presence + timer sync)

- Frontend connects to `NEXT_PUBLIC_SOCKET_URL` (usually `http://localhost:8000`)
- Server supports guest connections when `ALLOW_GUESTS=1`
- Events used by the current frontend:
  - emit `room:join` / `room:leave`
  - emit `room:mode`
  - emit `session:start` / `session:end`
  - receive `presence:update`
  - receive `session:tick`

