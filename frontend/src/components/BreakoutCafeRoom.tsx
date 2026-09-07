"use client";

import * as React from "react";
import { useRoomSocket } from "@/hooks/useRoomSocket";
import { useRoomChat } from "@/hooks/useRoomChat";
import { useRoomStore } from "@/stores/useRoomStore";
import { BreakoutVoicePanel } from "@/components/BreakoutVoicePanel";

function Cloud({ top, left, scale = 1, opacity = 1 }: { top: string; left: string; scale?: number; opacity?: number }) {
  const w = 150 * scale;
  const h = 52 * scale;
  return (
    <div style={{ position: "absolute", top, left, width: w, height: h, opacity }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "rgba(255,255,255,0.85)",
          borderRadius: 999,
          position: "relative",
          boxShadow: "0 10px 26px rgba(0,0,0,0.10)"
        }}
      >
        <div style={{ position: "absolute", left: "18%", top: "-45%", width: "44%", height: "95%", borderRadius: "50%", background: "rgba(255,255,255,0.85)" }} />
        <div style={{ position: "absolute", left: "48%", top: "-35%", width: "50%", height: "85%", borderRadius: "50%", background: "rgba(245,245,245,0.85)" }} />
      </div>
    </div>
  );
}

function SkyWindow() {
  return (
    <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", border: "6px solid rgba(20,30,40,0.55)" }}>
      <div
        style={{
          height: 260,
          background: "linear-gradient(180deg, #9AD6F4 0%, #BEEBFF 45%, #D9F7F0 100%)",
          position: "relative"
        }}
      >
        <Cloud top="18%" left="10%" scale={1.05} opacity={0.95} />
        <Cloud top="38%" left="48%" scale={0.8} opacity={0.8} />

        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 10, background: "rgba(0,0,0,0.18)" }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 10, background: "rgba(0,0,0,0.18)" }} />
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 8, transform: "translateX(-50%)", background: "rgba(0,0,0,0.18)" }} />
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 8, transform: "translateY(-50%)", background: "rgba(0,0,0,0.18)" }} />
      </div>

      <div style={{ height: 14, background: "rgba(20,30,40,0.55)" }} />
    </div>
  );
}

function Lamp({ left }: { left: string }) {
  return (
    <div style={{ position: "absolute", top: 0, left }}>
      <div style={{ width: 2, height: 80, background: "rgba(0,0,0,0.35)", margin: "0 auto" }} />
      <div
        style={{
          width: 140,
          height: 44,
          borderRadius: "999px 999px 14px 14px",
          background: "linear-gradient(180deg, #C7C17A 0%, #A9A55F 100%)",
          boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
          position: "relative"
        }}
      >
        <div style={{ position: "absolute", inset: 0, borderRadius: "999px 999px 14px 14px", boxShadow: "inset 0 2px 0 rgba(255,255,255,0.35)" }} />
      </div>
      <div
        style={{
          width: 190,
          height: 74,
          marginLeft: -25,
          marginTop: -6,
          background: "radial-gradient(closest-side, rgba(255,230,150,0.35), rgba(255,230,150,0) 70%)"
        }}
      />
    </div>
  );
}

function ActiveDot({ active }: { active: boolean }) {
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: active ? "rgba(94,207,202,1)" : "rgba(255,255,255,0.18)",
        boxShadow: active ? "0 0 10px rgba(94,207,202,0.7)" : "none",
        display: "inline-block"
      }}
    />
  );
}

