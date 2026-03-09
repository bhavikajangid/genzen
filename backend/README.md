# Backend (FastAPI + Socket.IO + Postgres + Redis + LiveKit)

## Quickstart (local)

1) Copy env

```bash
cp .env.example .env
```

2) Start Postgres + Redis

```bash
docker compose up -d
```

3) Create venv + install deps

```bash
# Install uv itself (once, globally)
curl -Lsf https://astral.sh/uv/install.sh | sh

# Create venv + install everything — replaces python -m venv + pip install
uv sync

# Activate (same as before)
source .venv/bin/activate
```

4) Run migrationsa

```bash
alembic upgrade head
```

5) Run API + Socket.IO ASGI app

```bash
uvicorn app.asgi:app --reload --host 0.0.0.0 --port 8000
```

Health check: `GET http://localhost:8000/health`

## Socket.IO

Connect with `auth: { token: "<NEXTAUTH_JWT>" }`.

Implemented events:

- `room:join` / `room:leave`
- `room:mode`
- `session:start` / `session:end`
- Server emits `presence:update` and `session:tick`

## Auth (NextAuth -> FastAPI)

Protected endpoints require:

`Authorization: Bearer <NEXTAUTH_JWT>`

Verification options:

- `NEXTAUTH_SECRET` (HS256 JWT signed by your NextAuth secret)
- OR `NEXTAUTH_JWKS_URL` (JWKS endpoint for RS256/OIDC providers)

User id is taken from JWT `sub`.

### Local guest mode

If `ALLOW_GUESTS=1`, missing `Authorization` is allowed for local/dev and the backend will accept:

- `x-guest-id`
- `x-guest-name`
- `x-guest-emoji`

## LiveKit

Set:

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

Endpoint:

- `POST /rooms/token` -> returns `{ token, url }`
