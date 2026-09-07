"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import {
  acceptFriendRequest,
  getFriends,
  getPendingFriendRequests,
  sendFriendRequest,
  type Friend,
  type PendingRequest
} from "@/services/friends";

const cardStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 18,
  padding: 18,
  background: "rgba(255,255,255,0.06)"
};

export function FriendsClient() {
  const { data: session } = useSession();
  const token = (session as any)?.backendToken as string | undefined;

  const [friends, setFriends] = React.useState<Friend[]>([]);
  const [pending, setPending] = React.useState<PendingRequest[]>([]);
  const [addUserId, setAddUserId] = React.useState("");
  const [status, setStatus] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    if (!token) return;
    try {
      const [f, p] = await Promise.all([getFriends(token), getPendingFriendRequests(token)]);
      setFriends(f.friends);
      setPending(p.pending);
    } catch {
      setStatus("Couldn't load friends right now.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = addUserId.trim();
    if (!userId || !token) return;
    setStatus(null);
    try {
      const res = await sendFriendRequest(userId, token);
      setStatus(res.status === "pending" ? "Request sent." : `Status: ${res.status}`);
      setAddUserId("");
      await refresh();
    } catch {
      setStatus("Couldn't send that request.");
    }
  };

  const handleAccept = async (userId: string) => {
    if (!token) return;
    try {
      await acceptFriendRequest(userId, token);
      await refresh();
    } catch {
      setStatus("Couldn't accept that request.");
    }
  };

  if (!token) {
    return (
      <main style={{ minHeight: "100vh", maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
        <p style={{ opacity: 0.75 }}>Sign in to manage friends.</p>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 34, marginBottom: 4 }}>Friends</h1>
      <p style={{ opacity: 0.7, marginTop: 0 }}>Add friends by their account ID and see who&apos;s requested you.</p>

      <form onSubmit={handleAdd} style={{ display: "flex", gap: 10, margin: "20px 0" }}>
        <input
          className="input-field"
          value={addUserId}
          onChange={(e) => setAddUserId(e.target.value)}
          placeholder="Friend's user ID"
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn-primary">
          Send request
        </button>
      </form>

      {status ? <p style={{ opacity: 0.75, fontSize: 13 }}>{status}</p> : null}

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>Pending requests</h2>
        <div style={cardStyle}>
          {loading ? (
            <p style={{ opacity: 0.65, margin: 0 }}>Loading…</p>
          ) : pending.length === 0 ? (
            <p style={{ opacity: 0.65, margin: 0 }}>No pending requests.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
              {pending.map((p) => (
                <li key={p.user_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span>{p.name}</span>
                  <button type="button" className="btn-secondary" onClick={() => handleAccept(p.user_id)}>
                    Accept
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>Your friends</h2>
        <div style={cardStyle}>
          {loading ? (
            <p style={{ opacity: 0.65, margin: 0 }}>Loading…</p>
          ) : friends.length === 0 ? (
            <p style={{ opacity: 0.65, margin: 0 }}>No friends yet.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
              {friends.map((f) => (
                <li key={f.id}>{f.name}</li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
