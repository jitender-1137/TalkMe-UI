import apiClient from "../client"
import { ENDPOINTS } from "../endpoints"
import { unwrapResponse } from "../response-handler"
import type { ApiResponse } from "../types/api.types"

export type InstallationType = "BROWSER" | "PWA" | "IOS_HOME"

export interface SavePushSubscriptionPayload {
  endpoint: string
  p256dh: string
  auth: string
  installationType?: InstallationType
}

export const PushService = {
  /** VAPID public key needed by the browser to create a push subscription. */
  getVapidPublicKey: async (): Promise<string> => {
    const res = await apiClient.get<ApiResponse<{ publicKey: string }>>(
      ENDPOINTS.PUSH.VAPID_PUBLIC_KEY,
    )
    return unwrapResponse(res)?.publicKey ?? ""
  },

  /** Persist a push subscription on the backend. */
  subscribe: async (payload: SavePushSubscriptionPayload): Promise<void> => {
    await apiClient.post(ENDPOINTS.PUSH.SUBSCRIBE, payload)
  },

  /** Remove a push subscription by endpoint. */
  unsubscribe: async (endpoint: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.PUSH.UNSUBSCRIBE, { params: { endpoint } })
  },

  /** Report how the user is accessing the app (BROWSER / PWA / IOS_HOME). */
  updateInstallation: async (installationType: InstallationType): Promise<void> => {
    await apiClient.put(ENDPOINTS.PUSH.INSTALLATION, { installationType })
  },

  /** Authoritative unread total (recomputed server-side). */
  getUnreadCount: async (): Promise<number> => {
    try {
      const res = await apiClient.get<ApiResponse<{ totalUnread?: number }>>(
        ENDPOINTS.PUSH.UNREAD_COUNT,
      )
      return unwrapResponse(res)?.totalUnread ?? 0
    } catch {
      return 0
    }
  },

}
