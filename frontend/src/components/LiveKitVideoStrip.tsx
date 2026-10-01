"use client";

import type { CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { LiveKitRoom, GridLayout, ParticipantTile, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { fetchLiveKitToken } from "@/lib/livekit";

const panelStyle: CSSProperties = {
  padding: "14px 20px",
  background: "var(--surface)",
  border: "1px solid var(--border-soft)",
  borderRadius: 12,
  color: "var(--text-muted)",
  fontSize: 13,
  marginBottom: 18
};

function CameraGrid() {
  const tracks = useTracks([Track.Source.Camera]);
  if (tracks.length === 0) {
    return <p style={panelStyle}>Camera on — waiting for others to join in.</p>;
  }
  return (
    <GridLayout tracks={tracks} style={{ height: "min(60vh, 560px)" }}>
      <ParticipantTile />
    </GridLayout>
  );
}

export function LiveKitVideoStrip({ roomName, enabled }: { roomName: string; enabled: boolean }) {
  const { data, error } = useQuery({
    queryKey: ["livekit-token", roomName],
    queryFn: () => fetchLiveKitToken(roomName),
    enabled,
    staleTime: 30_000
  });

  if (!enabled) return null;

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || data?.url;
  if (error) {
    return <p style={panelStyle}>{String((error as Error).message ?? error)}</p>;
  }
  if (!serverUrl || !data?.token) return null;

  return (
    <div style={{ marginBottom: 18 }}>
      <LiveKitRoom token={data.token} serverUrl={serverUrl} connect video audio={false}>
        <CameraGrid />
      </LiveKitRoom>
    </div>
  );
}
