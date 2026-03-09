"use client";

import * as React from "react";
import { getSocket } from "@/lib/socket";
import { useRoomStore } from "@/stores/useRoomStore";

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

export function useRoomSocket(roomId: string | null) {
  const setPresence = useRoomStore((s) => s.setPresence);
  const setMode = useRoomStore((s) => s.setMode);

  const socket = React.useMemo(() => getSocket(), []);

  React.useEffect(() => {
    if (!socket) return;

    const onPresence = (payload: { users: Array<{ id: string; name: string; emoji?: string }> }) => {
      setPresence(payload.users);
    };
    const onMode = (payload: { mode: "focus" | "social" }) => {
      setMode(payload.mode);
    };

    socket.on("presence:update", onPresence);
    socket.on("room:mode", onMode);

    return () => {
      socket.off("presence:update", onPresence);
      socket.off("room:mode", onMode);
    };
  }, [socket, setMode, setPresence]);

  React.useEffect(() => {
    if (!socket) return;
    if (!roomId) return;

    const identity = getIdentity();
    socket.connect();
    socket.emit("room:join", { roomId, ...identity });

    return () => {
      socket.emit("room:leave", { roomId });
      socket.disconnect();
    };
  }, [socket, roomId]);

  return {
    connected: !!socket?.connected,
    socket
  };
}

