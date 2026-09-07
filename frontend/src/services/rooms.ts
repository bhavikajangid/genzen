import { apiFetch } from "./api"

export interface RoomOut {
  id: string
  name: string
  mode: string
}

export async function getOrCreateRoom(name: string, token?: string): Promise<RoomOut> {
  return apiFetch("/rooms/get-or-create", {
    method: "POST",
    body: JSON.stringify({ name }),
    token,
  })
}

export interface RoomMessageOut {
  id: string
  room_id: string
  user_id: string
  user_name?: string
  user_emoji?: string
  content: string
  created_at: string
}

export async function listRoomMessages(roomName: string, token?: string): Promise<RoomMessageOut[]> {
  return apiFetch(`/rooms/${encodeURIComponent(roomName)}/messages`, { token })
}
