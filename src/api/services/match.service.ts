import apiClient from "../client"
import { ENDPOINTS } from "../endpoints"
import { unwrapResponse } from "../response-handler"
import type { MatchFilters } from "../types/social.types"

export interface MatchSessionResponse {
  id: string // session UUID
  partner: {
    id: string
    name: string
    username: string
    avatar?: string | null
    interests: string[]
    gender?: string | null
    country?: string | null
    city?: string | null
    isGuest?: boolean | null
  }
  chatId: string // stranger chat room UUID
  isActive: boolean
}

export const MatchService = {
  /** Start stranger matchmaking. */
  startMatching: async (filters: MatchFilters): Promise<MatchSessionResponse | null> => {
    const payload = {
      gender: filters.gender === "any" ? "" : filters.gender,
      ageMin: filters.ageRange?.[0] ?? 18,
      ageMax: filters.ageRange?.[1] ?? 99,
      region: filters.region === "global" ? "" : filters.region,
      interests: filters.interests ? filters.interests.join(",") : "",
    }
    const response = await apiClient.post<{
      success: boolean
      message: string
      data: MatchSessionResponse | null
      timestamp: string
    }>(ENDPOINTS.MATCH.START, payload)
    return unwrapResponse(response)
  },

  /** Cancel matchmaking queue. */
  cancelMatching: async (): Promise<void> => {
    await apiClient.delete(ENDPOINTS.MATCH.CANCEL)
  },

  /** Fetch current active match session. */
  getActiveSession: async (): Promise<MatchSessionResponse | null> => {
    const response = await apiClient.get<{
      success: boolean
      message: string
      data: MatchSessionResponse | null
      timestamp: string
    }>(ENDPOINTS.MATCH.SESSION)
    return unwrapResponse(response)
  },

  /** Skip current matched stranger and find next. */
  skipStranger: async (): Promise<MatchSessionResponse | null> => {
    const response = await apiClient.post<{
      success: boolean
      message: string
      data: MatchSessionResponse | null
      timestamp: string
    }>(ENDPOINTS.MATCH.SKIP)
    return unwrapResponse(response)
  },

  /** End the current match session. */
  endMatching: async (): Promise<void> => {
    await apiClient.post(ENDPOINTS.MATCH.END)
  },

  /** Report the current stranger. */
  reportStranger: async (reason: string, details?: string): Promise<void> => {
    await apiClient.post(ENDPOINTS.MATCH.REPORT, { reason, details: details || "" })
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
