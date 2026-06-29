"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MessageService } from "@/src/api"
import { UploadService } from "../services/upload.service"
import { QUERY_KEYS } from "@/src/api"
import { showErrorToast, showSuccessToast } from "@/src/api"
import type {
  SendMessagePayload,
  EditMessagePayload,
  ReactToMessagePayload,
  ForwardMessagePayload,
} from "../types"
import { useLiveQuery } from "dexie-react-hooks"
import Dexie from "dexie"
import { db, mapResponseToLocalMessage, normalizeMessageStatus } from "../db"
import { useUploadProgress } from "@/lib/chat/upload-progress-store"
import { rememberPendingFile, forgetPendingFile } from "@/lib/chat/pending-upload-files"
import { useState, useCallback, useEffect, useMemo } from "react"
import { useAuthToken } from "@/src/api"
import { useProfile } from "@/src/api"

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

/**
 * Rebuild a chat's last-message preview from the newest message still stored
 * locally — but ONLY when the chat-list currently points at `removedMessageId`
 * (the message just deleted). Without this, deleting the latest message leaves
 * the chat list showing a stale/now-gone preview until the next sync. The rebuilt
 * preview carries the new last message's delivery status so its tick is correct.
 */
async function refreshChatLastMessageAfterDelete(chatId: string, removedMessageId: string) {
  const chat = await db.chats.get(chatId)
  if (!chat) return
  const lm: any = chat.lastMessage
  const pointedHere =
    chat.lastMessageId === removedMessageId ||
    (lm && (lm.id === removedMessageId || lm.messageId === removedMessageId))
  if (!pointedHere) return

  const newest = await db.messages
    .where("[chatId+sequenceNumber]")
    .between([chatId, Dexie.minKey], [chatId, Dexie.maxKey])
    .reverse()
    .first()

  if (!newest) {
    // Nothing left in this chat.
    await db.chats.update(chatId, { lastMessageId: undefined, lastMessagePreview: "", lastMessage: null })
    return
  }

  const isTombstone = newest.deleted === 1 || newest.isDeleted
  const preview = isTombstone ? "This message was deleted" : newest.content || "Media attachment"
  await db.chats.update(chatId, {
    lastMessageId: newest.messageId,
    lastMessagePreview: preview,
    updatedAt: newest.createdAt || chat.updatedAt,
    lastMessage: {
      id: newest.messageId,
      content: isTombstone ? "This message was deleted" : newest.content || "",
      senderId: newest.senderId,
      senderName: newest.senderName || "",
      type: newest.messageType || "TEXT",
      timestamp: newest.createdAt || new Date().toISOString(),
      isDeleted: isTombstone,
      status: normalizeMessageStatus(newest.status || "sent"),
    },
  })
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
      // A 403 means the user is not (or no longer) a member of this chat.
      // Retrying on every scroll frame just hammers the server, so stop
      // paginating for this chat.
      if (err?.status === 403) {
        setHasServerMore(false)
        console.warn("[Dexie Sync] Not a member of this chat — stopping pagination.")
      } else {
        console.warn("[Dexie Sync] Error fetching older messages:", err?.message || err, err)
      }
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

        // Reconcile server-side DELETIONS within the freshly-fetched recent window:
        // any locally-stored, server-confirmed message whose sequence falls inside
        // the window's range but is ABSENT from the server response was removed or
        // hidden for us server-side (the sender deleted-for-everyone while we were
        // offline, or a delete-for-me synced from another device). Drop the stale
        // local copy so it doesn't linger. Optimistic ("sending") and out-of-window
        // messages are left untouched.
        if (recent.items.length > 0) {
          const serverIds = new Set(recent.items.map((m: any) => m.id))
          const seqs = recent.items.map((m: any) => m.sequenceNumber || 0)
          const minSeq = Math.min(...seqs)
          const maxSeq = Math.max(...seqs)
          const localInWindow = await db.messages
            .where("[chatId+sequenceNumber]")
            .between([chatId, minSeq], [chatId, maxSeq])
            .toArray()
          const staleIds = localInWindow
            .filter((m) => m.status !== "sending" && !serverIds.has(m.messageId))
            .map((m) => m.messageId)
          if (staleIds.length > 0) {
            await db.messages.bulkDelete(staleIds)
          }
        }

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

            // Update chat metadata with last message info.
            const sorted = [...newMessages].sort((a, b) => b.sequenceNumber - a.sequenceNumber)
            const latestMsg = sorted[0]
            const chat = await db.chats.get(chatId)
            // Only rewrite the chat's lastMessage when this sync actually produced a
            // NEWER last message. This reconciles runs on every chat OPEN (it always
            // refreshes the recent window), so unconditionally rebuilding lastMessage
            // from the messages endpoint clobbered the richer chat-list version
            // (delivery status / senderId) with a statusless one — making the
            // chat-list tick disappear on open. When it's the same message, leave the
            // existing lastMessage (and its status) untouched.
            if (chat && latestMsg && chat.lastMessage?.id !== latestMsg.id) {
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
                  // Carry the message's delivery status so the chat-list tick is
                  // present on a genuinely new last message too.
                  status: normalizeMessageStatus(latestMsg.status || "sent"),
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
  // between unrelated re-renders; without this memo we'd hand `ChatArea` a brand-new
  // object every render, recomputing `allMessages` and re-rendering the whole
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
interface UseSendMessageOptions {
  /**
   * Called when a send is HARD-REJECTED for non-clean content (group/feed, HTTP 422 /
   * TM_490) and the text is long enough to be worth recovering — hands the original
   * text back so the composer can repopulate it for editing.
   */
  restoreDraftToInput?: (content: string) => void
}

/** Min length before a moderation-rejected message is restored to the composer. */
const RESTORE_MIN_LENGTH = 20

export function useSendMessage(chatId: string, options?: UseSendMessageOptions) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: SendMessagePayload) => {
      // Optimistic-first media: onMutate has ALREADY rendered the bubble from the local
      // preview with an "uploading" status. Now upload the file in the background and
      // attach the real URL before posting. (GIF/sticker/audio-with-url skip this.)
      if (payload.localFile && !payload.media) {
        const cid = payload.clientId
        const res = await UploadService.uploadFile(
          payload.localFile,
          (payload.type as any) || "document",
          {
            context: "conversation",
            contextId: chatId,
            // Per-message progress → this bubble's upload ring (see upload-progress-store).
            onProgress: cid ? (pct) => useUploadProgress.getState().setProgress(cid, pct) : undefined,
          },
        )
        // Hold the ring at 100% during the send POST; it's cleared in onSuccess/onError
        // when the optimistic bubble is swapped for the real (sent) message — avoids a
        // 100%→0% flicker in the gap between upload-done and post-done.
        if (cid) useUploadProgress.getState().setProgress(cid, 100)
        payload.media = {
          url: res.url,
          type: (payload.type as any) || "document",
          fileName: payload.localFile.name,
          fileSize: `${((res.size ?? payload.localFile.size) / (1024 * 1024)).toFixed(2)} MB`,
          mimeType: res.mimeType ?? payload.localFile.type,
        }
      }
      return MessageService.sendMessage(chatId, payload)
    },
    onMutate: async (payload: SendMessagePayload) => {
      const ownProfile = queryClient.getQueryData<any>(QUERY_KEYS.PROFILE.SELF)
      // Stable idempotency key. Mutating `payload` here is intentional: React
      // Query keeps the same `variables` reference across retries, so a retried
      // mutationFn re-sends the SAME clientId and the server dedups it instead
      // of creating a duplicate. Also doubles as the stable optimistic UI key.
      const clientId =
        payload.clientId ??
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      payload.clientId = clientId
      const tempId = clientId
      // Seed the upload ring at 0% immediately so the bubble shows a progress
      // indicator from the first frame (before the first XHR progress tick).
      if (payload.localFile) {
        useUploadProgress.getState().setProgress(clientId, 0)
        // Keep the original File in memory so a retry can RE-UPLOAD it rather than
        // re-sending the un-reachable blob: preview URL (see handleRetry).
        rememberPendingFile(clientId, payload.localFile)
      }

      let replyToObj = null
      if (payload.replyToId) {
        const parentMsg: any = await db.messages.get(payload.replyToId)
        if (parentMsg) {
          // Carry the parent's media thumbnail + real type so the optimistic bubble's
          // quote renders correctly for ANY parent type (not just text).
          const att = parentMsg.attachments?.[0]
          replyToObj = {
            id: parentMsg.id,
            senderName: parentMsg.senderName,
            content: parentMsg.content,
            type: parentMsg.messageType || parentMsg.type || "TEXT",
            mediaUrl: att?.fileUrl || att?.url || parentMsg.media?.url || undefined,
          }
        }
      }

      // Optimistic media: the GIF/sticker remote URL, or the local blob preview while
      // the file uploads in the background.
      const optimisticMediaUrl = payload.media?.url || payload.localPreviewUrl

      const optimisticMessage = {
        id: tempId,
        clientId: tempId, // stable key carried onto the real message in onSuccess
        content: payload.content || "",
        type: payload.type || "text",
        messageType: payload.type || "text",
        // Stored as `attachments` (which mapResponseToLocalMessage preserves) so the
        // media renders IMMEDIATELY — for an uploading image this is the local blob.
        attachments: optimisticMediaUrl ? [{
          fileUrl: optimisticMediaUrl,
          url: optimisticMediaUrl,
          type: payload.media?.type || payload.type || "image",
          fileName: payload.media?.fileName || payload.localFile?.name,
          fileSize: payload.media?.fileSize,
          mimeType: payload.media?.mimeType || payload.localFile?.type,
          duration: payload.media?.duration,
          width: payload.media?.width,
          height: payload.media?.height,
        }] : [],
        senderId: ownProfile?.id || "current-user",
        senderName: ownProfile?.name || ownProfile?.username || "You",
        senderAvatar: ownProfile?.avatar || undefined,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        // Media still uploading → "uploading" (spinner); text/ready media → "sending".
        status: payload.localFile ? "uploading" : "sending",
        reactions: [],
        replyTo: replyToObj,
        isDeleted: false,
        sequenceNumber: 999999 + Date.now(), // Put optimistic messages at the end
      }

      // Save optimistic message to Dexie
      await db.messages.put(mapResponseToLocalMessage(chatId, optimisticMessage))

      return { tempId }
    },
    onError: async (err: any, payload, context: any) => {
      if (context?.tempId) {
        useUploadProgress.getState().clearProgress(context.tempId)
      }

      // Hard-reject for non-clean content (group/feed → HTTP 422 / TM_490). Retrying
      // the SAME text can never succeed, so don't leave a dead "failed/retry" bubble:
      // when the text is long enough to be worth recovering, remove the optimistic row
      // and hand the original text back to the composer for editing. Short messages
      // keep the failed bubble (easy to retype).
      const status = err?.status ?? err?.response?.status

      // File too large (HTTP 413 — per-type cap in UploadController, or Spring's
      // multipart limit via GlobalExceptionHandler). Re-uploading the SAME oversized
      // file can never succeed, so don't leave a "failed/retry" bubble (whose retry
      // would deliver an un-uploaded file). Remove the optimistic row entirely and let
      // the toast explain why ("Video is too large. Maximum size is 30 MB.").
      if (status === 413) {
        if (context?.tempId) {
          forgetPendingFile(context.tempId)
          await db.messages.delete(context.tempId)
        }
        showErrorToast(err)
        return
      }

      const isModerationReject =
        status === 422 || err?.code === "TM_490" || err?.response?.data?.code === "TM_490"
      if (isModerationReject) {
        const content = payload?.content || ""
        if (content.trim().length > RESTORE_MIN_LENGTH && options?.restoreDraftToInput) {
          if (context?.tempId) await db.messages.delete(context.tempId)
          options.restoreDraftToInput(content)
        } else if (context?.tempId) {
          const existing = await db.messages.get(context.tempId)
          if (existing) await db.messages.update(context.tempId, { status: "failed" })
        }
        showErrorToast(err)
        return
      }

      // Other errors (network/server) — keep the message visible but mark it FAILED
      // (after auto-retries are exhausted) so it isn't silently lost. The user can tap
      // to retry; the retry reuses the same clientId, so the server dedups it.
      if (context?.tempId) {
        const existing = await db.messages.get(context.tempId)
        if (existing) {
          await db.messages.update(context.tempId, { status: "failed" })
        }
      }
      showErrorToast(err)
    },
    onSuccess: async (newMessage, payload, context: any) => {
      // The optimistic bubble is about to be replaced by the real (sent) message —
      // drop its upload-ring entry so the overlay disappears with the swap.
      if (context?.tempId) {
        useUploadProgress.getState().clearProgress(context.tempId)
        // Upload succeeded — the file is on the server now; free the retry copy.
        forgetPendingFile(context.tempId)
      }
      await db.transaction("rw", [db.messages, db.sync_state, db.chats], async () => {
        // 1. Remove optimistic message
        if (context?.tempId) {
          await db.messages.delete(context.tempId)
        }
        
        // A message held pending 18+ consent is kept ONLY for its sender (the server
        // returns it just to them) and renders as an in-thread "not delivered · needs
        // consent" bubble — status="blocked", set in mapResponseToLocalMessage. No
        // toast. The recipient never receives it.
        const held = (newMessage as any).moderationStatus === "BLOCKED_PENDING_CONSENT"

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
            lastMessagePreview: held ? "🔒 Pending 18+ consent" : (newMessage.content || "Media attachment"),
            updatedAt: newMessage.createdAt || newMessage.timestamp || chat.updatedAt,
            lastMessage: {
              id: newMessage.id,
              content: held ? "" : (newMessage.content || ""),
              senderId: newMessage.senderId,
              senderName: newMessage.senderName || "",
              type: newMessage.type || "TEXT",
              timestamp: newMessage.createdAt || newMessage.timestamp || new Date().toISOString(),
              isDeleted: newMessage.isDeleted || false,
              status: held ? "blocked" : normalizeMessageStatus(newMessage.status || "sent"),
            },
          })
        }
      })

      // Held pending 18+ consent (1:1 non-clean): keep the in-thread "needs consent"
      // bubble AND hand the original text back to the composer (when long enough) so the
      // user can edit out the flagged word instead of only waiting on consent — the same
      // recovery the group hard-reject path gives. Done outside the Dexie transaction.
      const heldPendingConsent =
        (newMessage as any).moderationStatus === "BLOCKED_PENDING_CONSENT"
      if (heldPendingConsent) {
        const content = payload?.content || ""
        if (content.trim().length > RESTORE_MIN_LENGTH && options?.restoreDraftToInput) {
          options.restoreDraftToInput(content)
        }
      }
    },
    // Automatic retry for transient network failures only (no HTTP status).
    // Safe because sends are idempotent via clientId — a retry that actually
    // reached the server the first time will be deduped, not duplicated. Never
    // retry 4xx/5xx app errors (validation, auth, blocked) — those won't recover.
    retry: (failureCount, error: any) => {
      const status = error?.status ?? error?.response?.status
      return (status === undefined || status === 0) && failureCount < 3
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
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
  const { data: ownProfile } = useProfile()
  const currentUserId = ownProfile?.id

  return useMutation({
    mutationFn: (messageId: string) => MessageService.deleteMessage(chatId, messageId),
    onSuccess: async (_data, messageId) => {
      const existing = await db.messages.get(messageId)
      if (existing) {
        const isOwnMessage = !!currentUserId && existing.senderId === currentUserId
        if (isOwnMessage) {
          // Deleting your OWN message = delete for everyone → leave a tombstone.
          // The recipient is updated in real time via the message_deleted WS event.
          await db.messages.update(messageId, {
            content: "This message was deleted",
            deleted: 1,
            isDeleted: true,
            attachments: [],
            mediaId: undefined,
            reactions: [],
          })
        } else {
          // Deleting someone ELSE's message = delete for me → remove it from this
          // user's view entirely. The backend keeps it for the sender and filters
          // it out of this user's history, so it won't resurface on sync.
          await db.messages.delete(messageId)
        }
        // Refresh the chat-list preview (+ status tick) if this was the last message.
        await refreshChatLastMessageAfterDelete(chatId, messageId)
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
