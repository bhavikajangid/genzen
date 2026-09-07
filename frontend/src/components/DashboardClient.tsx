"use client";

import * as React from "react";
import { useSession, signOut } from "next-auth/react";
import { getFocusedSecondsToday } from "@/lib/focusStats";

export function DashboardClient() {
  const { data } = useSession();
  const [minutes, setMinutes] = React.useState(0);

  React.useEffect(() => {
    const update = () => setMinutes(Math.floor(getFocusedSecondsToday() / 60));
    update();
    const id = window.setInterval(update, 5000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <main style={{ minHeight: "100vh", maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {data?.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.user.image}
              alt=""
              width={44}
              height={44}
              style={{ borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.18)" }} />
          )}
          <div>
            <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 34, marginBottom: 4 }}>Dashboard</h1>
            <p style={{ opacity: 0.75, margin: 0 }}>{data?.user?.name ?? data?.user?.email ?? "Signed in"}</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <a href="/friends" className="btn-secondary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            Friends
          </a>
          <button type="button" className="btn-secondary" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign out
          </button>
        </div>
      </div>

      <section style={{ marginTop: 28 }}>
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 18,
            padding: 18,
            background: "rgba(255,255,255,0.06)"
          }}
        >
          <p style={{ opacity: 0.75, marginTop: 0, marginBottom: 6 }}>Focused today</p>
          <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: "-0.02em" }}>
            {minutes} <span style={{ fontSize: 18, opacity: 0.75 }}>min</span>
          </div>
          <p style={{ opacity: 0.65, marginBottom: 0 }}>Counts time while you’re in a session on this device.</p>
        </div>
      </section>
    </main>
  );
}

