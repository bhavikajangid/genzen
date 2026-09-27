import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

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

  const session = await getServerSession(authOptions).catch(() => null);
  const backendToken = (session as any)?.backendToken as string | undefined;

  const authed = Boolean(backendToken);
  const body = authed
    ? { room_name: room }
    : {
        room_name: room,
        user_id: guestId || undefined,
        user_name: guestName || undefined,
        emoji: guestEmoji || undefined
      };

  let res: Response;
  try {
    res = await fetch(target, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(backendToken ? { authorization: `Bearer ${backendToken}` } : {}),
        ...(!authed && guestId ? { "x-guest-id": encodeURIComponent(guestId) } : {}),
        ...(!authed && guestName ? { "x-guest-name": encodeURIComponent(guestName) } : {}),
        ...(!authed && guestEmoji ? { "x-guest-emoji": encodeURIComponent(guestEmoji) } : {})
      },
      body: JSON.stringify(body)
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Could not reach backend at ${target}: ${(err as Error).message}` },
      { status: 502 }
    );
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
