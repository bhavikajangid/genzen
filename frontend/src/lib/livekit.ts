import { getIdentity } from "@/lib/identity";

export async function fetchLiveKitToken(roomName: string) {
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
