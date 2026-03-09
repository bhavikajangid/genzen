# genzen (Next.js)

## Run
1. Install deps: `npm install`
2. Start dev server: `npm run dev`

## Assets
Place these files in `public/assets/`:
- `sound-on.png`
- `sound-off.png`
- `ambience-day.mp3`
- `ambience-night.mp3`

## Env (optional)
- `NEXT_PUBLIC_SOCKET_URL` — Socket.io server URL (presence + timer sync). Example: `http://localhost:8000`
- `BACKEND_URL` — FastAPI base URL (used by `/api/rooms/token` proxy). Example: `http://localhost:8000`
- `NEXT_PUBLIC_LIVEKIT_URL` — LiveKit server URL (voice rooms). Optional if backend `/rooms/token` returns `url`.
