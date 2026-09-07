"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DisconnectButton,
  LiveKitRoom,
  TrackToggle,
  useLocalParticipant,
  useParticipants
} from "@livekit/components-react";
import { Track } from "livekit-client";

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

function ParticipantRow({
  name,
  isSpeaking,
  micEnabled,
  self
}: {
  name: string;
  isSpeaking: boolean;
  micEnabled: boolean;
  self: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background: isSpeaking ? "rgba(94,207,202,0.10)" : "rgba(255,255,255,0.05)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.14)",
            display: "grid",
            placeItems: "center",
            fontSize: 12,
            flex: "0 0 auto"
          }}
        >
          {self ? "You" : name.slice(0, 1).toUpperCase()}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, opacity: 0.92, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {name} {self ? "(you)" : ""}
          </div>
          <div style={{ fontSize: 12, opacity: 0.65 }}>{isSpeaking ? "speaking" : "listening"}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: 0.9 }}>
        <span style={{ fontSize: 12 }}>{micEnabled ? "mic on" : "muted"}</span>
      </div>
    </div>
  );
}

function BreakoutInner() {
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();

  const rows = React.useMemo(() => {
    const list = participants.map((p) => ({
      sid: p.sid,
      name: p.name ?? "Anonymous",
      isSpeaking: Boolean((p as any).isSpeaking),
      micEnabled: Boolean((p as any).isMicrophoneEnabled),
      self: localParticipant?.sid === p.sid
    }));
    list.sort((a, b) => Number(b.isSpeaking) - Number(a.isSpeaking));
    return list;
  }, [participants, localParticipant?.sid]);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: "Playfair Display, serif", fontSize: 20 }}>Breakout voice</div>
          <div style={{ opacity: 0.7, fontSize: 13 }}>{participants.length} in breakout</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <TrackToggle
            source={Track.Source.Microphone}
            className="btn-secondary"
            style={{ padding: "8px 12px", borderRadius: 10 }}
          >
            {isMicrophoneEnabled ? "Mute" : "Unmute"}
          </TrackToggle>
          <DisconnectButton className="btn-secondary" style={{ padding: "8px 12px", borderRadius: 10 }}>
            Leave
          </DisconnectButton>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((r) => (
          <ParticipantRow key={r.sid} name={r.name} isSpeaking={r.isSpeaking} micEnabled={r.micEnabled} self={r.self} />
        ))}
      </div>
    </>
  );
}

export function BreakoutVoicePanel({
  roomName,
  open,
  onClose
}: {
  roomName: string;
  open: boolean;
  onClose: () => void;
}) {
  const [joined, setJoined] = React.useState(false);

  React.useEffect(() => {
    if (!open) setJoined(false);
  }, [open]);

  const { data, error, isLoading } = useQuery({
    queryKey: ["livekit-token", roomName],
    queryFn: () => fetchToken(roomName),
    enabled: open && joined,
    staleTime: 30_000
  });

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? data?.url;

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Breakout voice"
      style={{
        position: "fixed",
        right: 18,
        bottom: 18,
        width: "min(420px, calc(100vw - 36px))",
        maxHeight: "min(70vh, 680px)",
        overflow: "auto",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(10,15,22,0.72)",
        backdropFilter: "blur(10px)",
        padding: 14,
        zIndex: 50
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ opacity: 0.7, fontSize: 12 }}>Networking mode</div>
        <button type="button" className="btn-secondary" style={{ padding: "6px 10px", borderRadius: 10 }} onClick={onClose}>
          Close
        </button>
      </div>

      {!serverUrl ? (
        <p style={{ opacity: 0.75 }}>Set `NEXT_PUBLIC_LIVEKIT_URL` (or return `url` from backend) to connect.</p>
      ) : null}

      {!joined ? (
        <button
          type="button"
          className="btn-primary"
          style={{ width: "100%", marginTop: 8 }}
          onClick={() => setJoined(true)}
          disabled={!serverUrl}
        >
          Join voice
        </button>
      ) : null}

      {joined && isLoading ? <p style={{ opacity: 0.75, marginTop: 10 }}>Preparing breakout…</p> : null}
      {joined && error ? <p style={{ opacity: 0.8, marginTop: 10 }}>{String((error as any)?.message ?? error)}</p> : null}

      {joined && serverUrl && data?.token ? (
        <LiveKitRoom
          token={data.token}
          serverUrl={serverUrl}
          connect={true}
          onDisconnected={() => {
            setJoined(false);
            onClose();
          }}
        >
          <BreakoutInner />
        </LiveKitRoom>
      ) : null}
    </div>
  );
}
