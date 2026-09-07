"use client";

import * as React from "react";
import { getProviders, signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function AuthButtons({ showSignOut = false }: { showSignOut?: boolean }) {
  const { data, status } = useSession();
  const authed = status === "authenticated";
  const [providers, setProviders] = React.useState<Record<string, { id: string; name: string }>>({});
  const router = useRouter();

  React.useEffect(() => {
    void getProviders().then((p) => setProviders((p ?? {}) as any)).catch(() => setProviders({}));
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {authed ? (
        <>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            aria-label="Open dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              cursor: "pointer"
            }}
          >
            {data?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.user.image}
                alt=""
                width={28}
                height={28}
                style={{ borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <span style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.18)" }} />
            )}
            <span style={{ opacity: 0.9, fontSize: 14 }}>
              {data?.user?.name ?? data?.user?.email ?? "Dashboard"}
            </span>
          </button>

          {showSignOut ? (
            <button type="button" className="btn-secondary" onClick={() => signOut()}>
              Sign out
            </button>
          ) : null}
        </>
      ) : (
        Object.values(providers).map((p) => (
          <button key={p.id} type="button" className="btn-secondary" onClick={() => signIn(p.id)}>
            Sign in with {p.name}
          </button>
        ))
      )}
    </div>
  );
}
