"use client";

import * as React from "react";
import { useSession, signOut } from "next-auth/react";
import { FocusStatBadge } from "@/components/FocusStatBadge";

export function DashboardClient() {
  const { data } = useSession();
  const backendToken = (data as any)?.backendToken as string | undefined;

  return (
    <main style={{ minHeight: "100vh", maxWidth: 900, margin: "0 auto", padding: "0 24px 80px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
          padding: "28px 0 40px",
          borderBottom: "1px solid var(--border-soft)",
          marginBottom: 48
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {data?.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.user.image}
              alt=""
              width={48}
              height={48}
              style={{ borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }}
            />
          ) : (
            <span style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--surface-hover)", border: "1px solid var(--border)" }} />
          )}
          <div>
            <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 34, color: "var(--text)", margin: "0 0 6px" }}>Dashboard</h1>
            <p style={{ color: "var(--text-muted)", margin: 0 }}>{data?.user?.name ?? data?.user?.email ?? "Signed in"}</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <a href="/friends" className="btn-secondary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            Friends
          </a>
          <button type="button" className="btn-secondary" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign out
          </button>
        </div>
      </div>

      <section>
        <p className="section-label">Today</p>
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 18,
            padding: 28,
            background: "var(--surface)"
          }}
        >
          <p style={{ color: "var(--text-muted)", margin: "0 0 14px" }}>Focused today</p>
          <FocusStatBadge token={backendToken} style={{ border: "none", background: "transparent", padding: 0 }} />
          <p style={{ color: "var(--text-dim)", margin: "14px 0 0" }}>Counts focus time recorded on completed or ended sessions.</p>
        </div>
      </section>
    </main>
  );
}

