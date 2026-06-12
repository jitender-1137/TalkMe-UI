import apiClient from "../client"
import { ENDPOINTS } from "../endpoints"
import { unwrapResponse } from "../response-handler"
import type { AppSettings, PrivacySettings } from "../types"

export const SettingsService = {
  /** Fetch all application settings. */
  getSettings: async (): Promise<AppSettings> => {
    const response = await apiClient.get<{
      success: boolean
      message: string
      data: AppSettings
      timestamp: string
    }>(ENDPOINTS.SETTINGS.GET)
    return unwrapResponse(response)
  },

  /** Update application settings. */
  updateSettings: async (settings: Partial<AppSettings>): Promise<AppSettings> => {
    const response = await apiClient.patch<{
      success: boolean
      message: string
      data: AppSettings
      timestamp: string
    }>(ENDPOINTS.SETTINGS.UPDATE, settings)
    return unwrapResponse(response)
  },

  /** Fetch privacy settings. */
  getPrivacySettings: async (): Promise<PrivacySettings> => {
    const response = await apiClient.get<{
      success: boolean
      message: string
      data: PrivacySettings
      timestamp: string
    }>(ENDPOINTS.SETTINGS.PRIVACY)
    return unwrapResponse(response)
  },

  /** Update privacy settings. */
  updatePrivacySettings: async (
    settings: Partial<PrivacySettings>,
  ): Promise<PrivacySettings> => {
    const response = await apiClient.patch<{
      success: boolean
      message: string
      data: PrivacySettings
      timestamp: string
    }>(ENDPOINTS.SETTINGS.UPDATE_PRIVACY, settings)
    return unwrapResponse(response)
  },
}
