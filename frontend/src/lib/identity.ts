export type Identity = { id: string; name: string; emoji?: string };

const KEY = "userIdentity";

export function getIdentity(): Identity {
  if (typeof window === "undefined") return { id: "anon", name: "Anonymous", emoji: "🧑‍💻" };

  const existing = window.localStorage.getItem(KEY);
  if (existing) {
    try {
      const parsed = JSON.parse(existing) as Identity;
      if (parsed.id && parsed.name) return parsed;
    } catch {
      /* fall through to regenerate */
    }
  }

  const next: Identity = { id: crypto.randomUUID(), name: "You", emoji: "🧑‍💻" };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
