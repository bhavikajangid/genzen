import { apiFetch } from "./api"

export type Friend = { id: string; name: string }
export type PendingRequest = { user_id: string; name: string }

export async function getFriends(token?: string): Promise<{ friends: Friend[] }> {
  return apiFetch("/friends", { token })
}

export async function getPendingFriendRequests(token?: string): Promise<{ pending: PendingRequest[] }> {
  return apiFetch("/friends/pending", { token })
}

export async function sendFriendRequest(userId: string, token?: string) {
  return apiFetch("/friends/request", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
    token
  })
}

export async function acceptFriendRequest(requesterUserId: string, token?: string) {
  return apiFetch("/friends/accept", {
    method: "POST",
    body: JSON.stringify({ user_id: requesterUserId }),
    token
  })
}
