import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AuthButtons } from "@/components/AuthButtons";

export default async function LoginPage() {
  const session = await getServerSession(authOptions).catch(() => null);
  if (session) redirect("/");

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "0 24px" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 44, marginBottom: 8 }}>focusroom</h1>
        <p style={{ opacity: 0.8, marginBottom: 22 }}>Sign in to enter a room.</p>
        <AuthButtons />
      </div>
    </main>
  );
}
