"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { BackgroundMedia } from "@/components/BackgroundMedia";
import { PresenceIndicator } from "@/components/PresenceIndicator";
import { ModeToggle } from "@/components/ModeToggle";
import { AuthButtons } from "@/components/AuthButtons";
import { useRoomStore } from "@/stores/useRoomStore";
import { useRoomSocket } from "@/hooks/useRoomSocket";
import { useSessionSync } from "@/hooks/useSessionSync";
import { createSession, endSession } from "@/services/sessions";

type Screen = "intention" | "room" | "reflection";

const avatarColors = [
  "rgba(77,217,192,0.15)",
  "rgba(240,122,160,0.15)",
  "rgba(200,169,110,0.15)",
  "rgba(120,180,255,0.15)",
  "rgba(180,120,255,0.15)",
  "rgba(255,200,100,0.15)"
];

export function FocusRoomApp() {
  const router = useRouter();
  const { data: session } = useSession();
  const backendToken = (session as any)?.backendToken as string | undefined;

  const [screen, setScreen] = React.useState<Screen>("intention");
  const [intention, setIntention] = React.useState("");
  const [selectedDuration, setSelectedDuration] = React.useState(50);
  const [reflection, setReflection] = React.useState("");
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const sessionStartedAtRef = React.useRef<string | null>(null);

  const [totalSeconds, setTotalSeconds] = React.useState(50 * 60);
  const [secondsLeft, setSecondsLeft] = React.useState(50 * 60);
  const timerRef = React.useRef<number | null>(null);
  const totalSecondsRef = React.useRef(50 * 60);

  const [doorKey, setDoorKey] = React.useState(0);
  const [inSession, setInSession] = React.useState(false);
  const roomId = useRoomStore((s) => s.roomId);
  const setRoomId = useRoomStore((s) => s.setRoomId);
  const mode = useRoomStore((s) => s.mode);
  const presence = useRoomStore((s) => s.presence);

  const [ownId, setOwnId] = React.useState<string | null>(null);
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem("userIdentity");
      if (raw) setOwnId((JSON.parse(raw) as { id?: string }).id ?? null);
    } catch {
      /* ignore */
    }
  }, []);

  const { socket } = useRoomSocket(inSession ? roomId : null);
  const sessionSync = useSessionSync({
    roomId,
    socket: (socket as never) ?? null,
    enabled: inSession,
    onTick: ({ secondsLeft: nextLeft, totalSeconds: nextTotal }) => {
      if (typeof nextTotal === "number" && nextTotal > 0) {
        totalSecondsRef.current = nextTotal;
        setTotalSeconds(nextTotal);
      }
      if (typeof nextLeft === "number") setSecondsLeft(nextLeft);
    }
  });

  React.useEffect(() => {
    if (screen !== "room") return;

    timerRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [screen]);

  React.useEffect(() => {
    if (screen !== "room") return;
    if (secondsLeft > 0) return;

    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;

    setScreen("reflection");
    setInSession(false);
  }, [screen, secondsLeft]);

  const breakoutRoomName = React.useMemo(() => {
    const base = roomId ?? "deep-work";
    return `breakout-${base}`;
  }, [roomId]);

  const formattedTime = React.useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [secondsLeft]);

  const progressPct = React.useMemo(() => {
    const done = totalSecondsRef.current - secondsLeft;
    if (totalSecondsRef.current <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((done / totalSecondsRef.current) * 100)));
  }, [secondsLeft]);

  const enterRoom = () => {
    const nextIntention = intention.trim() || "Focused work";
    setIntention(nextIntention);

    const nextTotal = selectedDuration * 60;
    setTotalSeconds(nextTotal);
    totalSecondsRef.current = nextTotal;
    setSecondsLeft(nextTotal);

    setScreen("room");
    setInSession(true);
    setDoorKey((k) => k + 1);
    window.localStorage.setItem("focusroom:session_active", "1");

    const nextRoomId = roomId ?? "deep-work";
    if (!roomId) setRoomId(nextRoomId);
    if (socket) socket.emit("session:start", { roomId: nextRoomId, durationSeconds: nextTotal, intention: nextIntention });

    if (backendToken) {
      const startedAt = new Date().toISOString();
      sessionStartedAtRef.current = startedAt;
      createSession({ room_name: nextRoomId, started_at: startedAt }, backendToken)
        .then((s) => setActiveSessionId(s.id))
        .catch(() => {/* non-blocking */});
    }
  };

  const handleEndSession = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setScreen("reflection");
    setInSession(false);
    window.localStorage.setItem("focusroom:session_active", "0");
    sessionSync.end();
  };

  const finishReflection = () => {
    if (activeSessionId && backendToken) {
      const elapsed = totalSecondsRef.current - secondsLeft;
      endSession(
        activeSessionId,
        {
          ended_at: new Date().toISOString(),
          duration_seconds: Math.max(0, elapsed),
          reflection: reflection.trim() || undefined,
        },
        backendToken
      ).catch(() => {/* non-blocking */});
    }

    setIntention("");
    setReflection("");
    setSelectedDuration(50);
    setActiveSessionId(null);
    sessionStartedAtRef.current = null;
    setScreen("intention");
    setInSession(false);
    setRoomId(null);
    window.localStorage.setItem("focusroom:session_active", "0");
  };

  return (
    <>
      <BackgroundMedia inSession={inSession} doorKey={doorKey} />
      <div className="ambient" aria-hidden="true" />

      <div className="app">
        <nav>
          <span className="nav-brand">focusroom</span>
          {inSession ? (
            <div className="nav-status">
              <div className="pulse-dot" />
              <span>{presence.length} in this room</span>
            </div>
          ) : null}
          <AuthButtons />
        </nav>

        <div className={`screen ${screen === "intention" ? "active" : ""}`} id="screen-intention">
          <div className="intention-screen">
            <p className="screen-eyebrow">Before you begin</p>
            <h1 className="screen-title">
              Set your <em>intention</em>
            </h1>
            <p className="screen-sub">
              You&apos;re entering a quiet space. Others are here too — working in silence, held by the same rhythm. No cameras.
              No pressure. Just presence.
            </p>

            <div className="form-group">
              <label htmlFor="intentionInput">What are you working on?</label>
              <input
                className="input-field"
                id="intentionInput"
                type="text"
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                placeholder="e.g. Writing my newsletter draft…"
                maxLength={80}
              />
            </div>

            <div className="form-group">
              <label>Duration</label>
              <div className="duration-grid">
                {[25, 50, 90, 120].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    className={`dur-btn ${selectedDuration === mins ? "selected" : ""}`}
                    onClick={() => setSelectedDuration(mins)}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>

            <button type="button" className="btn-primary" onClick={enterRoom}>
              🔔 &nbsp; Enter the Room
            </button>
          </div>
        </div>

        <div className={`screen ${screen === "room" ? "active" : ""}`} id="screen-room">
          <div className="room-header">
            <div>
              <p className="room-label">Deep Work Room</p>
              <h2 className="room-name">Morning Session</h2>
            </div>
            <div className="timer-block">
              <div className="timer-display" id="timerDisplay">
                {formattedTime}
              </div>
              <div className="timer-label">remaining</div>
            </div>
          </div>

          <div className="intention-chip">
            <span className="ic-label">Your intention</span>
            <span>{intention || "—"}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
            <PresenceIndicator />
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  if (roomId && socket) socket.emit("room:mode", { roomId, mode: "social" });
                  router.push(`/breakout/${encodeURIComponent(breakoutRoomName)}`);
                }}
              >
                Breakout
              </button>
              <ModeToggle
                onChange={(next) => {
                  if (!roomId || !socket) return;
                  socket.emit("room:mode", { roomId, mode: next });
                }}
              />
            </div>
          </div>

          <div className="silence-bar">
            <span aria-hidden="true">🤫</span>
            <span className="silence-text">{mode === "focus" ? "Focus mode · chat disabled · you know others are here" : "Social mode · chat enabled · say hi"}</span>
            <div className="silence-waves" aria-hidden="true">
              <div className="wave-bar" style={{ ["--wt" as never]: "0.8s", ["--wh" as never]: "14px" }} />
              <div className="wave-bar" style={{ ["--wt" as never]: "1.1s", ["--wh" as never]: "9px", animationDelay: "0.2s" }} />
              <div className="wave-bar" style={{ ["--wt" as never]: "0.9s", ["--wh" as never]: "12px", animationDelay: "0.4s" }} />
              <div className="wave-bar" style={{ ["--wt" as never]: "1.3s", ["--wh" as never]: "6px", animationDelay: "0.1s" }} />
              <div className="wave-bar" style={{ ["--wt" as never]: "0.7s", ["--wh" as never]: "10px", animationDelay: "0.3s" }} />
            </div>
          </div>

          <div className="people-section">
            <p className="section-label">In this room</p>
            <div className="people-grid" id="peopleGrid">
              {presence.length === 0 ? (
                <p style={{ opacity: 0.6, fontSize: 13 }}>Just you for now.</p>
              ) : (
                presence.map((p, i) => {
                  const isYou = !!ownId && p.id === ownId;
                  const elapsedMins = Math.floor((totalSeconds - secondsLeft) / 60);
                  return (
                    <div key={p.id} className="person-card active-focus">
                      <div className="avatar" style={{ background: avatarColors[i % avatarColors.length] }}>
                        <span aria-hidden="true">{p.emoji || "🧑‍💻"}</span>
                        {!isYou ? <div className="avatar-ring" /> : null}
                      </div>
                      <span className="person-name">{isYou ? "you" : p.name}</span>
                      {isYou ? <span className="person-time">{elapsedMins}m</span> : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="divider" />

          <div className="room-actions">
            <button type="button" className="btn-secondary">
              {progressPct}% done
            </button>
            <button type="button" className="btn-end" onClick={handleEndSession}>
              End session
            </button>
          </div>
        </div>

        <div className={`screen ${screen === "reflection" ? "active" : ""}`} id="screen-reflection">
          <div className="intention-screen" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 14 }} aria-hidden="true">
              🔔
            </div>
            <p className="screen-eyebrow">Session complete</p>
            <h1 className="screen-title" style={{ marginBottom: 8 }}>
              Well done.
            </h1>
            <p className="screen-sub">Take a moment before you move on.</p>

            <div className="form-group" style={{ textAlign: "left" }}>
              <label htmlFor="reflectionInput">How did it go? (optional)</label>
              <textarea
                className="input-field"
                id="reflectionInput"
                rows={3}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="What did you accomplish? Any distractions?"
                maxLength={500}
                style={{ resize: "vertical" }}
              />
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={finishReflection}
              style={{ color: "var(--gold)", borderColor: "rgba(200,169,110,0.3)", background: "rgba(200,169,110,0.08)" }}
            >
              Close &amp; Rest 🌿
            </button>
          </div>
        </div>
      </div>

    </>
  );
}
