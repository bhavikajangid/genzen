"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { LiveKitRoom, AudioConference } from "@livekit/components-react";

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

async function fetchToken(roomName: string) {
  const identity = getIdentity();
  const qs = new URLSearchParams({
    room: roomName,
    id: identity.id,
    name: identity.name,
    emoji: identity.emoji ?? ""
  });
  const res = await fetch(`/api/rooms/token?${qs.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Token request failed (${res.status})`);
  }
  return (await res.json()) as { token: string; url?: string };
}

export function LiveKitBreakoutRoom({ roomName }: { roomName: string }) {
  const { data, error } = useQuery({
    queryKey: ["livekit-token", roomName],
    queryFn: () => fetchToken(roomName),
    staleTime: 30_000
  });

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? data?.url;
  if (!serverUrl) {
    return (
      <div style={{ maxWidth: 720, margin: "80px auto", padding: "0 24px" }}>
        <h1 style={{ fontFamily: "Playfair Display, serif" }}>Breakout room</h1>
        <p style={{ opacity: 0.8 }}>
          Set <code>NEXT_PUBLIC_LIVEKIT_URL</code> (or return <code>url</code> from backend) to connect.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 720, margin: "80px auto", padding: "0 24px" }}>
        <h1 style={{ fontFamily: "Playfair Display, serif" }}>Breakout room</h1>
        <p style={{ opacity: 0.8 }}>{String(error.message ?? error)}</p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", zIndex: 3, maxWidth: 980, margin: "0 auto", padding: "0 24px 80px" }}>
      <h1 style={{ paddingTop: 28, marginBottom: 16, fontFamily: "Playfair Display, serif" }}>{roomName}</h1>

      <LiveKitRoom token={data?.token} serverUrl={serverUrl} connect={!!data?.token}>
        <AudioConference />
      </LiveKitRoom>
    </div>
  );
}
