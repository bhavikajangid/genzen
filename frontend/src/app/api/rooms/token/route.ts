import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const room = url.searchParams.get("room") ?? "";
  const guestId = url.searchParams.get("id") ?? "";
  const guestName = url.searchParams.get("name") ?? "";
  const guestEmoji = url.searchParams.get("emoji") ?? "";

  const backendBase = process.env.BACKEND_URL;
  if (!backendBase) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set. Point this route to your FastAPI /rooms/token endpoint." },
      { status: 501 }
    );
  }

  const target = new URL("/rooms/token", backendBase);

  const incomingAuth = req.headers.get("authorization");
  const res = await fetch(target, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(incomingAuth ? { authorization: incomingAuth } : {}),
      ...(guestId ? { "x-guest-id": guestId } : {}),
      ...(guestName ? { "x-guest-name": guestName } : {}),
      ...(guestEmoji ? { "x-guest-emoji": guestEmoji } : {})
    },
    body: JSON.stringify({ room_name: room, user_id: guestId || undefined, user_name: guestName || undefined, emoji: guestEmoji || undefined })
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
