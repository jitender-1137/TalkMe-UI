import apiClient from "../client"
import type { ApiResponse } from "../types"

export type ProfileViewType = "PROFILE" | "PROFILE_IMAGE"

export interface ProfileViewViewer {
  id: string
  name: string
  username: string
  avatar?: string
  gender?: string
}

export interface ProfileView {
  viewer: ProfileViewViewer
  lastViewedAt: string
  viewCount: number
  viewType: ProfileViewType
  seen: boolean
}

export interface ProfileViewCount {
  total: number
  unseen: number
}

export const ProfileViewsService = {
  /** Record that the current user opened {viewedUserId}'s profile / photo. Best-effort. */
  record: async (viewedUserId: string, type: ProfileViewType = "PROFILE"): Promise<void> => {
    await apiClient.post<ApiResponse<void>>(`/profile-views/${viewedUserId}`, undefined, {
      params: { type },
    })
  },

  /** Who recently viewed my profile (most recent first). */
  list: async (): Promise<ProfileView[]> => {
    const response = await apiClient.get<ApiResponse<ProfileView[]>>(`/profile-views`)
    return response.data.data ?? []
  },

  /** Total + unseen viewer counts (for the badge). */
  count: async (): Promise<ProfileViewCount> => {
    const response = await apiClient.get<ApiResponse<ProfileViewCount>>(`/profile-views/count`)
    return response.data.data ?? { total: 0, unseen: 0 }
  },

  /** Clear the "new viewers" badge. */
  markSeen: async (): Promise<void> => {
    await apiClient.post<ApiResponse<void>>(`/profile-views/mark-seen`)
  },
}
