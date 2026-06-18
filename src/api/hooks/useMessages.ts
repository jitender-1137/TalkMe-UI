"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MessageService } from "../services/message.service"
import { QUERY_KEYS } from "../query-keys"
import { showErrorToast, showSuccessToast } from "../error-handler"
import type {
  SendMessagePayload,
  EditMessagePayload,
  ReactToMessagePayload,
  ForwardMessagePayload,
} from "../types"
import { useLiveQuery } from "dexie-react-hooks"
import { db, mapResponseToLocalMessage } from "../db"
import { useState, useCallback, useEffect, useRef } from "react"
import { useAuthToken } from "./useChats"

// Per-chatId sync state tracked outside React to survive re-renders
const syncInFlight = new Map<string, boolean>()
const syncLastRan = new Map<string, number>()
const SYNC_COOLDOWN_MS = 30_000 // don't re-sync the same chat within 30 s

// ── Query: infinite message list (Dexie local cache + background API sync) ──────────
export function useMessages(chatId: string) {
  const token = useAuthToken()
  const [limit, setLimit] = useState(30)
  const [isFetching, setIsFetching] = useState(false)
  const [hasServerMore, setHasServerMore] = useState(true)

  // 1. Live Query from IndexedDB (sort ascending by sequenceNumber for the UI)
  const localMessages = useLiveQuery(async () => {
    if (!chatId) return []
    const msgs = await db.messages
      .where("chatId")
      .equals(chatId)
      .reverse() // latest first
      .limit(limit)
      .toArray()
    
    // Sort server sequence number ascending, fallback to createdAt
    return msgs.reverse().sort((a, b) => {
      if (a.sequenceNumber !== b.sequenceNumber) {
        return a.sequenceNumber - b.sequenceNumber;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [chatId, limit]) || []

  // Count total local messages to check pagination
  const localCount = useLiveQuery(() => {
    if (!chatId) return 0
    return db.messages.where("chatId").equals(chatId).count()
  }, [chatId]) || 0

  // 2. Fetch older messages from the server when user scrolls up (pagination)
  const fetchNextPage = useCallback(async () => {
    if (isFetching) return

    // If we have more local messages in IndexedDB than current limit, just load them locally
    if (localCount > limit) {
      setLimit((prev) => prev + 30)
      return
    }

    if (!hasServerMore) return
    setIsFetching(true)

    try {
      // Calculate cursor page parameter based on current local count
      const nextPage = Math.floor(localCount / 30)
      const response = await MessageService.getMessages(chatId, {
        cursor: String(nextPage),
        limit: 30,
      })

      if (response.items.length === 0) {
        setHasServerMore(false)
      } else {
        // Merge fetched messages into Dexie
        await db.transaction("rw", db.messages, async () => {
          for (const m of response.items) {
            await db.messages.put(mapResponseToLocalMessage(chatId, m))
          }
        })
        setLimit((prev) => prev + 30)
      }
    } catch (err: any) {
      console.warn("[Dexie Sync] Error fetching older messages:", err?.message || err, err)
    } finally {
      setIsFetching(false)
    }
  }, [chatId, limit, localCount, isFetching, hasServerMore])

  // 3. Background Sync missing/latest messages on load
  useEffect(() => {
    if (!chatId || !token) return

    // Guard: don't fire if a sync for this chat is already in-flight
    if (syncInFlight.get(chatId)) return

    // Guard: skip if we synced this chat recently AND already have local messages
    const lastRan = syncLastRan.get(chatId) || 0
    const timeSinceSync = Date.now() - lastRan

    let active = true
    const syncLatest = async () => {
      // Check local state before deciding whether to skip
      const syncState = await db.sync_state.get(chatId)
      const lastSeq = syncState?.lastSequenceNumber || 0

      // If we have existing messages and synced recently, skip to avoid burst on reconnect
      if (lastSeq > 0 && timeSinceSync < SYNC_COOLDOWN_MS) {
        return
      }

      if (syncInFlight.get(chatId)) return
      syncInFlight.set(chatId, true)
      syncLastRan.set(chatId, Date.now())

      try {
        let newMessages: any[] = []
        if (lastSeq > 0) {
          // Request missing messages after last known sequence
          newMessages = await MessageService.getMessagesAfter(chatId, lastSeq)
        } else {
          // Load initial page from server to establish baseline
          const response = await MessageService.getMessages(chatId, { limit: 30 })
          newMessages = response.items
        }

        if (!active) return

        if (newMessages.length > 0) {
          await db.transaction("rw", [db.messages, db.sync_state, db.chats], async () => {
            let maxSeq = lastSeq
            for (const m of newMessages) {
              const mapped = mapResponseToLocalMessage(chatId, m)
              await db.messages.put(mapped)
              if (mapped.sequenceNumber > maxSeq) {
                maxSeq = mapped.sequenceNumber
              }
            }

            // Update sync state
            await db.sync_state.put({
              chatId,
              lastSequenceNumber: maxSeq,
              lastSyncTimestamp: Date.now(),
            })

            // Update chat metadata with last message info
            const sorted = [...newMessages].sort((a, b) => b.sequenceNumber - a.sequenceNumber)
            const latestMsg = sorted[0]
            const chat = await db.chats.get(chatId)
            if (chat && latestMsg) {
              await db.chats.update(chatId, {
                lastMessageId: latestMsg.id,
                lastMessagePreview: latestMsg.content || "Media attachment",
                updatedAt: latestMsg.createdAt || latestMsg.timestamp || chat.updatedAt,
                lastMessage: {
                  id: latestMsg.id,
                  content: latestMsg.content || "",
                  senderId: latestMsg.senderId,
                  senderName: latestMsg.senderName || "",
                  type: latestMsg.type || "TEXT",
                  timestamp: latestMsg.createdAt || latestMsg.timestamp || new Date().toISOString(),
                  isDeleted: latestMsg.isDeleted || false,
                },
              })
            }
          })
        }
      } catch (err: any) {
        console.warn("[Dexie Sync] Error syncing latest messages:", err?.message || err, err)
      } finally {
        syncInFlight.set(chatId, false)
      }
    }

    syncLatest()

    return () => {
      active = false
    }
  }, [chatId, token])

  const hasNextPage = localCount > limit || hasServerMore

  return {
    data: {
      pages: [{ items: localMessages }],
      pageParams: [undefined],
    },
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage: isFetching,
  }
}

// ── Query: search message list ────────────────────────────────────────────────
export function useSearchChatMessages(chatId: string, query: string) {
  const localSearchResults = useLiveQuery(async () => {
    if (!chatId || !query.trim()) return []
    return db.messages
      .where("chatId")
      .equals(chatId)
      .filter((m) => m.content.toLowerCase().includes(query.toLowerCase()))
      .sortBy("sequenceNumber")
  }, [chatId, query]) || []

  return {
    data: {
      pages: [{ items: localSearchResults }],
      pageParams: [undefined],
    },
    fetchNextPage: () => {},
    hasNextPage: false,
    isFetchingNextPage: false,
  }
}

// ── Mutation: send message ────────────────────────────────────────────────────
export function useSendMessage(chatId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SendMessagePayload) => MessageService.sendMessage(chatId, payload),
    onMutate: async (payload: SendMessagePayload) => {
      const ownProfile = queryClient.getQueryData<any>(QUERY_KEYS.PROFILE.SELF)
      const tempId = `temp-${Date.now()}`
      
      let replyToObj = null
      if (payload.replyToId) {
        const parentMsg = await db.messages.get(payload.replyToId)
        if (parentMsg) {
          replyToObj = {
            id: parentMsg.id,
            senderName: parentMsg.senderName,
            content: parentMsg.content,
            type: parentMsg.type || "TEXT",
          }
        }
      }

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
        status: "sending",
        reactions: [],
        replyTo: replyToObj,
        isDeleted: false,
        sequenceNumber: 999999 + Date.now(), // Put optimistic messages at the end
      }

      // Save optimistic message to Dexie
      await db.messages.put(mapResponseToLocalMessage(chatId, optimisticMessage))

      return { tempId }
    },
    onError: async (err, payload, context: any) => {
      if (context?.tempId) {
        // Delete optimistic message from Dexie on error
        await db.messages.delete(context.tempId)
      }
      showErrorToast(err)
    },
    onSuccess: async (newMessage, payload, context: any) => {
      await db.transaction("rw", [db.messages, db.sync_state, db.chats], async () => {
        // 1. Remove optimistic message
        if (context?.tempId) {
          await db.messages.delete(context.tempId)
        }
        
        // 2. Put real message into Dexie
        const mapped = mapResponseToLocalMessage(chatId, newMessage)
        await db.messages.put(mapped)

        // 3. Advance sync state
        const syncState = await db.sync_state.get(chatId)
        const currentSeq = syncState?.lastSequenceNumber || 0
        if (mapped.sequenceNumber > currentSeq) {
          await db.sync_state.put({
            chatId,
            lastSequenceNumber: mapped.sequenceNumber,
            lastSyncTimestamp: Date.now(),
          })
        }

        // 4. Update chat metadata
        const chat = await db.chats.get(chatId)
        if (chat) {
          await db.chats.update(chatId, {
            lastMessageId: newMessage.id,
            lastMessagePreview: newMessage.content || "Media attachment",
            updatedAt: newMessage.createdAt || newMessage.timestamp || chat.updatedAt,
            lastMessage: {
              id: newMessage.id,
              content: newMessage.content || "",
              senderId: newMessage.senderId,
              senderName: newMessage.senderName || "",
              type: newMessage.type || "TEXT",
              timestamp: newMessage.createdAt || newMessage.timestamp || new Date().toISOString(),
              isDeleted: newMessage.isDeleted || false,
            },
          })
        }
      })
    },
  })
}

