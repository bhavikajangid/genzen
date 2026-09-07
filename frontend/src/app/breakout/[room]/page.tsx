import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { BreakoutCafeRoom } from "@/components/BreakoutCafeRoom";

export default async function BreakoutRoomPage({ params }: { params: Promise<{ room: string }> }) {
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session) redirect("/login");
  const { room } = await params;
  return <BreakoutCafeRoom roomId={decodeURIComponent(room)} />;
}
