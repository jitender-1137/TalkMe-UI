import apiClient from "../client"
import { ENDPOINTS } from "../endpoints"
import { unwrapResponse } from "../response-handler"
import type { MatchFilters, MatchSession } from "../types/social.types"

export const MatchService = {
  /** Start stranger matching queue. */
  startMatching: async (filters: MatchFilters): Promise<MatchSession> => {
    const response = await apiClient.post<{
      success: boolean
      message: string
      data: MatchSession
      timestamp: string
    }>(ENDPOINTS.MATCH.START, { filters })
    return unwrapResponse(response)
  },

  /** Cancel matching queue. */
  cancelMatching: async (): Promise<void> => {
    await apiClient.delete(ENDPOINTS.MATCH.CANCEL)
  },

  /** Skip current matched stranger. */
  skipStranger: async (): Promise<void> => {
    await apiClient.post(ENDPOINTS.MATCH.SKIP)
  },

  /** Report the current stranger. */
  reportStranger: async (reason: string): Promise<void> => {
    await apiClient.post(ENDPOINTS.MATCH.REPORT, { reason })
  },

  /** Block the current stranger. */
  blockStranger: async (): Promise<void> => {
    await apiClient.post(ENDPOINTS.MATCH.BLOCK)
  },

  /** Fetch count of online matching users. */
  getOnlineMatchCount: async (): Promise<number> => {
    try {
      const response = await apiClient.get<{
        success: boolean
        message: string
        data: { count?: number }
        timestamp: string
      }>(ENDPOINTS.MATCH.ONLINE_COUNT)
      const unwrapped = unwrapResponse(response)
      return unwrapped?.count ?? 0
    } catch (error) {
      return 0
    }
  },
}
