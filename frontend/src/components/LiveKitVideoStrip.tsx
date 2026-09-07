"use client";

import { useQuery } from "@tanstack/react-query";
import { LiveKitRoom, GridLayout, ParticipantTile, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { fetchLiveKitToken } from "@/lib/livekit";

function CameraGrid() {
  const tracks = useTracks([Track.Source.Camera]);
  if (tracks.length === 0) {
    return <p style={{ color: "var(--text-muted)", fontSize: 13, padding: "12px 0" }}>Camera on — waiting for others to join in.</p>;
  }
  return (
    <GridLayout tracks={tracks} style={{ height: 220 }}>
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

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? data?.url;
  if (error) {
    return <p style={{ color: "var(--text-muted)", fontSize: 13 }}>{String((error as Error).message ?? error)}</p>;
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
