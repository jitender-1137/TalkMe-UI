import apiClient from "../client"
import { ENDPOINTS } from "../endpoints"
import { unwrapResponse, unwrapPaginatedResponse } from "../response-handler"
import type {
  Message,
  SendMessagePayload,
  EditMessagePayload,
  ReactToMessagePayload,
  ForwardMessagePayload,
} from "../types"
import type { PaginatedResponse, PaginationParams } from "../types/api.types"

export const MessageService = {
  /** Fetch paginated messages for a chat. */
  getMessages: async (
    chatId: string,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<Message>> => {
    const response = await apiClient.get<{
      success: boolean
      message: string
      data: PaginatedResponse<Message>
      timestamp: string
    }>(ENDPOINTS.MESSAGES.LIST(chatId), { params })
    return unwrapPaginatedResponse(response)
  },

  /** Search paginated messages for a chat. */
  searchMessages: async (
    chatId: string,
    query: string,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<Message>> => {
    const response = await apiClient.get<{
      success: boolean
      message: string
      data: PaginatedResponse<Message>
      timestamp: string
    }>(ENDPOINTS.MESSAGES.SEARCH(chatId), { params: { query, ...params } })
    return unwrapPaginatedResponse(response)
  },

  /** Fetch a single message. */
  getMessageById: async (chatId: string, messageId: string): Promise<Message> => {
    const response = await apiClient.get<{ success: boolean; message: string; data: Message; timestamp: string }>(
      ENDPOINTS.MESSAGES.BY_ID(chatId, messageId),
    )
    return unwrapResponse(response)
  },

  /** Send a new message to a chat. */
  sendMessage: async (chatId: string, payload: SendMessagePayload): Promise<Message> => {
    // Map SendMessagePayload to what backend SendMessageRequest DTO expects
    const backendPayload: any = {
      content: payload.content,
      messageType: (payload.type || "TEXT").toUpperCase(),
      parentMessageId: payload.replyToId || null,
    }

    if (payload.media) {
      backendPayload.fileUrl = payload.media.url
      backendPayload.fileName = payload.media.fileName || null
      backendPayload.mimeType = payload.media.mimeType || null
      backendPayload.duration = payload.media.duration || null
      
      // Parse file size string (e.g., "1.24 MB") into bytes as a Long integer
      if (typeof payload.media.fileSize === "string") {
        const match = payload.media.fileSize.match(/^([\d.]+)\s*(KB|MB|GB|B)?$/i)
        if (match) {
          const val = parseFloat(match[1])
          const unit = (match[2] || "B").toUpperCase()
          const multiplier: Record<string, number> = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 }
          backendPayload.fileSize = Math.round(val * (multiplier[unit] || 1))
        } else {
          backendPayload.fileSize = null
        }
      } else {
        backendPayload.fileSize = payload.media.fileSize || null
      }
    }

    const response = await apiClient.post<{ success: boolean; message: string; data: Message; timestamp: string }>(
      ENDPOINTS.MESSAGES.SEND(chatId),
      backendPayload,
    )
    return unwrapResponse(response)
  },

  /** Edit an existing message. */
  editMessage: async (
    chatId: string,
    messageId: string,
    payload: EditMessagePayload,
  ): Promise<Message> => {
    const response = await apiClient.patch<{ success: boolean; message: string; data: Message; timestamp: string }>(
      ENDPOINTS.MESSAGES.EDIT(chatId, messageId),
      payload,
    )
    return unwrapResponse(response)
  },

  /** Delete a message. */
  deleteMessage: async (chatId: string, messageId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.MESSAGES.DELETE(chatId, messageId))
  },

  /** Add a reaction to a message. */
  reactToMessage: async (
    chatId: string,
    messageId: string,
    payload: ReactToMessagePayload,
  ): Promise<Message> => {
    const response = await apiClient.post<{ success: boolean; message: string; data: Message; timestamp: string }>(
      ENDPOINTS.MESSAGES.REACT(chatId, messageId),
      payload,
    )
    return unwrapResponse(response)
  },

  /** Remove a reaction from a message. */
  removeReaction: async (
    chatId: string,
    messageId: string,
    emoji: string,
  ): Promise<Message> => {
    const response = await apiClient.delete<{ success: boolean; message: string; data: Message; timestamp: string }>(
      ENDPOINTS.MESSAGES.REMOVE_REACTION(chatId, messageId, emoji),
    )
    return unwrapResponse(response)
  },

  /** Forward a message to one or more chats. */
  forwardMessage: async (
    chatId: string,
    messageId: string,
    payload: ForwardMessagePayload,
  ): Promise<void> => {
    await apiClient.post(ENDPOINTS.MESSAGES.FORWARD(chatId, messageId), payload)
  },

  /** Get all messages sent after a specific sequence number. */
  getMessagesAfter: async (chatId: string, afterSequence: number): Promise<Message[]> => {
    const response = await apiClient.get<{
      success: boolean
      message: string
      data: Message[]
      timestamp: string
    }>(`${ENDPOINTS.MESSAGES.LIST(chatId)}/sync`, { params: { afterSequence } })
    return unwrapResponse(response)
  },

  /** Mark a message as delivered. */
  markDelivered: async (chatId: string, messageId: string): Promise<void> => {
    await apiClient.post(ENDPOINTS.MESSAGES.MARK_DELIVERED(chatId, messageId))
  },

  /** Mark a message as read. */
  markRead: async (chatId: string, messageId: string): Promise<void> => {
    await apiClient.post(ENDPOINTS.MESSAGES.MARK_READ_MSG(chatId, messageId))
  },
}