// ── Mutation: edit message ────────────────────────────────────────────────────
export function useEditMessage(chatId: string) {
  return useMutation({
    mutationFn: ({ messageId, payload }: { messageId: string; payload: EditMessagePayload }) =>
      MessageService.editMessage(chatId, messageId, payload),
    onSuccess: async (updatedMessage, variables) => {
      // Update locally in Dexie
      const existing = await db.messages.get(variables.messageId)
      if (existing) {
        await db.messages.update(variables.messageId, {
          content: updatedMessage.content,
          editedAt: new Date().toISOString(),
          isDeleted: updatedMessage.isDeleted || false,
        })
      }
    },
    onError: showErrorToast,
  })
}

// ── Mutation: delete message ──────────────────────────────────────────────────
export function useDeleteMessage(chatId: string) {
  return useMutation({
    mutationFn: (messageId: string) => MessageService.deleteMessage(chatId, messageId),
    onSuccess: async (_data, messageId) => {
      // Update locally in Dexie
      const existing = await db.messages.get(messageId)
      if (existing) {
        await db.messages.update(messageId, {
          content: "This message was deleted",
          deleted: 1,
          isDeleted: true,
          attachments: [],
          mediaId: undefined,
        })
      }
      showSuccessToast("Message deleted")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: react to message ────────────────────────────────────────────────
export function useReactToMessage(chatId: string) {
  return useMutation({
    mutationFn: ({ messageId, payload }: { messageId: string; payload: ReactToMessagePayload }) =>
      MessageService.reactToMessage(chatId, messageId, payload),
    onSuccess: async (updatedMessage, variables) => {
      // Update locally in Dexie
      const existing = await db.messages.get(variables.messageId)
      if (existing) {
        await db.messages.update(variables.messageId, {
          reactions: updatedMessage.reactions || [],
        })
      }
    },
    onError: showErrorToast,
  })
}

// ── Mutation: remove reaction ─────────────────────────────────────────────────
export function useRemoveReaction(chatId: string) {
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      MessageService.removeReaction(chatId, messageId, emoji),
    onSuccess: async (updatedMessage, variables) => {
      // Update locally in Dexie
      const existing = await db.messages.get(variables.messageId)
      if (existing) {
        await db.messages.update(variables.messageId, {
          reactions: updatedMessage.reactions || [],
        })
      }
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
    onSuccess: async (_data, messageId) => {
      const existing = await db.messages.get(messageId)
      if (existing) {
        await db.messages.update(messageId, {
          status: "seen",
        })
      }
    },
    onError: showErrorToast,
  })
}
