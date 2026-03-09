"use client";

import * as React from "react";
import { useRoomStore } from "@/stores/useRoomStore";

export function PresenceIndicator() {
  const presence = useRoomStore((s) => s.presence);

  if (presence.length === 0) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {presence.slice(0, 6).map((u) => (
          <div
            key={u.id}
            title={u.name}
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: "var(--surface)",
              border: "1px solid var(--border-soft)"
            }}
          >
            <span aria-hidden="true">{u.emoji ?? "🧑‍💻"}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "var(--text-muted)" }}>
        {presence.length} in room
      </div>
    </div>
  );
}

