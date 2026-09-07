"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyStats } from "@/services/stats";

export function FocusStatBadge({ token, style }: { token?: string; style?: React.CSSProperties }) {
  const { data } = useQuery({
    queryKey: ["me-stats"],
    queryFn: () => getMyStats(token),
    enabled: !!token,
    staleTime: 10_000,
    refetchInterval: 30_000
  });

  if (!token) return null;

  const minutes = Math.floor((data?.focused_seconds_today ?? 0) / 60);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        padding: "8px 14px",
        borderRadius: 12,
        border: "1px solid var(--border-soft)",
        background: "var(--surface)",
        ...style
      }}
    >
      <span style={{ fontSize: 20, fontFamily: "Playfair Display, serif" }}>{minutes}</span>
      <span style={{ fontSize: 12, opacity: 0.7, letterSpacing: 0.4, textTransform: "uppercase" }}>min focused today</span>
    </div>
  );
}
