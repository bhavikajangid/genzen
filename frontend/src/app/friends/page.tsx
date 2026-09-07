import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { FriendsClient } from "@/components/FriendsClient";

export default async function FriendsPage() {
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session) redirect("/login");

  return <FriendsClient />;
}
