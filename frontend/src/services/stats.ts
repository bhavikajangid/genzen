import { apiFetch } from "./api"

export interface MeStatsOut {
  focused_seconds_today: number
}

export async function getMyStats(token?: string): Promise<MeStatsOut> {
  return apiFetch("/me/stats", { token })
}
