import apiClient from "../client"
import { ENDPOINTS } from "../endpoints"
import { unwrapResponse } from "../response-handler"
import type { PresenceStatus } from "../types/user.types"

export interface UserPresence {
  userId: string
  status: PresenceStatus
  lastSeen: string | null
}

export const PresenceService = {
  /** Fetch presence status for a user. */
  getUserPresence: async (userId: string): Promise<UserPresence> => {
    const response = await apiClient.get<{
      success: boolean
      message: string
      data: UserPresence
      timestamp: string
    }>(ENDPOINTS.PRESENCE.STATUS(userId))
    return unwrapResponse(response)
  },

  /** Fetch presence status in bulk for multiple user IDs. */
  getBulkPresence: async (userIds: string[]): Promise<UserPresence[]> => {
    const response = await apiClient.post<{
      success: boolean
      message: string
      data: UserPresence[]
      timestamp: string
    }>(ENDPOINTS.PRESENCE.BULK, { userIds })
    return unwrapResponse(response)
  },

  /** Update own presence status. */
  updatePresence: async (
    status: PresenceStatus,
    invisibleMode?: boolean
  ): Promise<UserPresence> => {
    const response = await apiClient.put<{
      success: boolean
      message: string
      data: UserPresence
      timestamp: string
    }>(ENDPOINTS.PRESENCE.UPDATE, { status, invisibleMode })
    return unwrapResponse(response)
  },

  /** Signal start typing in a specific chat. */
  startTyping: async (chatId: string): Promise<void> => {
    await apiClient.post(ENDPOINTS.PRESENCE.TYPING_START(chatId))
  },

  /** Signal stop typing in a specific chat. */
  stopTyping: async (chatId: string): Promise<void> => {
    await apiClient.post(ENDPOINTS.PRESENCE.TYPING_STOP(chatId))
  },
}
