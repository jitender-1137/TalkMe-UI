import apiClient from "../client"
import { ENDPOINTS } from "../endpoints"
import { unwrapResponse, unwrapPaginatedResponse } from "../response-handler"
import type { Notification, NotificationSettings } from "../types"

export const NotificationService = {
  /** Fetch the current user's notifications. */
  getNotifications: async (): Promise<Notification[]> => {
    const response = await apiClient.get<{
      success: boolean
      message: string
      data: any
      timestamp: string
    }>(ENDPOINTS.NOTIFICATIONS.LIST)
    const paginated = unwrapPaginatedResponse<Notification>(response)
    return paginated.items
  },

  /** Mark a notification as read. */
  markAsRead: async (notificationId: string): Promise<void> => {
    await apiClient.patch(ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId))
  },

  /** Mark all notifications as read. */
  markAllAsRead: async (): Promise<void> => {
    await apiClient.patch(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ)
  },

  /** Delete a notification. */
  deleteNotification: async (notificationId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.NOTIFICATIONS.DELETE(notificationId))
  },

  /** Fetch notification settings. */
  getSettings: async (): Promise<NotificationSettings> => {
    const response = await apiClient.get<{
      success: boolean
      message: string
      data: NotificationSettings
      timestamp: string
    }>(ENDPOINTS.NOTIFICATIONS.SETTINGS)
    return unwrapResponse(response)
  },

  /** Update notification settings. */
  updateSettings: async (
    settings: Partial<NotificationSettings>,
  ): Promise<NotificationSettings> => {
    const response = await apiClient.patch<{
      success: boolean
      message: string
      data: NotificationSettings
      timestamp: string
    }>(ENDPOINTS.NOTIFICATIONS.UPDATE_SETTINGS, settings)
    return unwrapResponse(response)
  },
}
