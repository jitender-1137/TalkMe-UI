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
import Dexie from "dexie"
import { db, mapResponseToLocalMessage } from "../db"
import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { useAuthToken } from "./useChats"

// Per-chatId in-flight guard tracked outside React to survive re-renders
const syncInFlight = new Map<string, boolean>()

/**
 * The highest sequenceNumber actually stored locally for a chat (the true local
 * tail). We read this from the messages table — NOT from sync_state — so a stale
 * or drifted sync_state can never make us skip a real gap. `sequenceNumber` maps
 * to the server message PK (monotonic), so this is the chat's newest local msg.
 */
export async function getLocalMaxSequence(chatId: string): Promise<number> {
  if (!chatId) return 0
  const newest = await db.messages
    .where("[chatId+sequenceNumber]")
    .between([chatId, Dexie.minKey], [chatId, Dexie.maxKey])
    .reverse()
    .first()
  return newest?.sequenceNumber ?? 0
}

/** The lowest sequenceNumber stored locally — used as the cursor to fetch older. */
export async function getLocalMinSequence(chatId: string): Promise<number> {
  if (!chatId) return 0
  const oldest = await db.messages
    .where("[chatId+sequenceNumber]")
    .between([chatId, Dexie.minKey], [chatId, Dexie.maxKey])
    .first()
  return oldest?.sequenceNumber ?? 0
}

// ── Query: infinite message list (Dexie local cache + background API sync) ──────────
export function useMessages(chatId: string) {
  const token = useAuthToken()
  const [limit, setLimit] = useState(30)
  const [isFetching, setIsFetching] = useState(false)
  const [hasServerMore, setHasServerMore] = useState(true)

  // 1. Live Query from IndexedDB — select the LATEST `limit` messages by
  // sequenceNumber via the [chatId+sequenceNumber] compound index, then return
  // them ascending for the UI.
  //
  // NOTE: a plain `.where("chatId").equals(chatId).reverse().limit(limit)`
  // orders by the PRIMARY KEY (messageId), so it returns the 30 highest *ids*
  // (arbitrary/lexicographic) — once a chat has > limit messages the window
  // becomes an arbitrary slice and newly sent/received messages (already in
  // Dexie) fall outside it and never render. Windowing by the compound index
  // guarantees the window is always the most-recent `limit` messages.
  const localMessages = useLiveQuery(async () => {
    if (!chatId) return []
    const msgs = await db.messages
      .where("[chatId+sequenceNumber]")
      .between([chatId, Dexie.minKey], [chatId, Dexie.maxKey])
      .reverse() // highest sequenceNumber (newest) first
      .limit(limit)
      .toArray()

    // Reverse to ascending; keep createdAt as a tiebreaker for equal sequence
    // numbers (optimistic messages use a huge sequenceNumber so they sit last).
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
      // Cursor = the oldest message we currently hold locally. The server
      // returns the next page of messages strictly OLDER than that.
      const cursor = await getLocalMinSequence(chatId)
      const response = await MessageService.getMessages(chatId, {
        cursor: cursor || undefined,
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
        setHasServerMore(response.hasMore)
        setLimit((prev) => prev + response.items.length)
      }
    } catch (err: any) {
      console.warn("[Dexie Sync] Error fetching older messages:", err?.message || err, err)
    } finally {
      setIsFetching(false)
    }
  }, [chatId, limit, localCount, isFetching, hasServerMore])

  // 3. Reconcile the local cache with the server on every chat open.
  //
  // We re-pull the most-recent window (cursor=null) AND, if we have local
  // messages, the unbounded tail newer than our local max. The recent-window
  // refresh is what heals INTERIOR holes: a message whose `put` failed (e.g. a
  // dropped/aborted WebSocket write) can sit BELOW our current max sequence, and
  // a tail-only `getMessagesAfter(localMax)` would never re-request it — so it
  // would stay missing forever. Per-chat sequence numbers are NOT contiguous
  // (the server PK is global across all chats), so we cannot detect such a hole
  // by scanning for missing integers; instead we just re-fetch the window and
  // upsert by primary key (idempotent). The tail fetch still covers large
  // catch-ups (offline, >window messages missed).
  useEffect(() => {
    if (!chatId || !token) return
    if (syncInFlight.get(chatId)) return

    let active = true
    const reconcile = async () => {
      if (syncInFlight.get(chatId)) return
      syncInFlight.set(chatId, true)

      try {
        const localMax = await getLocalMaxSequence(chatId)

        // Always refresh the latest window so any recently-missed message
        // (interior hole) is re-inserted.
        const recent = await MessageService.getMessages(chatId, { limit: 50 })

        // If we already had local history, also pull everything strictly newer
        // than our tail to cover gaps larger than the window.
        const tail =
          localMax > 0 ? await MessageService.getMessagesAfter(chatId, localMax) : []

        // Merge both lists, de-duplicating by message id (last write wins).
        const byId = new Map<string, any>()
        for (const m of recent.items) byId.set(m.id, m)
        for (const m of tail) byId.set(m.id, m)
        const newMessages = Array.from(byId.values())

        if (!active) return

        if (newMessages.length > 0) {
          await db.transaction("rw", [db.messages, db.sync_state, db.chats], async () => {
            let maxSeq = localMax
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

    reconcile()

    return () => {
      active = false
    }
  }, [chatId, token])

  const hasNextPage = localCount > limit || hasServerMore

  // Memoize the returned shape so its identity only changes when the underlying
  // messages change. `useLiveQuery` returns a stable `localMessages` reference
  // between unrelated re-renders; without this memo we'd hand `ChatArea` a brand
  // new object every render, recomputing `allMessages` and re-rendering the whole
  // message list on every keystroke/typing event → the flicker.
  const data = useMemo(
    () => ({ pages: [{ items: localMessages }], pageParams: [undefined] }),
    [localMessages],
  )

  return {
    data,
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
        clientId: tempId, // stable key carried onto the real message in onSuccess
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
        
        // 2. Put real message into Dexie, carrying the optimistic clientId so the
        // UI keeps the SAME bubble (stable key) across the temp→real swap — no
        // remount, so the slide-in animation isn't replayed.
        const mapped = mapResponseToLocalMessage(chatId, newMessage)
        if (context?.tempId) mapped.clientId = context.tempId
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
