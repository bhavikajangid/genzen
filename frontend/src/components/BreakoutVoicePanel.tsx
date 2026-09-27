"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import { fetchLiveKitToken } from "@/lib/livekit";

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
    queryFn: () => fetchLiveKitToken(roomName),
    enabled: open && joined,
    staleTime: 30_000
  });

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || data?.url;

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Breakout voice"
      style={{
        position: "fixed",
        right: 18,
        bottom: 18,
        width: "min(720px, calc(100vw - 36px))",
        maxHeight: "min(78vh, 760px)",
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

      {!joined ? (
        <button
          type="button"
          className="btn-primary"
          style={{ width: "100%", marginTop: 8 }}
          onClick={() => setJoined(true)}
        >
          Join voice
        </button>
      ) : null}

      {joined && !isLoading && !error && !serverUrl ? (
        <p style={{ opacity: 0.75, marginTop: 10 }}>Set `NEXT_PUBLIC_LIVEKIT_URL` (or return `url` from backend) to connect.</p>
      ) : null}

      {joined && isLoading ? <p style={{ opacity: 0.75, marginTop: 10 }}>Preparing breakout…</p> : null}
      {joined && error ? <p style={{ opacity: 0.8, marginTop: 10 }}>{String((error as any)?.message ?? error)}</p> : null}

      {joined && serverUrl && data?.token ? (
        <div style={{ height: "min(60vh, 520px)" }}>
          <LiveKitRoom
            token={data.token}
            serverUrl={serverUrl}
            connect={true}
            video
            audio
            onDisconnected={() => {
              setJoined(false);
              onClose();
            }}
          >
            <VideoConference />
          </LiveKitRoom>
        </div>
      ) : null}
    </div>
  );
}
