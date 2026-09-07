import { io, type Socket } from "socket.io-client";

type ServerToClientEvents = {
  "presence:update": (payload: { users: Array<{ id: string; name: string; emoji?: string }> }) => void;
  "room:mode": (payload: { mode: "focus" | "social" }) => void;
  "session:tick": (payload: { secondsLeft: number; totalSeconds?: number }) => void;
  "chat:message": (payload: {
    id: string;
    roomId: string;
    text: string;
    ts: string;
    user: { id: string; name: string; emoji?: string };
  }) => void;
};

type ClientToServerEvents = {
  "room:join": (payload: { roomId: string; name: string; emoji?: string }) => void;
  "room:leave": (payload: { roomId: string }) => void;
  "room:mode": (payload: { roomId: string; mode: "focus" | "social" }) => void;
  "session:start": (payload: { roomId: string; durationSeconds: number; intention?: string }) => void;
  "session:end": (payload: { roomId: string }) => void;
  "chat:send": (payload: { roomId: string; text: string }) => void;
};

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket() {
  if (socket) return socket;

  const url = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (!url) return null;

  try {
    const u = new URL(url);
    if (u.hostname.endsWith("livekit.cloud") || u.hostname.includes("livekit")) {
      // eslint-disable-next-line no-console
      console.error(
        `[socket] NEXT_PUBLIC_SOCKET_URL looks like a LiveKit URL (${u.hostname}). Set NEXT_PUBLIC_SOCKET_URL to your FastAPI/Socket.IO server (e.g. http://localhost:8000).`
      );
      return null;
    }
  } catch {
    // ignore
  }

  socket = io(url, {
    transports: ["websocket"],
    autoConnect: false
  });

  return socket;
}
