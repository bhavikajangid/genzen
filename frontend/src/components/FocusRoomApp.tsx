"use client";

import * as React from "react";
import { BackgroundMedia } from "@/components/BackgroundMedia";
import { PresenceIndicator } from "@/components/PresenceIndicator";
import { ModeToggle } from "@/components/ModeToggle";
import { useRoomStore } from "@/stores/useRoomStore";
import { useRoomSocket } from "@/hooks/useRoomSocket";
import { useSessionSync } from "@/hooks/useSessionSync";

type Screen = "intention" | "room" | "reflection";

const avatarColors = [
  "rgba(77,217,192,0.15)",
  "rgba(240,122,160,0.15)",
  "rgba(200,169,110,0.15)",
  "rgba(120,180,255,0.15)",
  "rgba(180,120,255,0.15)",
  "rgba(255,200,100,0.15)"
];

const initialPeople = [
  { name: "you", emoji: "🧑‍💻", mins: 0, isYou: true },
  { name: "Priya", emoji: "👩‍🎨", mins: 12 },
  { name: "Arjun", emoji: "👨‍💻", mins: 27 },
  { name: "Sam", emoji: "🧑‍🔬", mins: 8 },
  { name: "Nadia", emoji: "👩‍💼", mins: 34 },
  { name: "Leo", emoji: "🧑‍🎓", mins: 5 }
] as const;

export function FocusRoomApp() {
  const [screen, setScreen] = React.useState<Screen>("intention");
  const [intention, setIntention] = React.useState("");
  const [selectedDuration, setSelectedDuration] = React.useState(50);

  const [totalSeconds, setTotalSeconds] = React.useState(50 * 60);
  const [secondsLeft, setSecondsLeft] = React.useState(50 * 60);
  const timerRef = React.useRef<number | null>(null);
  const totalSecondsRef = React.useRef(50 * 60);

  const [doorKey, setDoorKey] = React.useState(0);
  const [inSession, setInSession] = React.useState(false);
  const roomId = useRoomStore((s) => s.roomId);
  const setRoomId = useRoomStore((s) => s.setRoomId);
  const mode = useRoomStore((s) => s.mode);

  const [people, setPeople] = React.useState(() => initialPeople.map((p) => ({ ...p })));
  const [onlineCount, setOnlineCount] = React.useState(12);

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
    const id = window.setInterval(() => {
      const base = 12;
      const delta = Math.floor(Math.random() * 3) - 1;
      setOnlineCount(Math.max(8, base + delta));
    }, 8000);
    return () => window.clearInterval(id);
  }, []);

  React.useEffect(() => {
    if (screen !== "room") return;

    timerRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) return 0;
        const next = prev - 1;
        if (next % 60 === 0) {
          setPeople((peoplePrev) =>
            peoplePrev.map((p) => (p.isYou ? p : { ...p, mins: p.mins + 1 }))
          );
        }
        return next;
      });
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

    setPeople(initialPeople.map((p) => ({ ...p })));
    setScreen("room");
    setInSession(true);
    setDoorKey((k) => k + 1);

    const nextRoomId = roomId ?? "deep-work";
    if (!roomId) setRoomId(nextRoomId);
    if (socket) socket.emit("session:start", { roomId: nextRoomId, durationSeconds: nextTotal, intention: nextIntention });
  };

  const endSession = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setScreen("reflection");
    setInSession(false);
    sessionSync.end();
  };

  const finishReflection = () => {
    setIntention("");
    setSelectedDuration(50);
    setScreen("intention");
    setInSession(false);
    setRoomId(null);
  };

  return (
    <>
      <BackgroundMedia inSession={inSession} doorKey={doorKey} />
      <div className="ambient" aria-hidden="true" />

      <div className="app">
        <nav>
          <span className="nav-brand">The Library</span>
          <div className="nav-status">
            <div className="pulse-dot" />
            <span>{onlineCount} people focused now</span>
          </div>
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
            <ModeToggle
              onChange={(next) => {
                if (!roomId || !socket) return;
                socket.emit("room:mode", { roomId, mode: next });
              }}
            />
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
              {people.map((p, i) => {
                const elapsedMins = Math.floor((totalSeconds - secondsLeft) / 60);
                const mins = p.isYou ? elapsedMins : p.mins;
                return (
                  <div key={`${p.name}-${i}`} className="person-card active-focus">
                    <div className="avatar" style={{ background: avatarColors[i % avatarColors.length] }}>
                      <span aria-hidden="true">{p.emoji}</span>
                      {!p.isYou ? <div className="avatar-ring" /> : null}
                    </div>
                    <span className="person-name">{p.name}</span>
                    <span className="person-time">{mins}m</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="divider" />

          <div className="room-actions">
            <button type="button" className="btn-secondary">
              {progressPct}% done
            </button>
            <button type="button" className="btn-end" onClick={endSession}>
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
