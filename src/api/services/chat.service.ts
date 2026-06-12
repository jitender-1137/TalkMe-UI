import apiClient from "../client"
import { ENDPOINTS } from "../endpoints"
import { unwrapResponse } from "../response-handler"
import type { Chat, CreateChatPayload, MuteChatPayload } from "../types"

export const ChatService = {
  /** Fetch all chats for the current user. */
  getChats: async (): Promise<Chat[]> => {
    const response = await apiClient.get<{ success: boolean; message: string; data: Chat[]; timestamp: string }>(
      ENDPOINTS.CHATS.LIST,
    )
    return unwrapResponse(response)
  },

  /** Fetch a single chat by ID. */
  getChatById: async (chatId: string): Promise<Chat> => {
    const response = await apiClient.get<{ success: boolean; message: string; data: Chat; timestamp: string }>(
      ENDPOINTS.CHATS.BY_ID(chatId),
    )
    return unwrapResponse(response)
  },

  /** Start a new direct-message chat. */
  createChat: async (payload: CreateChatPayload): Promise<Chat> => {
    const backendPayload = {
      recipientId: payload.participantId,
    }
    const response = await apiClient.post<{ success: boolean; message: string; data: Chat; timestamp: string }>(
      ENDPOINTS.CHATS.CREATE,
      backendPayload,
    )
    return unwrapResponse(response)
  },

  /** Delete a chat. */
  deleteChat: async (chatId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.CHATS.DELETE(chatId))
  },

  /** Archive a chat. */
  archiveChat: async (chatId: string): Promise<Chat> => {
    const response = await apiClient.put<{ success: boolean; message: string; data: Chat; timestamp: string }>(
      ENDPOINTS.CHATS.ARCHIVE(chatId),
      null,
      { params: { archive: true } }
    )
    return unwrapResponse(response)
  },

  /** Unarchive a chat. */
  unarchiveChat: async (chatId: string): Promise<Chat> => {
    const response = await apiClient.put<{ success: boolean; message: string; data: Chat; timestamp: string }>(
      ENDPOINTS.CHATS.UNARCHIVE(chatId),
      null,
      { params: { archive: false } }
    )
    return unwrapResponse(response)
  },

  /** Pin a chat. */
  pinChat: async (chatId: string): Promise<Chat> => {
    const response = await apiClient.put<{ success: boolean; message: string; data: Chat; timestamp: string }>(
      ENDPOINTS.CHATS.PIN(chatId),
      null,
      { params: { pin: true } }
    )
    return unwrapResponse(response)
  },

  /** Unpin a chat. */
  unpinChat: async (chatId: string): Promise<Chat> => {
    const response = await apiClient.put<{ success: boolean; message: string; data: Chat; timestamp: string }>(
      ENDPOINTS.CHATS.UNPIN(chatId),
      null,
      { params: { pin: false } }
    )
    return unwrapResponse(response)
  },

  /** Mute notifications for a chat. */
  muteChat: async (chatId: string, payload: MuteChatPayload): Promise<Chat> => {
    const response = await apiClient.put<{ success: boolean; message: string; data: Chat; timestamp: string }>(
      ENDPOINTS.CHATS.MUTE(chatId),
      null,
      { params: { mute: true } }
    )
    return unwrapResponse(response)
  },

  /** Unmute a chat. */
  unmuteChat: async (chatId: string): Promise<Chat> => {
    const response = await apiClient.put<{ success: boolean; message: string; data: Chat; timestamp: string }>(
      ENDPOINTS.CHATS.UNMUTE(chatId),
      null,
      { params: { mute: false } }
    )
    return unwrapResponse(response)
  },

  /** Delete all messages in a chat. */
  clearChat: async (chatId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.CHATS.CLEAR(chatId))
  },

  /** Mark all messages in a chat as read. */
  markAsRead: async (chatId: string): Promise<void> => {
    await apiClient.put(ENDPOINTS.CHATS.MARK_READ(chatId))
  },

  /** Mark all messages in a chat as delivered (received but not read). */
  markAsDelivered: async (chatId: string): Promise<void> => {
    await apiClient.put(ENDPOINTS.CHATS.MARK_DELIVERED(chatId))
  },

  /** Mark all pending messages across ALL chats as delivered (called on login/connect). */
  markAllAsDelivered: async (): Promise<void> => {
    await apiClient.put(ENDPOINTS.CHATS.DELIVER_ALL)
  },

  /** Search chats by name or last message content. */
  searchChats: async (query: string): Promise<Chat[]> => {
    const response = await apiClient.get<{ success: boolean; message: string; data: Chat[]; timestamp: string }>(
      ENDPOINTS.CHATS.SEARCH,
      { params: { q: query } },
    )
    return unwrapResponse(response)
  },
}
