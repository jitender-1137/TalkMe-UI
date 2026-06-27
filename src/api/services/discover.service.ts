import apiClient from "../client"
import { ENDPOINTS } from "../endpoints"
import { unwrapResponse, unwrapPaginatedResponse } from "../response-handler"
import type { DiscoverProfile, SuggestedPerson } from "../types/social.types"
import type { PaginatedResponse } from "../types/api.types"
import type { User } from "../types/user.types"

export interface DiscoverParams {
  q?: string
  interests?: string
  distance?: number
  verified?: boolean
  isOnline?: boolean
  cursor?: string
  limit?: number
  minAge?: number
  maxAge?: number
  gender?: string
  country?: string
}

export const DiscoverService = {
  /** Fetch profiles in Discovery. */
  getDiscoverProfiles: async (params?: DiscoverParams): Promise<PaginatedResponse<DiscoverProfile>> => {
    const response = await apiClient.get<{
      success: boolean
      message: string
      data: unknown
      timestamp: string
    }>(ENDPOINTS.DISCOVER.LIST, { params })
    // Backend returns { items, pagination:{ cursor, hasNext, ... } }; normalize to
    // the standard { items, meta } shape so callers (incl. infinite scroll) get
    // a reliable `meta.hasNextPage`.
    return unwrapPaginatedResponse<DiscoverProfile>(response)
  },

  /** Like a discover profile. */
  likeDiscoverProfile: async (userId: string): Promise<void> => {
    await apiClient.post(ENDPOINTS.DISCOVER.LIKE(userId))
  },

  /** Unlike a discover profile. */
  unlikeDiscoverProfile: async (userId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.DISCOVER.UNLIKE(userId))
  },

  /** Fetch mutual friends list with a user. */
  getMutualFriends: async (userId: string): Promise<{ count: number; users: User[] }> => {
    const response = await apiClient.get<{
      success: boolean
      message: string
      data: { count: number; users: User[] }
      timestamp: string
    }>(ENDPOINTS.DISCOVER.MUTUAL_FRIENDS(userId))
    return unwrapResponse(response)
  },

  /** Fetch suggested friends. */
  getSuggestedFriends: async (params?: { cursor?: string; limit?: number }): Promise<PaginatedResponse<SuggestedPerson>> => {
    const response = await apiClient.get<{
      success: boolean
      message: string
      data: PaginatedResponse<SuggestedPerson>
      timestamp: string
    }>(ENDPOINTS.DISCOVER.SUGGESTIONS, { params })
    return unwrapResponse(response)
  },
}