export function BreakoutCafeRoom({ roomId }: { roomId: string }) {
  const { socket } = useRoomSocket(roomId);
  const presence = useRoomStore((s) => s.presence);
  const { messages, send, activeMap } = useRoomChat({ roomId, socket: (socket as never) ?? null });

  const [tab, setTab] = React.useState<"chat" | "voice">("chat");
  const [draft, setDraft] = React.useState("");
  const [voiceOpen, setVoiceOpen] = React.useState(false);

  const listRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  const now = Date.now();
  const isActive = (ts?: string) => {
    if (!ts) return false;
    const t = Date.parse(ts);
    if (!Number.isFinite(t)) return false;
    return now - t < 20_000;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #F3B2A2 0%, #F6D2C7 30%, #E9C6DD 60%, #DDE8FF 100%)",
        position: "relative",
        overflow: "hidden"
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,0.34), rgba(255,255,255,0) 40%)" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1160, margin: "0 auto", padding: "26px 20px 40px" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
          <div>
            <div style={{ letterSpacing: "0.22em", fontSize: 12, opacity: 0.65 }}>NETWORKING MODE</div>
            <div style={{ fontFamily: "Playfair Display, serif", fontSize: 38, lineHeight: 1.05 }}>Breakout Café</div>
            <div style={{ opacity: 0.7, marginTop: 6 }}>{presence.length} in breakout</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button type="button" className="btn-secondary" onClick={() => setTab("chat")}>
              Chat
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setTab("voice");
                setVoiceOpen(true);
              }}
            >
              Voice
            </button>
          </div>
        </header>

        <div style={{ position: "relative", borderRadius: 22, overflow: "hidden", border: "1px solid rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.35)" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.18))" }} />

          <Lamp left="14%" />
          <Lamp left="44%" />
          <Lamp left="74%" />

          <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1.25fr 0.95fr", gap: 18, padding: 18 }}>
            {/* Scene */}
            <div style={{ borderRadius: 18, overflow: "hidden", background: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.6)" }}>
              <div style={{ padding: 16 }}>
                <SkyWindow />

                <div style={{ display: "flex", gap: 14, marginTop: 16, alignItems: "stretch" }}>
                  <div style={{ flex: 1, borderRadius: 16, background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.7)", padding: 14 }}>
                    <div style={{ fontFamily: "Playfair Display, serif", fontSize: 18, marginBottom: 8 }}>Tables</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {presence.slice(0, 8).map((p) => (
                        <div
                          key={p.id}
                          style={{
                            borderRadius: 999,
                            padding: "8px 10px",
                            border: "1px solid rgba(0,0,0,0.06)",
                            background: "rgba(255,255,255,0.75)",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            minWidth: 0
                          }}
                        >
                          <span style={{ fontSize: 16 }}>{p.emoji || "☕"}</span>
                          <span style={{ fontSize: 13, opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                          <ActiveDot active={isActive(activeMap[p.id])} />
                        </div>
                      ))}
                    </div>
                    <div style={{ opacity: 0.6, marginTop: 10, fontSize: 12 }}>
                      Active dot = someone chatted in the last ~20s.
                    </div>
                  </div>

                  <div style={{ width: 220, borderRadius: 16, background: "rgba(230,140,110,0.35)", border: "1px solid rgba(255,255,255,0.55)", padding: 14 }}>
                    <div style={{ fontFamily: "Playfair Display, serif", fontSize: 20, marginBottom: 8 }}>Coffee</div>
                    <div
                      style={{
                        height: 92,
                        borderRadius: 14,
                        background: "linear-gradient(180deg, rgba(140,60,40,0.55), rgba(120,40,30,0.35))",
                        border: "1px solid rgba(0,0,0,0.08)",
                        display: "grid",
                        placeItems: "center",
                        color: "rgba(255,255,255,0.9)",
                        letterSpacing: "0.08em",
                        fontWeight: 700
                      }}
                    >
                      COFFEE
                    </div>
                    <div style={{ opacity: 0.65, marginTop: 10, fontSize: 12 }}>Lean in. Say hi. Join voice when you’re ready.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Networking panel */}
            <div style={{ borderRadius: 18, overflow: "hidden", background: "rgba(10,15,22,0.52)", border: "1px solid rgba(255,255,255,0.18)", backdropFilter: "blur(10px)" }}>
              <div style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,0.14)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: "Playfair Display, serif", fontSize: 20, color: "rgba(255,255,255,0.92)" }}>
                    {tab === "chat" ? "Chat" : "Voice"}
                  </div>
                  <div style={{ opacity: 0.65, fontSize: 12, color: "rgba(255,255,255,0.9)" }}>{tab === "chat" ? "Be present. Be kind." : "Optional voice corner"}</div>
                </div>
              </div>

              {tab === "chat" ? (
                <>
                  <div ref={listRef} style={{ padding: 14, height: 360, overflow: "auto", display: "grid", gap: 10 }}>
                    {messages.length === 0 ? (
                      <div style={{ opacity: 0.7, color: "rgba(255,255,255,0.9)", fontStyle: "italic" }}>No messages yet. Say hi ☕</div>
                    ) : (
                      messages.map((m) => (
                        <div key={m.id} style={{ display: "flex", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.16)", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
                            <span style={{ fontSize: 16 }}>{m.user.emoji || "💬"}</span>
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, opacity: 0.75, color: "rgba(255,255,255,0.95)" }}>
                              {m.user.name} <span style={{ opacity: 0.55, marginLeft: 6 }}>{new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.92)", whiteSpace: "pre-wrap" }}>{m.text}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div style={{ padding: 14, borderTop: "1px solid rgba(255,255,255,0.14)", display: "flex", gap: 10 }}>
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          send(draft);
                          setDraft("");
                        }
                      }}
                      placeholder="Say something…"
                      style={{
                        flex: 1,
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.18)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        color: "rgba(255,255,255,0.92)",
                        outline: "none"
                      }}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        send(draft);
                        setDraft("");
                      }}
                    >
                      Send
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ padding: 14 }}>
                  <p style={{ color: "rgba(255,255,255,0.85)", opacity: 0.9, marginTop: 0 }}>
                    Join voice to see who’s speaking and who’s unmuted.
                  </p>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ width: "100%" }}
                    onClick={() => setVoiceOpen(true)}
                  >
                    Open voice
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <BreakoutVoicePanel roomName={roomId} open={voiceOpen} onClose={() => setVoiceOpen(false)} />
    </div>
  );
}

