"use client";

import * as React from "react";
import type { Socket } from "socket.io-client";
import { listRoomMessages } from "@/services/rooms";

type ChatMessage = {
  id: string;
  roomId: string;
  text: string;
  ts: string;
  user: { id: string; name: string; emoji?: string };
};

type ChatSocket = Socket<
  { "chat:message": (payload: ChatMessage) => void },
  { "chat:send": (payload: { roomId: string; text: string }) => void }
>;

export function useRoomChat({ roomId, socket, token }: { roomId: string; socket: ChatSocket | null; token?: string }) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [activeMap, setActiveMap] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setMessages([]);
    setActiveMap({});
    if (!token) return;

    let cancelled = false;
    listRoomMessages(roomId, token)
      .then((history) => {
        if (cancelled) return;
        setMessages(
          history.map((m) => ({
            id: m.id,
            roomId: m.room_id,
            text: m.content,
            ts: m.created_at,
            user: { id: m.user_id, name: m.user_name ?? "Someone", emoji: m.user_emoji }
          }))
        );
      })
      .catch(() => {/* non-blocking */});

    return () => {
      cancelled = true;
    };
  }, [roomId, token]);

  React.useEffect(() => {
    if (!socket) return;

    const handler = (payload: ChatMessage) => {
      if (payload.roomId !== roomId) return;
      setMessages((prev) => (prev.length > 200 ? [...prev.slice(-180), payload] : [...prev, payload]));
      setActiveMap((prev) => ({ ...prev, [payload.user.id]: payload.ts }));
    };

    socket.on("chat:message", handler);
    return () => {
      socket.off("chat:message", handler);
    };
  }, [roomId, socket]);

  const send = React.useCallback(
    (text: string) => {
      const next = text.trim();
      if (!next) return;
      if (!socket) return;
      socket.emit("chat:send", { roomId, text: next });
    },
    [roomId, socket]
  );

  return { messages, send, activeMap };
}

