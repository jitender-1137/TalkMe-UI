import apiClient from "../client"
import { ENDPOINTS } from "../endpoints"
import { unwrapResponse } from "../response-handler"
import { compressImage } from "@/lib/upload/compress-image"
import type { User, UpdateProfilePayload, PrivacySettings, AppSettings, BlockedUser } from "../types"

export const UserService = {
  /** Fetch the current user's full profile. */
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<{ success: boolean; message: string; data: User; timestamp: string }>(
      ENDPOINTS.USERS.PROFILE,
    )
    return unwrapResponse(response)
  },

  /** Update profile fields (name, bio, phone, avatar). */
  updateProfile: async (payload: UpdateProfilePayload): Promise<User> => {
    const response = await apiClient.patch<{ success: boolean; message: string; data: User; timestamp: string }>(
      ENDPOINTS.USERS.UPDATE_PROFILE,
      payload,
    )
    return unwrapResponse(response)
  },

  /** Upload a new avatar. Expects a FormData with a `file` field. */
  uploadAvatar: async (file: File): Promise<{ url: string }> => {
    // Avatars are images → compress in the browser before upload (no-op if the
    // file is already small or compression wouldn't help).
    const compressed = await compressImage(file, { maxEdge: 512 })
    const formData = new FormData()
    formData.append("file", compressed)
    const response = await apiClient.post<{ success: boolean; message: string; data: { url?: string; avatarUrl?: string }; timestamp: string }>(
      ENDPOINTS.USERS.AVATAR,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    )
    const data = unwrapResponse(response)
    return { url: data.url || data.avatarUrl || "" }
  },

  /** Search for users by name or email. */
  searchUsers: async (query: string): Promise<User[]> => {
    const response = await apiClient.get<{ success: boolean; message: string; data: User[]; timestamp: string }>(
      ENDPOINTS.USERS.SEARCH,
      { params: { q: query } },
    )
    return unwrapResponse(response)
  },

  /** Fetch a user by ID. */
  getUserById: async (userId: string): Promise<User> => {
    const response = await apiClient.get<{ success: boolean; message: string; data: User; timestamp: string }>(
      ENDPOINTS.USERS.BY_ID(userId),
    )
    return unwrapResponse(response)
  },

  /** Block a user. */
  blockUser: async (userId: string): Promise<void> => {
    await apiClient.post(ENDPOINTS.USERS.BLOCK(userId))
  },

  /** Unblock a user. */
  unblockUser: async (userId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.USERS.UNBLOCK(userId))
  },

  /** Report a user. */
  reportUser: async (userId: string, reason: string, description: string): Promise<void> => {
    await apiClient.post(ENDPOINTS.USERS.REPORT(userId), { reason, description })
  },

  /** Fetch the list of blocked users. */
  getBlockedUsers: async (): Promise<BlockedUser[]> => {
    const response = await apiClient.get<{ success: boolean; message: string; data: BlockedUser[]; timestamp: string }>(
      ENDPOINTS.USERS.BLOCKED,
    )
    return unwrapResponse(response)
  },

  /** Fetch privacy settings. */
  getPrivacySettings: async (): Promise<PrivacySettings> => {
    const response = await apiClient.get<{ success: boolean; message: string; data: PrivacySettings; timestamp: string }>(
      ENDPOINTS.SETTINGS.PRIVACY,
    )
    return unwrapResponse(response)
  },

  /** Update privacy settings. */
  updatePrivacySettings: async (settings: Partial<PrivacySettings>): Promise<PrivacySettings> => {
    const response = await apiClient.patch<{ success: boolean; message: string; data: PrivacySettings; timestamp: string }>(
      ENDPOINTS.SETTINGS.UPDATE_PRIVACY,
      settings,
    )
    return unwrapResponse(response)
  },

  /** Fetch app-level settings (theme, language, etc.). */
  getAppSettings: async (): Promise<AppSettings> => {
    const response = await apiClient.get<{ success: boolean; message: string; data: AppSettings; timestamp: string }>(
      ENDPOINTS.SETTINGS.GET,
    )
    return unwrapResponse(response)
  },

  /** Update app-level settings. */
  updateAppSettings: async (settings: Partial<AppSettings>): Promise<AppSettings> => {
    const response = await apiClient.patch<{ success: boolean; message: string; data: AppSettings; timestamp: string }>(
      ENDPOINTS.SETTINGS.UPDATE,
      settings,
    )
    return unwrapResponse(response)
  },

  /** Fetch all online lobby users. */
  getLobbyUsers: async (): Promise<User[]> => {
    const response = await apiClient.get<{ success: boolean; message: string; data: User[]; timestamp: string }>(
      "/users/lobby",
    )
    return unwrapResponse(response)
  },
}
