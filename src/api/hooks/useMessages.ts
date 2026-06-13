"use client"

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { MessageService } from "../services/message.service"
import { QUERY_KEYS } from "../query-keys"
import { showSuccessToast, showErrorToast } from "../error-handler"
import type {
  SendMessagePayload,
  EditMessagePayload,
  ReactToMessagePayload,
  ForwardMessagePayload,
} from "../types"

// ── Query: infinite message list ──────────────────────────────────────────────
export function useMessages(chatId: string) {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.MESSAGES.LIST(chatId),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      MessageService.getMessages(chatId, { cursor: pageParam, limit: 30 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? String(lastPage.meta.page + 1) : undefined,
    enabled: Boolean(chatId),
    staleTime: 10 * 1000,
  })
}

// ── Query: search message list ────────────────────────────────────────────────
export function useSearchChatMessages(chatId: string, query: string) {
  return useInfiniteQuery({
    queryKey: [...QUERY_KEYS.MESSAGES.LIST(chatId), "search", query],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      MessageService.searchMessages(chatId, query, { cursor: pageParam, limit: 30 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? String(lastPage.meta.page + 1) : undefined,
    enabled: Boolean(chatId) && query.trim().length > 0,
    staleTime: 10 * 1000,
  })
}

// ── Mutation: send message ────────────────────────────────────────────────────
export function useSendMessage(chatId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SendMessagePayload) => MessageService.sendMessage(chatId, payload),
    onMutate: async (payload: SendMessagePayload) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.MESSAGES.LIST(chatId) })

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(QUERY_KEYS.MESSAGES.LIST(chatId))

      // Get own profile from cache
      const ownProfile = queryClient.getQueryData<any>(QUERY_KEYS.PROFILE.SELF)

      const tempId = `temp-${Date.now()}`
      const optimisticMessage = {
        id: tempId,
        content: payload.content || "",
        type: payload.type || "text",
        messageType: payload.type || "text",
        media: payload.media ? {
          type: payload.media.type,
          url: payload.media.url,
          fileName: payload.media.fileName,
          fileSize: payload.media.fileSize,
          mimeType: payload.media.mimeType,
          duration: payload.media.duration,
          width: payload.media.width,
          height: payload.media.height,
        } : null,
        senderId: ownProfile?.id || "current-user",
        senderName: ownProfile?.name || ownProfile?.username || "You",
        senderAvatar: ownProfile?.avatar || undefined,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        status: "sending" as any, // "sending" matches MessageStatus type
        reactions: [],
        replyTo: null,
        isDeleted: false,
      }

      // Add to query cache
      queryClient.setQueryData(QUERY_KEYS.MESSAGES.LIST(chatId), (old: any) => {
        if (!old || !old.pages) {
          return {
            pages: [{ items: [optimisticMessage], meta: { hasNextPage: false, page: 0 } }],
            pageParams: [undefined]
          }
        }
        return {
          ...old,
          pages: old.pages.map((page: any, idx: number) => {
            if (idx === 0) {
              return {
                ...page,
                items: [optimisticMessage, ...page.items],
              }
            }
            return page
          }),
        }
      })

      return { previousMessages, tempId }
    },
    onError: (err, payload, context: any) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(QUERY_KEYS.MESSAGES.LIST(chatId), context.previousMessages)
      }
      showErrorToast(err)
    },
    onSuccess: (newMessage, payload, context: any) => {
      // Replace optimistic message in the cache with the actual message from the server
      queryClient.setQueryData(QUERY_KEYS.MESSAGES.LIST(chatId), (old: any) => {
        if (!old || !old.pages) return old
        
        // Check if the message with the new ID is already in the cache (added by WebSocket)
        const exists = old.pages.some((page: any) =>
          page.items.some((m: any) => m.id === newMessage.id)
        )

        return {
          ...old,
          pages: old.pages.map((page: any) => {
            if (exists) {
              return {
                ...page,
                items: page.items.filter((m: any) => m.id !== context?.tempId),
              }
            }
            return {
              ...page,
              items: page.items.map((m: any) =>
                m.id === context?.tempId ? newMessage : m
              ),
            }
          }),
        }
      })

      // Update chats list in-place
      const lastMessage = {
        id: newMessage.id,
        content: newMessage.content || "",
        senderId: newMessage.senderId,
        senderName: newMessage.senderName || "",
        type: (newMessage.type || "text").toUpperCase(),
        timestamp: newMessage.timestamp || new Date().toISOString(),
        isDeleted: newMessage.isDeleted || false,
      }
      queryClient.setQueryData<any[]>(QUERY_KEYS.CHATS.LIST, (oldChats) => {
        if (!oldChats) return oldChats
        return oldChats.map((c) => {
          if (c.id === chatId) {
            return {
              ...c,
              lastMessage,
              updatedAt: lastMessage.timestamp,
            }
          }
          return c
        })
      })
    },
  })
}

