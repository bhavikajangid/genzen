import { apiFetch } from "./api"

export interface SessionCreateIn {
  room_name: string
  started_at: string
}

export interface SessionEndIn {
  ended_at: string
  duration_seconds?: number
  reflection?: string
}

export interface SessionOut {
  id: string
  room_id: string
  owner_id: string
  started_at: string
  ended_at?: string
  duration_seconds?: number
  reflection?: string
}

export async function createSession(payload: SessionCreateIn, token?: string): Promise<SessionOut> {
  return apiFetch("/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  })
}

export async function getSessions(token?: string): Promise<SessionOut[]> {
  return apiFetch("/sessions", { token })
}

export async function endSession(sessionId: string, payload: SessionEndIn, token?: string): Promise<SessionOut> {
  return apiFetch(`/sessions/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  })
}
