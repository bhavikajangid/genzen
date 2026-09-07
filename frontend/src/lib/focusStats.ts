const STORAGE_KEY = "focusroom:focus_stats_v1";

type FocusStats = {
  // YYYY-MM-DD -> seconds focused
  byDay: Record<string, number>;
};

function todayKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function readStats(): FocusStats {
  if (typeof window === "undefined") return { byDay: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { byDay: {} };
    const parsed = JSON.parse(raw) as FocusStats;
    if (!parsed || typeof parsed !== "object") return { byDay: {} };
    if (!parsed.byDay || typeof parsed.byDay !== "object") return { byDay: {} };
    return parsed;
  } catch {
    return { byDay: {} };
  }
}

function writeStats(next: FocusStats) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function addFocusedSeconds(seconds: number, now = new Date()) {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  const stats = readStats();
  const key = todayKey(now);
  stats.byDay[key] = (stats.byDay[key] ?? 0) + Math.floor(seconds);
  writeStats(stats);
}

export function getFocusedSecondsToday(now = new Date()) {
  const stats = readStats();
  return stats.byDay[todayKey(now)] ?? 0;
}

