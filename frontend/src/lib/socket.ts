import { io, type Socket } from "socket.io-client";

type ServerToClientEvents = {
  "presence:update": (payload: { users: Array<{ id: string; name: string; emoji?: string }> }) => void;
  "room:mode": (payload: { mode: "focus" | "social" }) => void;
  "session:tick": (payload: { secondsLeft: number; totalSeconds?: number }) => void;
};

type ClientToServerEvents = {
  "room:join": (payload: { roomId: string; name: string; emoji?: string }) => void;
  "room:leave": (payload: { roomId: string }) => void;
  "room:mode": (payload: { roomId: string; mode: "focus" | "social" }) => void;
  "session:start": (payload: { roomId: string; durationSeconds: number; intention?: string }) => void;
  "session:end": (payload: { roomId: string }) => void;
};

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

function getIdentity() {
  if (typeof window === "undefined") return { id: "anon", name: "Anonymous", emoji: "🧑‍💻" };

  const KEY = "userIdentity";
  const existing = window.localStorage.getItem(KEY);
  if (existing) {
    try {
      const parsed = JSON.parse(existing) as { id: string; name: string; emoji?: string };
      if (parsed.id && parsed.name) return parsed;
    } catch {}
  }

  const id = crypto.randomUUID();
  const next = { id, name: "You", emoji: "🧑‍💻" };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function getSocket() {
  if (socket) return socket;

  const url = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (!url) return null;

  const identity = getIdentity();
  socket = io(url, {
    transports: ["websocket"],
    autoConnect: false,
    auth: identity
  });

  return socket;
}
