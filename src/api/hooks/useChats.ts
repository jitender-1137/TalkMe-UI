"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ChatService } from "../services/chat.service"
import { QUERY_KEYS } from "../query-keys"
import { showSuccessToast, showErrorToast } from "../error-handler"
import type { Chat, CreateChatPayload, MuteChatPayload } from "../types"
import { getAccessToken } from "../token-store"

/** Returns true when the cached session belongs to a guest user. */
function useIsGuest(): boolean {
  const qc = useQueryClient()
  const me = qc.getQueryData<any>(QUERY_KEYS.AUTH.ME)
  return me?.isGuest === true
}

// ── Query: chat list ──────────────────────────────────────────────────────────
export function useChats() {
  const isGuest = useIsGuest()
  return useQuery({
    queryKey: QUERY_KEYS.CHATS.LIST,
    queryFn: ChatService.getChats,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    enabled: !isGuest && typeof window !== "undefined" && Boolean(getAccessToken()),
  })
}

// ── Query: single chat ────────────────────────────────────────────────────────
export function useChat(chatId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.CHATS.DETAIL(chatId),
    queryFn: () => ChatService.getChatById(chatId),
    enabled: Boolean(chatId),
  })
}

// ── Query: search chats ───────────────────────────────────────────────────────
export function useSearchChats(query: string) {
  return useQuery({
    queryKey: QUERY_KEYS.CHATS.SEARCH(query),
    queryFn: () => ChatService.searchChats(query),
    enabled: query.trim().length > 0,
    staleTime: 30 * 1000,
  })
}

// ── Mutation: create chat ─────────────────────────────────────────────────────
export function useCreateChat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateChatPayload) => ChatService.createChat(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
    },
    onError: showErrorToast,
  })
}

// ── Mutation: delete chat ─────────────────────────────────────────────────────
export function useDeleteChat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (chatId: string) => ChatService.deleteChat(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
      showSuccessToast("Conversation deleted")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: archive chat ────────────────────────────────────────────────────
export function useArchiveChat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (chatId: string) => ChatService.archiveChat(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
      showSuccessToast("Conversation archived")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: unarchive chat ──────────────────────────────────────────────────
export function useUnarchiveChat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (chatId: string) => ChatService.unarchiveChat(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
      showSuccessToast("Conversation unarchived")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: pin chat ────────────────────────────────────────────────────────
export function usePinChat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (chatId: string) => ChatService.pinChat(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
      showSuccessToast("Conversation pinned")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: unpin chat ──────────────────────────────────────────────────────
export function useUnpinChat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (chatId: string) => ChatService.unpinChat(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
      showSuccessToast("Conversation unpinned")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: mute chat ───────────────────────────────────────────────────────
export function useMuteChat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ chatId, payload }: { chatId: string; payload: MuteChatPayload }) =>
      ChatService.muteChat(chatId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
      showSuccessToast("Notifications muted")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: unmute chat ─────────────────────────────────────────────────────
export function useUnmuteChat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (chatId: string) => ChatService.unmuteChat(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
      showSuccessToast("Notifications unmuted")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: clear chat ──────────────────────────────────────────────────────
export function useClearChat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (chatId: string) => ChatService.clearChat(chatId),
    onSuccess: (_data, chatId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MESSAGES.LIST(chatId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
      showSuccessToast("Chat cleared")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: mark chat as read ───────────────────────────────────────────────
export function useMarkChatAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (chatId: string) => ChatService.markAsRead(chatId),
    onSuccess: (_data, chatId) => {
      queryClient.setQueryData<Chat[]>(QUERY_KEYS.CHATS.LIST, (oldChats) => {
        if (!oldChats) return oldChats
        return oldChats.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c))
      })
      queryClient.setQueryData<Chat>(QUERY_KEYS.CHATS.DETAIL(chatId), (oldChat) => {
        if (!oldChat) return oldChat
        return { ...oldChat, unreadCount: 0 }
      })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
    },
    onError: showErrorToast,
  })
}