// ── Mutation: edit message ────────────────────────────────────────────────────
export function useEditMessage(chatId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ messageId, payload }: { messageId: string; payload: EditMessagePayload }) =>
      MessageService.editMessage(chatId, messageId, payload),
    onSuccess: (updatedMessage, variables) => {
      // Update message content in the cache in-place
      queryClient.setQueryData(QUERY_KEYS.MESSAGES.LIST(chatId), (old: any) => {
        if (!old || !old.pages) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((m: any) =>
              m.id === variables.messageId ? updatedMessage : m
            ),
          })),
        }
      })

      // Update last message in chats list if it was edited
      queryClient.setQueryData<any[]>(QUERY_KEYS.CHATS.LIST, (oldChats) => {
        if (!oldChats) return oldChats
        return oldChats.map((c) => {
          if (c.id === chatId && c.lastMessage?.id === variables.messageId) {
            return {
              ...c,
              lastMessage: {
                ...c.lastMessage,
                content: updatedMessage.content,
              },
            }
          }
          return c
        })
      })
    },
    onError: showErrorToast,
  })
}

// ── Mutation: delete message ──────────────────────────────────────────────────
export function useDeleteMessage(chatId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (messageId: string) => MessageService.deleteMessage(chatId, messageId),
    onSuccess: (deletedMessage, messageId) => {
      // Update message status to isDeleted in the cache in-place
      queryClient.setQueryData(QUERY_KEYS.MESSAGES.LIST(chatId), (old: any) => {
        if (!old || !old.pages) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((m: any) =>
              m.id === messageId
                ? { ...m, isDeleted: true, content: "This message was deleted", media: undefined }
                : m
            ),
          })),
        }
      })

      // Update last message in chats list if it was deleted
      queryClient.setQueryData<any[]>(QUERY_KEYS.CHATS.LIST, (oldChats) => {
        if (!oldChats) return oldChats
        return oldChats.map((c) => {
          if (c.id === chatId && c.lastMessage?.id === messageId) {
            return {
              ...c,
              lastMessage: {
                ...c.lastMessage,
                isDeleted: true,
                content: "This message was deleted",
              },
            }
          }
          return c
        })
      })

      showSuccessToast("Message deleted")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: react to message ────────────────────────────────────────────────
export function useReactToMessage(chatId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ messageId, payload }: { messageId: string; payload: ReactToMessagePayload }) =>
      MessageService.reactToMessage(chatId, messageId, payload),
    onSuccess: (updatedMessage, variables) => {
      queryClient.setQueryData(QUERY_KEYS.MESSAGES.LIST(chatId), (old: any) => {
        if (!old || !old.pages) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((m: any) =>
              m.id === variables.messageId
                ? { ...m, reactions: updatedMessage.reactions || m.reactions }
                : m
            ),
          })),
        }
      })
    },
    onError: showErrorToast,
  })
}

// ── Mutation: remove reaction ─────────────────────────────────────────────────
export function useRemoveReaction(chatId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      MessageService.removeReaction(chatId, messageId, emoji),
    onSuccess: (updatedMessage, variables) => {
      queryClient.setQueryData(QUERY_KEYS.MESSAGES.LIST(chatId), (old: any) => {
        if (!old || !old.pages) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((m: any) =>
              m.id === variables.messageId
                ? { ...m, reactions: updatedMessage.reactions || m.reactions }
                : m
            ),
          })),
        }
      })
    },
    onError: showErrorToast,
  })
}

// ── Mutation: forward message ─────────────────────────────────────────────────
export function useForwardMessage(chatId: string) {
  return useMutation({
    mutationFn: ({ messageId, payload }: { messageId: string; payload: ForwardMessagePayload }) =>
      MessageService.forwardMessage(chatId, messageId, payload),
    onSuccess: () => {
      showSuccessToast("Message forwarded")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: mark message as read ────────────────────────────────────────────
export function useMarkMessageRead(chatId: string) {
  return useMutation({
    mutationFn: (messageId: string) => MessageService.markRead(chatId, messageId),
    onError: showErrorToast,
  })
}
