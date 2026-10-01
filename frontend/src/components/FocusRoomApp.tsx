"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { BackgroundMedia } from "@/components/BackgroundMedia";
import { PresenceIndicator } from "@/components/PresenceIndicator";
import { ModeToggle } from "@/components/ModeToggle";
import { AuthButtons } from "@/components/AuthButtons";
import { useRoomStore } from "@/stores/useRoomStore";
import { useRoomSocket } from "@/hooks/useRoomSocket";
import { useSessionSync } from "@/hooks/useSessionSync";
import { createSession, endSession as endSessionRequest } from "@/services/sessions";
import { endActiveSession, type EndReason } from "@/lib/endSession";
import { getIdentity } from "@/lib/identity";
import { FocusStatBadge } from "@/components/FocusStatBadge";
import { LiveKitVideoStrip } from "@/components/LiveKitVideoStrip";

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
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const backendToken = (session as any)?.backendToken as string | undefined;

  const [screen, setScreen] = React.useState<Screen>(() => (useRoomStore.getState().sessionActive ? "room" : "intention"));
  const [intentionDraft, setIntentionDraft] = React.useState("");
  const [selectedDuration, setSelectedDuration] = React.useState(50);
  const [reflection, setReflection] = React.useState("");
  const sessionStartedAtRef = React.useRef<string | null>(null);
  const lastEndReasonRef = React.useRef<EndReason>("completed");

  const [doorKey, setDoorKey] = React.useState(0);
  const roomId = useRoomStore((s) => s.roomId);
  const mode = useRoomStore((s) => s.mode);
  const presence = useRoomStore((s) => s.presence);
  const intention = useRoomStore((s) => s.intention);
  const sessionActive = useRoomStore((s) => s.sessionActive);
  const activeSessionId = useRoomStore((s) => s.sessionId);
  const totalSeconds = useRoomStore((s) => s.sessionTotalSeconds);
  const secondsLeft = useRoomStore((s) => s.sessionSecondsLeft);
  const startSession = useRoomStore((s) => s.startSession);
  const setTick = useRoomStore((s) => s.setTick);
  const setSessionId = useRoomStore((s) => s.setSessionId);
  const resetSession = useRoomStore((s) => s.resetSession);
  const cameraOn = useRoomStore((s) => s.cameraOn);
  const setCameraOn = useRoomStore((s) => s.setCameraOn);
  const inSession = screen === "room" && sessionActive;

  const [ownId, setOwnId] = React.useState<string | null>(null);
  React.useEffect(() => {
    setOwnId(getIdentity().id);
  }, []);

  const { socket } = useRoomSocket(inSession ? roomId : null);
  useSessionSync({
    roomId,
    socket: (socket as never) ?? null,
    enabled: inSession,
    onTick: ({ secondsLeft: nextLeft, totalSeconds: nextTotal }) => {
      if (typeof nextLeft === "number") setTick(nextLeft, nextTotal);
    }
  });

  const endSessionAndShowReflection = React.useCallback(
    (reason: EndReason) => {
      lastEndReasonRef.current = reason;
      setScreen("reflection");
      void endActiveSession(reason, { backendToken }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["me-stats"] });
      });
    },
    [backendToken, queryClient]
  );

  const breakoutRoomName = React.useMemo(() => {
    const base = roomId ?? "deep-work";
    return `breakout-${base}`;
  }, [roomId]);

  const formattedTime = React.useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [secondsLeft]);

  React.useEffect(() => {
    if (screen !== "room") return;
    if (!sessionActive) return;
    if (secondsLeft > 0) return;

    endSessionAndShowReflection("completed");
  }, [screen, sessionActive, secondsLeft, endSessionAndShowReflection]);

  React.useEffect(() => {
    if (screen !== "room") return;
    document.title = `${formattedTime} · focusroom`;
    return () => {
      document.title = "focusroom";
    };
  }, [screen, formattedTime]);

  const progressPct = React.useMemo(() => {
    const done = totalSeconds - secondsLeft;
    if (totalSeconds <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((done / totalSeconds) * 100)));
  }, [totalSeconds, secondsLeft]);

  const enterRoom = () => {
    const nextIntention = intentionDraft.trim() || "Focused work";
    const nextTotal = selectedDuration * 60;
    const nextRoomId = roomId ?? "deep-work";

    startSession({ roomId: nextRoomId, sessionId: null, intention: nextIntention, totalSeconds: nextTotal });
    setScreen("room");
    setDoorKey((k) => k + 1);

    if (socket) socket.emit("session:start", { roomId: nextRoomId, durationSeconds: nextTotal, intention: nextIntention });

    if (backendToken) {
      const startedAt = new Date().toISOString();
      sessionStartedAtRef.current = startedAt;
      createSession({ room_name: nextRoomId, started_at: startedAt }, backendToken)
        .then((s) => setSessionId(s.id))
        .catch(() => {/* non-blocking */});
    }
  };

  const finishReflection = () => {
    const state = useRoomStore.getState();
    if (state.sessionId && backendToken && reflection.trim()) {
      endSessionRequest(
        state.sessionId,
        {
          ended_at: new Date().toISOString(),
          focus_seconds: state.focusSecondsAccrued,
          social_seconds: state.socialSecondsAccrued,
          end_reason: lastEndReasonRef.current,
          reflection: reflection.trim()
        },
        backendToken
      ).catch(() => {/* non-blocking */});
    }

    setIntentionDraft("");
    setReflection("");
    setSelectedDuration(50);
    sessionStartedAtRef.current = null;
    setScreen("intention");
    resetSession();
  };

  return (
    <>
      <BackgroundMedia inSession={inSession} doorKey={doorKey} />
      <div className="ambient" aria-hidden="true" />

      <div className="app" style={cameraOn && screen === "room" ? { maxWidth: 1100 } : undefined}>
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
                value={intentionDraft}
                onChange={(e) => setIntentionDraft(e.target.value)}
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

            <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
              <FocusStatBadge token={backendToken} />
            </div>
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
                className="dur-btn"
                style={{ padding: "8px 14px", borderRadius: 999, opacity: cameraOn ? 1 : 0.7 }}
                onClick={() => setCameraOn(!cameraOn)}
              >
                {cameraOn ? "📷 Camera on" : "📷 Turn on camera"}
              </button>
              <ModeToggle
                onChange={(next) => {
                  if (roomId && socket) socket.emit("room:mode", { roomId, mode: next });
                  if (next === "social") router.push(`/breakout/${encodeURIComponent(breakoutRoomName)}`);
                }}
              />
            </div>
          </div>

          {cameraOn && roomId ? <LiveKitVideoStrip roomName={roomId} enabled={cameraOn} /> : null}

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
            <button type="button" className="btn-end" onClick={() => endSessionAndShowReflection("manual")}>
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
