"use client";

import * as React from "react";
import { useRoomStore, type RoomMode } from "@/stores/useRoomStore";

export function ModeToggle({ onChange }: { onChange?: (mode: RoomMode) => void }) {
  const mode = useRoomStore((s) => s.mode);
  const switchMode = useRoomStore((s) => s.switchMode);

  const set = (next: RoomMode) => {
    switchMode(next);
    onChange?.(next);
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button
        type="button"
        className="dur-btn"
        style={{ padding: "8px 14px", borderRadius: 999, opacity: mode === "focus" ? 1 : 0.7 }}
        onClick={() => set("focus")}
      >
        Focus
      </button>
      <button
        type="button"
        className="dur-btn"
        style={{ padding: "8px 14px", borderRadius: 999, opacity: mode === "social" ? 1 : 0.7 }}
        onClick={() => set("social")}
      >
        Social
      </button>
    </div>
  );
}

