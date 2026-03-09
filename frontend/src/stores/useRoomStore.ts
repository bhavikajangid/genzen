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
  setRoomId: (roomId: string | null) => void;
  setMode: (mode: RoomMode) => void;
  setPresence: (presence: PresenceUser[]) => void;
};

export const useRoomStore = create<RoomState>((set) => ({
  roomId: null,
  mode: "focus",
  presence: [],
  setRoomId: (roomId) => set({ roomId }),
  setMode: (mode) => set({ mode }),
  setPresence: (presence) => set({ presence })
}));

