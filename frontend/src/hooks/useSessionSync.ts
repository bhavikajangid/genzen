"use client";

import * as React from "react";
import type { Socket } from "socket.io-client";

type EndReason = "completed" | "manual" | "tab_switch";

type SyncSocket = Socket<
  { "session:tick": (payload: { secondsLeft: number; totalSeconds?: number }) => void },
  {
    "session:start": (payload: { roomId: string; durationSeconds: number; intention?: string }) => void;
    "session:end": (payload: { roomId: string; reason?: EndReason }) => void;
  }
>;

export function useSessionSync({
  roomId,
  socket,
  enabled,
  onTick
}: {
  roomId: string | null;
  socket: SyncSocket | null;
  enabled: boolean;
  onTick: (payload: { secondsLeft: number; totalSeconds?: number }) => void;
}) {
  React.useEffect(() => {
    if (!enabled) return;
    if (!socket) return;

    const handler = (payload: { secondsLeft: number; totalSeconds?: number }) => onTick(payload);
    socket.on("session:tick", handler);
    return () => {
      socket.off("session:tick", handler);
    };
  }, [enabled, onTick, socket]);

  const start = React.useCallback(
    (durationSeconds: number, intention?: string) => {
      if (!roomId) return;
      if (!socket) return;
      socket.emit("session:start", { roomId, durationSeconds, intention });
    },
    [roomId, socket]
  );

  const end = React.useCallback(
    (reason?: EndReason) => {
      if (!roomId) return;
      if (!socket) return;
      socket.emit("session:end", { roomId, reason });
    },
    [roomId, socket]
  );

  return { start, end };
}

