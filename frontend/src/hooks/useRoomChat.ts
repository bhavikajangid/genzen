"use client";

import * as React from "react";
import type { Socket } from "socket.io-client";

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

export function useRoomChat({ roomId, socket }: { roomId: string; socket: ChatSocket | null }) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [activeMap, setActiveMap] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setMessages([]);
    setActiveMap({});
  }, [roomId]);

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

