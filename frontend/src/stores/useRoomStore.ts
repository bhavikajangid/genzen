import { create } from "zustand";

export type RoomMode = "focus" | "social";

type PresenceUser = {
  id: string;
  name: string;
  emoji?: string;
};

type RoomState = {
  roomId: string | null;
  mode: RoomMode;
  presence: PresenceUser[];

  sessionActive: boolean;
  sessionId: string | null;
  intention: string;
  sessionTotalSeconds: number;
  sessionSecondsLeft: number;

  /** Dual-clock accumulators: seconds spent in each mode during the active session. */
  focusSecondsAccrued: number;
  socialSecondsAccrued: number;
  /** epoch ms when the current mode's bucket started accruing; null when no session is active. */
  bucketStartedAt: number | null;

  cameraOn: boolean;

  setRoomId: (roomId: string | null) => void;
  setMode: (mode: RoomMode) => void;
  setPresence: (presence: PresenceUser[]) => void;
  setSessionId: (sessionId: string | null) => void;
  setCameraOn: (on: boolean) => void;

  startSession: (opts: { roomId: string; sessionId: string | null; intention: string; totalSeconds: number }) => void;
  setTick: (secondsLeft: number, totalSeconds?: number) => void;
  /** Flushes elapsed time into the outgoing mode's bucket, then switches mode and resets the bucket clock. */
  switchMode: (next: RoomMode) => void;
  /** Adds elapsed-since-bucketStartedAt into the current mode's accumulator; call before ending a session too. */
  accrueBucket: () => void;
  /** Flushes the final bucket and marks the session inactive, but keeps sessionId/intention/accumulators for the reflection screen. */
  stopSession: () => void;
  /** Clears all session/room state, e.g. after reflection is submitted. */
  resetSession: () => void;
};

export const useRoomStore = create<RoomState>((set, get) => ({
  roomId: null,
  mode: "focus",
  presence: [],

  sessionActive: false,
  sessionId: null,
  intention: "",
  sessionTotalSeconds: 0,
  sessionSecondsLeft: 0,

  focusSecondsAccrued: 0,
  socialSecondsAccrued: 0,
  bucketStartedAt: null,

  cameraOn: false,

  setRoomId: (roomId) => set({ roomId }),
  setMode: (mode) => set({ mode }),
  setPresence: (presence) => set({ presence }),
  setSessionId: (sessionId) => set({ sessionId }),
  setCameraOn: (on) => set({ cameraOn: on }),

  startSession: ({ roomId, sessionId, intention, totalSeconds }) =>
    set({
      roomId,
      sessionId,
      intention,
      mode: "focus",
      sessionActive: true,
      sessionTotalSeconds: totalSeconds,
      sessionSecondsLeft: totalSeconds,
      focusSecondsAccrued: 0,
      socialSecondsAccrued: 0,
      bucketStartedAt: Date.now()
    }),

  setTick: (secondsLeft, totalSeconds) =>
    set((s) => ({
      sessionSecondsLeft: secondsLeft,
      sessionTotalSeconds: typeof totalSeconds === "number" && totalSeconds > 0 ? totalSeconds : s.sessionTotalSeconds
    })),

  accrueBucket: () => {
    const { bucketStartedAt, mode } = get();
    if (bucketStartedAt == null) return;
    const now = Date.now();
    const elapsed = Math.max(0, Math.floor((now - bucketStartedAt) / 1000));
    if (elapsed === 0) {
      set({ bucketStartedAt: now });
      return;
    }
    set((s) => ({
      focusSecondsAccrued: mode === "focus" ? s.focusSecondsAccrued + elapsed : s.focusSecondsAccrued,
      socialSecondsAccrued: mode === "social" ? s.socialSecondsAccrued + elapsed : s.socialSecondsAccrued,
      bucketStartedAt: now
    }));
  },

  switchMode: (next) => {
    get().accrueBucket();
    set({ mode: next });
  },

  stopSession: () => {
    get().accrueBucket();
    set({ sessionActive: false, bucketStartedAt: null, cameraOn: false });
  },

  resetSession: () =>
    set({
      sessionActive: false,
      sessionId: null,
      intention: "",
      roomId: null,
      mode: "focus",
      sessionTotalSeconds: 0,
      sessionSecondsLeft: 0,
      focusSecondsAccrued: 0,
      socialSecondsAccrued: 0,
      bucketStartedAt: null,
      cameraOn: false
    })
}));
