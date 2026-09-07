"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { getSocket } from "@/lib/socket";
import { getIdentity } from "@/lib/identity";
import { useRoomStore } from "@/stores/useRoomStore";

export function useRoomSocket(roomId: string | null) {
  const setPresence = useRoomStore((s) => s.setPresence);
  const setMode = useRoomStore((s) => s.setMode);
  const { data: session } = useSession();

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

    const identity = getIdentity();
    const token = (session as any)?.backendToken as string | undefined;
    (socket as any).auth = { ...identity, token };
    if (!socket.connected) socket.connect();

    return () => {
      // keep socket connected while app is mounted (for global stats)
    };
  }, [socket, session]);

  const joinedRoomRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!socket) return;

    const prev = joinedRoomRef.current;
    if (prev && prev !== roomId) socket.emit("room:leave", { roomId: prev });
    if (roomId && prev !== roomId) socket.emit("room:join", { roomId, ...getIdentity() });
    joinedRoomRef.current = roomId;
    if (!roomId) setPresence([]);
  }, [socket, roomId, setPresence]);

  React.useEffect(() => {
    if (!socket) return;
    return () => {
      if (joinedRoomRef.current) socket.emit("room:leave", { roomId: joinedRoomRef.current });
      joinedRoomRef.current = null;
      socket.disconnect();
    };
  }, [socket]);

  return {
    connected: !!socket?.connected,
    socket
  };
}
