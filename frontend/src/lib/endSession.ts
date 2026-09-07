import { getSocket } from "@/lib/socket";
import { useRoomStore } from "@/stores/useRoomStore";
import { endSession as endSessionApi } from "@/services/sessions";

export type EndReason = "completed" | "manual" | "tab_switch";

/**
 * Single funnel for every session-end path (natural completion, manual end, tab-switch),
 * callable from any mounted screen (focus room or breakout) since session state lives in
 * the shared store rather than component state.
 */
export async function endActiveSession(reason: EndReason, opts: { backendToken?: string } = {}): Promise<void> {
  const before = useRoomStore.getState();
  if (!before.sessionActive) return;

  const roomId = before.roomId;
  before.stopSession();

  const socket = getSocket();
  if (roomId && socket) socket.emit("session:end", { roomId, reason });

  const state = useRoomStore.getState();
  if (state.sessionId && opts.backendToken) {
    try {
      await endSessionApi(
        state.sessionId,
        {
          ended_at: new Date().toISOString(),
          focus_seconds: state.focusSecondsAccrued,
          social_seconds: state.socialSecondsAccrued,
          end_reason: reason
        },
        opts.backendToken
      );
    } catch {
      /* non-blocking */
    }
  }
}
