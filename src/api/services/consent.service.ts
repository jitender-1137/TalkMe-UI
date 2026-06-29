import apiClient from "../client"
import { ENDPOINTS } from "@/src/api"
import { unwrapResponse } from "@/src/api"
import type { ConsentState } from "../types/consent.types"

type Envelope = { success: boolean; message: string; data: ConsentState; timestamp: string }

export const ConsentService = {
  /** Current explicit-content consent state for a chat. */
  getState: async (chatId: string): Promise<ConsentState> => {
    const res = await apiClient.get<Envelope>(ENDPOINTS.MESSAGES.CONSENT_STATE(chatId))
    return unwrapResponse(res)
  },

  /** Ask the other participant to allow exchanging mature content (one request only). */
  requestConsent: async (chatId: string): Promise<ConsentState> => {
    const res = await apiClient.post<Envelope>(ENDPOINTS.MESSAGES.CONSENT_REQUEST(chatId))
    return unwrapResponse(res)
  },

  /** Accept a pending consent request → future explicit messages flow for both. */
  acceptConsent: async (chatId: string): Promise<ConsentState> => {
    const res = await apiClient.post<Envelope>(ENDPOINTS.MESSAGES.CONSENT_ACCEPT(chatId))
    return unwrapResponse(res)
  },

  /** Decline a pending consent request. */
  declineConsent: async (chatId: string): Promise<ConsentState> => {
    const res = await apiClient.post<Envelope>(ENDPOINTS.MESSAGES.CONSENT_DECLINE(chatId))
    return unwrapResponse(res)
  },

  /** Turn previously-granted consent back off (reset to default). */
  revokeConsent: async (chatId: string): Promise<ConsentState> => {
    const res = await apiClient.post<Envelope>(ENDPOINTS.MESSAGES.CONSENT_REVOKE(chatId))
    return unwrapResponse(res)
  },
}
