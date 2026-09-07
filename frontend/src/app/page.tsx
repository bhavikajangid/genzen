import { FocusRoomApp } from "@/components/FocusRoomApp";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function Page() {
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session) redirect("/login");
  return <FocusRoomApp />;
}
