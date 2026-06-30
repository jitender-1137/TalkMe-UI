"use client"

import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Client, ReconnectionTimeMode } from "@stomp/stompjs"
import { toast } from "sonner"
import { getAccessToken } from "@/src/api/token-store"
import { QUERY_KEYS } from "@/src/api/query-keys"
import { useChats } from "@/src/api/hooks/useChats"
import { useContacts } from "@/src/api/hooks/useContacts"
import { useProfile } from "@/src/api/hooks/useProfile"
import { MessageService } from "@/src/api/services/message.service"
import { getLocalMaxSequence } from "@/src/api/hooks/useMessages"
import { ChatService } from "@/src/api/services/chat.service"
import type { Chat, Contact } from "@/src/api/types"
import { formatMediaUrls, checkIsSameJar } from "@/src/api/client"
import { setBadge } from "@/lib/badge/badge"
import { X } from "lucide-react"
import { useLobbyStore } from "@/components/lobby/lobby-store"
import { useLivePresenceStore } from "@/lib/presence/live-status-store"
import { getTabFromHash, parseHash } from "@/lib/navigation/url-hash"
import { showBrowserNotification } from "@/lib/notifications/browser-notify"
import { displayContent } from "@/lib/shared-post"
import { db, mapResponseToLocalMessage, mapResponseToLocalChat, normalizeMessageStatus, putChatSafely } from "@/src/api/db"


// Per-chat serialization queue for incoming message handling. WebSocket frames
// arrive as independent async events; without ordering, two rapid messages for
// the same chat interleave and their Dexie writes can abort each other, dropping
// a message. We chain handlers per chatId so they run strictly one-at-a-time.
const chatHandlerQueues = new Map<string, Promise<void>>()
function enqueuePerChat(chatId: string, task: () => Promise<void> | void): Promise<void> {
  const prev = chatHandlerQueues.get(chatId) ?? Promise.resolve()
  const next = prev.catch(() => {}).then(() => task())
  // Keep the chain alive even if a handler throws.
  chatHandlerQueues.set(chatId, next.catch(() => {}))
  return next
}


const updateChatPresence = (chat: Chat, userId: string, status: string, lastSeen: string | null): Chat => {
  let updated = false
  let otherUser = chat.otherUser
  if (otherUser && otherUser.id === userId) {
    otherUser = {
      ...otherUser,
      presence: status.toLowerCase() as any,
      lastSeen: lastSeen,
    }
    updated = true
  }
  let participants = chat.participants
  if (participants && participants.length > 0) {
    participants = participants.map((p) => {
      if (p.id === userId) {
        updated = true
        return {
          ...p,
          presence: status.toLowerCase() as any,
          lastSeen: lastSeen,
        }
      }
      return p
    })
  }
  if (updated) {
    return {
      ...chat,
      otherUser,
      participants,
    }
  }
  return chat
}

const updateContactPresence = (contact: Contact, userId: string, status: string, lastSeen: string | null): Contact => {
  if (contact.userId === userId) {
    return {
      ...contact,
      presence: status.toLowerCase() as any,
      lastSeen: lastSeen,
    }
  }
  return contact
}

interface WebSocketContextType {
  isConnected: boolean
  sendEvent: (event: string, payload: any) => void
  registerHandler: (event: string, handler: (payload: any) => void) => () => void
  subscribeToPresence: (username: string, sticky?: boolean) => void
  unsubscribeFromPresence: (username: string) => void
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider")
  }
  return context
}

let lastSoundPlayTime = 0

const playNotificationSound = () => {
  const now = Date.now()
  if (now - lastSoundPlayTime < 500) {
    return
  }
  lastSoundPlayTime = now

  try {
    const audio = new Audio("/sounds/notification.wav")
    audio.volume = 0.5
    audio.play().catch((err) => {
      console.warn("[WebSocket] Failed to play audio:", err)
    })
  } catch (err) {
    console.error("[WebSocket] Audio play error:", err)
  }
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const stompClientRef = useRef<Client | null>(null)
  const handlersRef = useRef<Record<string, Set<(payload: any) => void>>>({})
  const chatSubscriptionsRef = useRef<Map<string, { messages: any; typing: any }>>(new Map())
  const contactSubscriptionsRef = useRef<Map<string, any>>(new Map())
  // Usernames subscribed explicitly by a view (chat-area partner, discover cards),
  // not by the contacts sync. The contacts sync must NOT unsubscribe these.
  const stickyPresenceRef = useRef<Set<string>>(new Set())
  const matchSubscriptionRef = useRef<any>(null)
  const chatsSubscriptionRef = useRef<any>(null)
  const friendsSubscriptionRef = useRef<any>(null)
  const notificationsSubscriptionRef = useRef<any>(null)
  const lobbySubscriptionRef = useRef<any>(null)
  const lobbyChatSubscriptionRef = useRef<any>(null)
  const lobbyTypingSubscriptionRef = useRef<any>(null)
  const strangerChatIdRef = useRef<string | null>(null)
  const markReadTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const presenceHeartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const processedMessageIdsRef = useRef<Set<string>>(new Set())
  const queryClient = useQueryClient()
  const connectedTokenRef = useRef<string | null>(null)

  // Fetch active chats, contacts and own profile to enable dynamic presence and message subscriptions
  const { data: chatsData } = useChats()
  const { data: contactsData } = useContacts()
  const { data: ownProfile } = useProfile()

  const ownProfileRef = useRef(ownProfile)
  useEffect(() => {
    ownProfileRef.current = ownProfile
  }, [ownProfile])

  // Safely extract arrays from response structures (unwrap-safe)
  const chats = useMemo(() => {
    return Array.isArray(chatsData) ? chatsData : (chatsData as any)?.items || []
  }, [chatsData])
  const contacts = useMemo(() => {
    return Array.isArray(contactsData) ? contactsData : (contactsData as any)?.items || []
  }, [contactsData])

  const registerHandler = useCallback((event: string, handler: (payload: any) => void) => {
    if (!handlersRef.current[event]) {
      handlersRef.current[event] = new Set()
    }
    handlersRef.current[event].add(handler)
    return () => {
      handlersRef.current[event]?.delete(handler)
    }
  }, [])

  const sendEvent = useCallback((event: string, payload: any) => {
    const client = stompClientRef.current
    if (client && client.connected) {
      if (event === "stranger_message") {
        if (strangerChatIdRef.current) {
          MessageService.sendMessage(strangerChatIdRef.current, {
            content: payload.content,
            type: "text"
          }).catch(err => console.error("[STOMP] Error sending stranger message:", err))
        } else {
          console.warn("[STOMP] strangerChatId is null. Cannot send stranger message.")
        }
      } else if (event === "typing_started" && payload.chatId) {
        client.publish({
          destination: `/app/chat/${payload.chatId}/typing`,
          body: JSON.stringify(true)
        })
      } else if (event === "typing_stopped" && payload.chatId) {
        client.publish({
          destination: `/app/chat/${payload.chatId}/typing`,
          body: JSON.stringify(false)
        })
      } else if (event === "recording_started" && payload.chatId) {
        // payload.mode: "audio" | "video"
        client.publish({
          destination: `/app/chat/${payload.chatId}/activity`,
          body: payload.mode === "video" ? "RECORDING_VIDEO" : "RECORDING_AUDIO",
        })
      } else if (event === "recording_stopped" && payload.chatId) {
        client.publish({
          destination: `/app/chat/${payload.chatId}/activity`,
          body: "NONE",
        })
      } else if (event === "presence_visible") {
        // Tab foregrounded → server marks us ONLINE and broadcasts.
        client.publish({ destination: "/app/presence/visibility", body: "true" })
      } else if (event === "presence_hidden") {
        // Tab hidden/backgrounded → server marks us IDLE (auto-OFFLINE after a
        // 10-min grace) and broadcasts. Heartbeats keep flowing so the server
        // knows we're still connected, just inactive.
        client.publish({ destination: "/app/presence/visibility", body: "false" })
      } else if (event === "stranger_typing_started") {
        // Anonymous match typing — relayed to the peer via the match channel (the
        // 1:1 /app/chat/{id}/typing path leaks the username, breaking anonymity).
        client.publish({ destination: "/app/match/typing", body: JSON.stringify(true) })
      } else if (event === "stranger_typing_stopped") {
        client.publish({ destination: "/app/match/typing", body: JSON.stringify(false) })
      } else if (event === "ACCEPT_CONSENT") {
        client.publish({ destination: "/app/match/accept-consent" })
      } else if (event === "DECLINE_CONSENT") {
        client.publish({ destination: "/app/match/decline-consent" })
      } else if (event === "START_MATCHING") {
        client.publish({ destination: "/app/match/start" })
      } else if (event === "SEND_MESSAGE") {
        client.publish({ destination: "/app/match/message", body: JSON.stringify(payload) })
      } else if (event === "SEND_GIF") {
        client.publish({ destination: "/app/match/gif", body: JSON.stringify(payload) })
      } else if (event === "REQUEST_IMAGE") {
        client.publish({ destination: "/app/match/request-image" })
      } else if (event === "ACCEPT_IMAGE_REQUEST") {
        client.publish({ destination: "/app/match/accept-image" })
      } else if (event === "DECLINE_IMAGE_REQUEST") {
        client.publish({ destination: "/app/match/decline-image" })
      } else if (event === "SEND_IMAGE") {
        client.publish({ destination: "/app/match/send-image", body: JSON.stringify(payload) })
      } else if (event === "EXIT_CHAT") {
        client.publish({ destination: "/app/match/exit" })
      } else if (event === "NEW_CHAT") {
        client.publish({ destination: "/app/match/new-chat" })
      } else if (event.startsWith("call_") && payload.chatId) {
        client.publish({
          destination: `/topic/chat/${payload.chatId}/messages`,
          body: JSON.stringify({
            event: event,
            payload: payload
          })
        })
      } else {
        client.publish({
          destination: `/app/${event}`,
          body: JSON.stringify(payload)
        })
      }
    } else {
      console.warn("STOMP client not connected. Failed to send:", event)
    }
  }, [])

  const handleChatMessage = async (chatId: string, payload: any) => {
    // Check if it's an event wrapper
    if (payload && payload.event) {
      const eventName = payload.event
      const eventData = payload.payload

      // Trigger custom registered handlers (e.g. stranger_message)
      if (handlersRef.current[eventName]) {
        handlersRef.current[eventName].forEach((handler) => handler(eventData))
      }

      switch (eventName) {
        case "reaction_updated": {
          // ── 1. Snapshot OLD reactions BEFORE updating cache ────────────────
          const reactionsPayload: { username: string; emoji: string }[] = eventData.reactions ?? []
          const myUsername = ownProfileRef.current?.username ?? ""

          // Get old reactions for this specific message before we overwrite them
          const oldMsg = await db.messages.get(eventData.messageId)
          const oldReactions: { username: string; emoji: string }[] = oldMsg?.reactions ?? []

          // Detect which reactions are genuinely NEW (not present before this event)
          const newlyAddedByOther = reactionsPayload.filter(
            (r) =>
              r.username !== myUsername && // not the current user reacting
              !oldReactions.some((old) => old.username === r.username && old.emoji === r.emoji) // was not there before
          )

          // ── 2. Update message reactions in local Dexie ───────────────────────────
          if (oldMsg) {
            await db.messages.update(eventData.messageId, { reactions: reactionsPayload })
          }

          // ── 3. Toast-only notification (no badge/unreadCount increment) ────
          // Only fire if: a NEW reaction from someone else landed on the current user's own message
          if (newlyAddedByOther.length > 0) {
            const msgBelongsToMe = oldMsg?.senderId === ownProfileRef.current?.id

            if (msgBelongsToMe) {
              const chatForReaction = await db.chats.get(chatId)
              const isMuted = chatForReaction?.muted || chatForReaction?.isMuted || false

              if (!isMuted) {
                const { username: reactorUsername, emoji } = newlyAddedByOther[0]

                // Resolve display name via a priority chain:
                // 1) contacts list  (has proper "name" display field keyed by username)
                // 2) chat.otherUser.name  (works for direct DM chats)
                // 3) raw username as last resort
                const contactsCache = queryClient.getQueryData<any>(QUERY_KEYS.CONTACTS.LIST)
                const contactsArr: any[] = Array.isArray(contactsCache)
                  ? contactsCache
                  : (contactsCache as any)?.items ?? []
                const matchedContact = contactsArr.find(
                  (c: any) => (c.username ?? "").toLowerCase() === reactorUsername.toLowerCase()
                )

                const reactorDisplayName: string =
                  matchedContact?.name ||
                  chatForReaction?.otherUser?.name ||
                  reactorUsername

                const msgSnippet = oldMsg?.content
                  ? `"${String(oldMsg.content).slice(0, 40)}${String(oldMsg.content).length > 40 ? "…" : ""}"`
                  : "your message"
                // Show the REACTOR's photo (the sender of the reaction), not
                // chat.avatar — for a DIRECT chat that is the receiver's own
                // avatar. In a DM the other user is the reactor; otherwise fall
                // back to the reactor resolved from the contacts list.
                const avatar = chatForReaction?.otherUser?.avatar ?? matchedContact?.avatar

                toast.custom((t) => (
                  <div
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent("chat:open", { detail: { chatId } }))
                      }
                      toast.dismiss(t)
                    }}
                    className="flex items-center gap-3 p-3.5 bg-[#121b22] text-white border border-white/10 shadow-2xl rounded-2xl w-[350px] cursor-pointer hover:bg-[#1a2630] transition-colors select-none pointer-events-auto"
                  >
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center shrink-0 border border-white/5">
                      {avatar ? (
                        <img src={avatar} alt={reactorDisplayName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-white">{reactorDisplayName.slice(0, 2).toUpperCase()}</span>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 text-base leading-none">{emoji}</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-violet-400 truncate">
                        {reactorDisplayName} reacted to your message
                      </h4>
                      <p className="text-sm text-neutral-300 truncate mt-0.5">{msgSnippet}</p>
                    </div>
                  </div>
                ), { duration: 4000 })
              }
            }
          }
          break
        }

        case "message_deleted": {
          // Sender deleted a message for everyone → tombstone it on this side too.
          const deletedId: string | undefined = eventData?.messageId
          if (deletedId) {
            const existing = await db.messages.get(deletedId)
            if (existing) {
              await db.messages.update(deletedId, {
                content: "This message was deleted",
                deleted: 1,
                isDeleted: true,
                attachments: [],
                mediaId: undefined,
                reactions: [],
              })
            }
            // Keep the chat-list last-message preview in sync if it points here.
            const chat = await db.chats.get(chatId)
            const lm: any = chat?.lastMessage
            if (lm && (lm.id === deletedId || lm.messageId === deletedId)) {
              await db.chats.update(chatId, {
                lastMessage: { ...lm, content: "This message was deleted", isDeleted: true, deleted: 1, attachments: [] },
              })
            }
          }
          break
        }

        case "consent_requested": {
          // The other participant wants to exchange mature content. Mark PENDING so
          // chat-area surfaces the accept dialog / persistent banner.
          const requestedBy: string | undefined = eventData?.requestedBy
          const existing = await db.consent_state.get(chatId)
          await db.consent_state.put({
            chatId,
            status: "PENDING",
            requestedByUserId: requestedBy ?? existing?.requestedByUserId,
            requestedAt: new Date().toISOString(),
            grantedAt: existing?.grantedAt,
            declineCount: existing?.declineCount ?? 0,
          })
          handlersRef.current["consent_requested"]?.forEach((h) => h(eventData))
          queryClient.invalidateQueries({ queryKey: ["consent", chatId] })
          break
        }

        case "consent_granted": {
          // Both sides agreed → future explicit messages flow. Pre-consent messages
          // are intentionally NOT delivered (none are stored locally on the receiver).
          await db.consent_state.put({
            chatId,
            status: "GRANTED",
            grantedAt: new Date().toISOString(),
            declineCount: 0, // granting clears the decline cap
          })
          handlersRef.current["consent_granted"]?.forEach((h) => h(eventData))
          queryClient.invalidateQueries({ queryKey: ["consent", chatId] })
          break
        }

        case "consent_declined": {
          // The recipient declined → the requester can't send explicit content here.
          // Mirror the server's consecutive-decline count so the 3-strike cap holds
          // on the requester's side too.
          const existing = await db.consent_state.get(chatId)
          const declineCount =
            typeof eventData?.declineCount === "number"
              ? eventData.declineCount
              : (existing?.declineCount ?? 0) + 1
          await db.consent_state.put({
            chatId,
            status: "DECLINED",
            requestedByUserId: existing?.requestedByUserId,
            declineCount,
          })
          handlersRef.current["consent_declined"]?.forEach((h) => h(eventData))
          queryClient.invalidateQueries({ queryKey: ["consent", chatId] })
          break
        }

        case "consent_revoked": {
          // Either party turned consent back off → reset to default. The revoker
          // can't re-request (server-enforced); only the other party can.
          await db.consent_state.put({ chatId, status: "NONE", requestedByUserId: undefined, declineCount: 0 })
          handlersRef.current["consent_revoked"]?.forEach((h) => h(eventData))
          queryClient.invalidateQueries({ queryKey: ["consent", chatId] })
          break
        }

        case "messages_delivered": {
          // Update all sent messages to delivered status on the sender's side
          await db.transaction("rw", [db.messages, db.chats], async () => {
            const msgs = await db.messages
              .where("chatId")
              .equals(chatId)
              .filter(m => m.senderId === ownProfileRef.current?.id && (m.status === "sent" || m.status === "sending" || !m.status))
              .toArray();
            for (const m of msgs) {
              await db.messages.update(m.messageId, { status: "delivered" });
            }
            // Reflect on the chat-list last-message tick (own message, not yet seen).
            const chat = await db.chats.get(chatId);
            const lm = chat?.lastMessage;
            if (lm && lm.senderId === ownProfileRef.current?.id
                && (lm.status === "sent" || lm.status === "sending" || !lm.status)) {
              await db.chats.update(chatId, { lastMessage: { ...lm, status: "delivered" } });
            }
          });
          break
        }
        case "messages_read": {
          // Update all sent messages to seen status on the sender's side
          await db.transaction("rw", [db.messages, db.chats], async () => {
            const msgs = await db.messages
              .where("chatId")
              .equals(chatId)
              .filter(m => m.senderId === ownProfileRef.current?.id)
              .toArray();
            for (const m of msgs) {
              await db.messages.update(m.messageId, { status: "seen" });
            }

            // Reflect "seen" on the chat-list last-message tick (own message).
            const chat = await db.chats.get(chatId);
            const lm = chat?.lastMessage;
            const patch: any = {};
            if (lm && lm.senderId === ownProfileRef.current?.id && lm.status !== "seen") {
              patch.lastMessage = { ...lm, status: "seen" };
            }
            if (ownProfileRef.current && ownProfileRef.current.id === eventData.readBy) {
              patch.unreadCount = 0;
            }
            if (Object.keys(patch).length > 0) {
              await db.chats.update(chatId, patch);
            }
          });
          break
        }
      }
    } else {
      // Raw MessageResponse payload
      if (payload?.id) {
        const exists = await db.messages.get(payload.id)
        const normalizedStatus = normalizeMessageStatus(payload.status)
        if (exists && exists.status === normalizedStatus && exists.deleted === (payload.isDeleted ? 1 : 0)) {
          console.log(`[WebSocket] Ignoring duplicate message: ${payload.id}`)
          return
        }
      }

      const mappedMsg = mapResponseToLocalMessage(chatId, payload)

      // Preserve the stable clientId if we already have this message locally
      // (e.g. our own message that was sent optimistically). The server echo has
      // no clientId, so without this the put would wipe it — changing the UI key
      // and remounting the bubble (replaying its slide-in).
      if (payload?.id && !mappedMsg.clientId) {
        const existingRow = await db.messages.get(payload.id)
        if (existingRow?.clientId) mappedMsg.clientId = existingRow.clientId
      }

      // Persist the message AND advance the watermark in ONE transaction. Doing
      // these as two separate writes let the watermark move ahead of a message
      // whose `put` failed — turning that message into a permanent interior hole
      // (it sits below the max, so the tail sync never re-requests it). Atomic
      // write means the watermark only advances if the message actually landed.
      let currentSeq = 0
      await db.transaction("rw", [db.messages, db.sync_state], async () => {
        const syncState = await db.sync_state.get(chatId)
        currentSeq = syncState?.lastSequenceNumber || 0

        await db.messages.put(mappedMsg)

        if (mappedMsg.sequenceNumber > currentSeq) {
          await db.sync_state.put({
            chatId,
            lastSequenceNumber: mappedMsg.sequenceNumber,
            lastSyncTimestamp: Date.now(),
          })
        }
      })

      // Gap-fill: if this message arrived AHEAD of our known tail (we missed some
      // in between), pull the gap from the server so no message is silently lost.
      // Network call MUST be outside the transaction above.
      if (currentSeq > 0 && mappedMsg.sequenceNumber > currentSeq + 1) {
        try {
          const gap = await MessageService.getMessagesAfter(chatId, currentSeq)
          if (gap.length > 0) {
            await db.transaction("rw", db.messages, async () => {
              for (const m of gap) {
                await db.messages.put(mapResponseToLocalMessage(chatId, m))
              }
            })
          }
        } catch (e) {
          console.warn("[WebSocket] gap backfill failed:", e)
        }
      }

      // In-memory update for the chats list
      let foundInCache = false
      const msgTimestamp = payload.timestamp || payload.createdAt || new Date().toISOString()
      const newLastMessage = {
        id: payload.id,
        content: payload.content || "",
        senderId: payload.senderId,
        senderName: payload.senderName || "",
        type: payload.type || payload.messageType || "TEXT",
        timestamp: msgTimestamp,
        isDeleted: payload.isDeleted || false,
      }

      // Check if this chat is currently open/active
      const activeChatId = typeof window !== "undefined" ? (window as any).activeChatId : undefined
      const isFromOther = payload.senderId !== ownProfileRef.current?.id
      const isActiveChat = chatId === activeChatId

      const chat = await db.chats.get(chatId)
      if (chat) {
        foundInCache = true
        await db.chats.update(chatId, {
          lastMessageId: payload.id,
          lastMessagePreview: payload.content || "Media attachment",
          unreadCount: (isFromOther && !isActiveChat) ? chat.unreadCount + 1 : chat.unreadCount,
          updatedAt: msgTimestamp,
          lastMessage: newLastMessage,
        })
      } else {
        // If chat is not in local database, fetch it from backend and put it
        try {
          const serverChat = await ChatService.getChatById(chatId)
          if (serverChat) {
            serverChat.lastMessage = {
              id: payload.id,
              content: payload.content || "",
              senderId: payload.senderId,
              senderName: payload.senderName || "",
              type: payload.type || payload.messageType || "TEXT",
              timestamp: msgTimestamp,
              isDeleted: payload.isDeleted || false,
            }
            serverChat.unreadCount = isFromOther && !isActiveChat ? 1 : 0
            serverChat.updatedAt = msgTimestamp
          }
          await putChatSafely(serverChat)
          foundInCache = true
        } catch (err) {
          console.error("[WebSocket] Failed to fetch and cache new chat:", err)
        }
      }

      if (!foundInCache) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
      }

      // If the message is from another user and the chat is currently active,
      // debounce markAsRead so rapid-fire messages only trigger one API call
      if (isFromOther && isActiveChat) {
        if (markReadTimerRef.current[chatId]) {
          clearTimeout(markReadTimerRef.current[chatId])
        }
        markReadTimerRef.current[chatId] = setTimeout(() => {
          ChatService.markAsRead(chatId).catch((err) => {
            console.error("[WebSocket] Auto-markAsRead failed:", err)
          })
          delete markReadTimerRef.current[chatId]
        }, 500)
      }

      // If the message is from another user and the chat is NOT active,
      // mark as delivered (user received it but hasn't opened the chat)
      if (isFromOther && !isActiveChat) {
        if (markReadTimerRef.current[`deliver_${chatId}`]) {
          clearTimeout(markReadTimerRef.current[`deliver_${chatId}`])
        }
        markReadTimerRef.current[`deliver_${chatId}`] = setTimeout(() => {
          ChatService.markAsDelivered(chatId).catch((err) => {
            console.error("[WebSocket] Auto-markAsDelivered failed:", err)
          })
          delete markReadTimerRef.current[`deliver_${chatId}`]
        }, 500)
      }

      // Find the target chat to check if it's muted
      const chatForMuteCheck = await db.chats.get(chatId)
      const isMuted = chatForMuteCheck?.muted || chatForMuteCheck?.isMuted || false

      // Play sound notification if message is from another user and chat is not muted
      if (isFromOther && !isMuted) {
        const settings = useLobbyStore.getState().notificationSettings
        if (settings.sound) {
          const isGroup = chatForMuteCheck?.chatType === "GROUP" || (chatForMuteCheck as any)?.type === "group"
          const hasSound = isGroup 
            ? settings.groupTone !== "none" 
            : settings.messageTone !== "none"
            
          if (hasSound) {
            playNotificationSound()
          }
        }
      }

      // Browser-level notification when the tab is backgrounded / minimized. Separate
      // from push (this works while the page is alive & the socket connected) and gated
      // by the Desktop Notifications setting + OS permission. showBrowserNotification
      // no-ops while the page is visible — the in-app toast below covers the foreground.
      if (isFromOther && !isMuted) {
        const isGroup = chatForMuteCheck?.chatType === "GROUP" || (chatForMuteCheck as any)?.type === "group"
        const otherParticipant = chatForMuteCheck?.otherUser ?? chatForMuteCheck?.participants?.find((p) => p.id !== ownProfileRef.current?.id)
        const sender = isGroup
          ? (payload.senderName || chatForMuteCheck?.name || "Group Chat")
          : (otherParticipant?.name || payload.senderName || "Someone")
        const snippet = (payload.content ? displayContent(payload.content) : "") || "Sent an attachment"
        const avatar = isGroup
          ? (payload.senderAvatar || chatForMuteCheck?.avatar)
          : (otherParticipant?.avatar || payload.senderAvatar)
        void showBrowserNotification({
          title: isGroup ? `${sender}` : `Message from ${sender}`,
          body: snippet,
          icon: avatar || "/icon-192.png",
          tag: `chat:${chatId}`,
          data: { chatId, url: `/?chat=${encodeURIComponent(chatId)}#messages` },
        })
      }

      // Toast notification trigger for messages from other users (only for non-active and non-muted chats)
      if (isFromOther && !isActiveChat && !isMuted) {
        const isGroup = chatForMuteCheck?.chatType === "GROUP" || (chatForMuteCheck as any)?.type === "group"
        const otherParticipant = chatForMuteCheck?.otherUser ?? chatForMuteCheck?.participants?.find((p) => p.id !== ownProfileRef.current?.id)
        const sender = isGroup
          ? (payload.senderName || chatForMuteCheck?.name || "Group Chat")
          : (otherParticipant?.name || payload.senderName || "Someone")
        const snippet = (payload.content ? displayContent(payload.content) : "") || "Sent an attachment"

        toast.custom((t) => {
          // Show the SENDER's photo, never chat.avatar (for a DIRECT chat that
          // is the current user's / receiver's own avatar). In a DM the other
          // participant IS the sender; in a group the sender comes from the
          // message payload, with the group avatar as a last resort.
          const avatar = isGroup
            ? (payload.senderAvatar || chatForMuteCheck?.avatar)
            : (otherParticipant?.avatar || payload.senderAvatar)
          const fallback = sender.slice(0, 2).toUpperCase()

          return (
            <div
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("chat:open", { detail: { chatId } }))
                }
                toast.dismiss(t)
              }}
              className="flex items-center justify-between gap-3 p-3.5 bg-[#121b22] text-white border border-white/10 shadow-2xl rounded-2xl w-[350px] cursor-pointer hover:bg-[#1a2630] transition-colors select-none pointer-events-auto"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center shrink-0 border border-white/5 relative">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={sender}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-white">
                      {fallback}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-emerald-500 truncate">
                    Message from {sender}
                  </h4>
                  <p className="text-sm text-neutral-300 truncate mt-0.5">
                    {snippet}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toast.dismiss(t)
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-neutral-400 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })
      }
    }
  }

  const handleChatTyping = (chatId: string, payload: any) => {
    const isTyping = payload.typing
    const username = payload.username
    const userId = payload.userId
    const currentUserId = ownProfileRef.current?.id

    const shouldIgnore = userId && currentUserId && userId === currentUserId

    console.log("[TYPING EVENT] handleChatTyping payload details:", {
      currentLoggedInUserId: currentUserId,
      chatId,
      senderId: userId,
      senderUsername: username,
      isTyping,
      ignored: shouldIgnore ? "YES (Self typing event)" : "NO"
    })

    if (shouldIgnore) {
      return
    }

    // activity: "TYPING" | "RECORDING_AUDIO" | "RECORDING_VIDEO" | "NONE" | undefined
    const activity: string | undefined = payload.activity
    const data = { chatId, username, userId, activity }

    // Dispatch the fine-grained activity (used for "recording audio/video…").
    if (handlersRef.current["chat_activity"]) {
      handlersRef.current["chat_activity"].forEach((h) => h(data))
    }

    if (isTyping) {
      if (handlersRef.current["typing_started"]) {
        handlersRef.current["typing_started"].forEach((h) => h(data))
      }
      if (handlersRef.current["stranger_typing_started"]) {
        handlersRef.current["stranger_typing_started"].forEach((h) => h(data))
      }
    } else {
      if (handlersRef.current["typing_stopped"]) {
        handlersRef.current["typing_stopped"].forEach((h) => h(data))
      }
      if (handlersRef.current["stranger_typing_stopped"]) {
        handlersRef.current["stranger_typing_stopped"].forEach((h) => h(data))
      }
    }
  }

  const subscribeToChat = (chatId: string) => {
    const client = stompClientRef.current
    if (!client || !client.connected) return

    if (chatSubscriptionsRef.current.has(chatId)) return

    console.log(`[STOMP] Subscribing to chat: ${chatId}`)

    const messagesSub = client.subscribe(`/topic/chat/${chatId}/messages`, (message) => {
      try {
        const payload = JSON.parse(message.body)
        formatMediaUrls(payload)
        enqueuePerChat(chatId, () => handleChatMessage(chatId, payload))
      } catch (err) {
        console.error("[STOMP] Error parsing message:", err)
      }
    })

    const typingSub = client.subscribe(`/topic/chat/${chatId}/typing`, (message) => {
      try {
        const payload = JSON.parse(message.body)
        handleChatTyping(chatId, payload)
      } catch (err) {
        console.error("[STOMP] Error parsing typing indicator:", err)
      }
    })

    chatSubscriptionsRef.current.set(chatId, { messages: messagesSub, typing: typingSub })
  }

  const unsubscribeFromChat = (chatId: string) => {
    const subs = chatSubscriptionsRef.current.get(chatId)
    if (subs) {
      console.log(`[STOMP] Unsubscribing from chat: ${chatId}`)
      subs.messages.unsubscribe()
      subs.typing.unsubscribe()
      chatSubscriptionsRef.current.delete(chatId)
    }
  }

  const subscribeToPresence = useCallback((username: string, sticky = false) => {
    const client = stompClientRef.current
    if (!client || !client.connected) return

    if (sticky) stickyPresenceRef.current.add(username)
    if (contactSubscriptionsRef.current.has(username)) return

    console.log(`[STOMP] Subscribing to presence for: ${username}`)

    const sub = client.subscribe(`/topic/presence/${username}`, (message) => {
      try {
        const payload = JSON.parse(message.body)
        formatMediaUrls(payload)
        console.log(`[STOMP] Received presence update for ${username}:`, payload)

        const statusLower = payload.status ? payload.status.toLowerCase() : "offline"
        const lastSeenVal = payload.lastSeen || null

        // Single global live-presence source of truth — every view (chat list,
        // chat header, friends, discover) reads this and updates in real time.
        useLivePresenceStore.getState().setStatus(payload.userId, statusLower, lastSeenVal)

        // In-memory update for presence user query
        queryClient.setQueryData(QUERY_KEYS.PRESENCE.USER(payload.userId), {
          status: statusLower,
          lastSeen: lastSeenVal,
        })

        // In-memory update for all chats queries (list and details)
        queryClient.setQueriesData({ queryKey: ["chats"] }, (oldData: any) => {
          if (!oldData) return oldData
          if (Array.isArray(oldData)) {
            return oldData.map((c) =>
              updateChatPresence(c, payload.userId, statusLower, lastSeenVal)
            )
          } else {
            return updateChatPresence(oldData, payload.userId, statusLower, lastSeenVal)
          }
        })

        // In-memory update for all contacts queries (list and details)
        queryClient.setQueriesData({ queryKey: ["contacts"] }, (oldData: any) => {
          if (!oldData) return oldData
          if (Array.isArray(oldData)) {
            return oldData.map((c) =>
              updateContactPresence(c, payload.userId, statusLower, lastSeenVal)
            )
          } else {
            return updateContactPresence(oldData, payload.userId, statusLower, lastSeenVal)
          }
        })

        const eventName = `user_${payload.status.toLowerCase()}`
        if (handlersRef.current[eventName]) {
          handlersRef.current[eventName].forEach((h) => h(payload))
        }
      } catch (err) {
        console.error("[STOMP] Error parsing presence status:", err)
      }
    })

    contactSubscriptionsRef.current.set(username, sub)
  }, [queryClient])

  const unsubscribeFromPresence = useCallback((username: string) => {
    const sub = contactSubscriptionsRef.current.get(username)
    if (sub) {
      console.log(`[STOMP] Unsubscribing from presence for: ${username}`)
      sub.unsubscribe()
      contactSubscriptionsRef.current.delete(username)
    }
  }, [])

  const syncChatSubscriptions = (client: Client) => {
    if (!client || !client.connected) return
    const activeChatIds = new Set(chats.map((c: any) => c.id))

    chats.forEach((chat: any) => {
      subscribeToChat(chat.id)
    })

    for (const chatId of chatSubscriptionsRef.current.keys()) {
      if (!activeChatIds.has(chatId) && chatId !== strangerChatIdRef.current) {
        unsubscribeFromChat(chatId)
      }
    }
  }

  const syncContactSubscriptions = (client: Client) => {
    if (!client || !client.connected) return
    const usernames = new Set(contacts.map((c: any) => c.username).filter(Boolean) as string[])

    contacts.forEach((contact: any) => {
      if (contact.username) {
        subscribeToPresence(contact.username)
      }
    })

    for (const username of contactSubscriptionsRef.current.keys()) {
      if (!usernames.has(username) && !stickyPresenceRef.current.has(username)) {
        unsubscribeFromPresence(username)
      }
    }
  }

  const connect = () => {
    const token = getAccessToken()
    if (!token) {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate()
        stompClientRef.current = null
      }
      connectedTokenRef.current = null
      setIsConnected(false)
      return
    }

    if (stompClientRef.current && connectedTokenRef.current === token) {
      console.log("[WebSocket] Already connected/connecting with the current token. Skipping reconnect.")
      return
    }

    connectedTokenRef.current = token
    if (stompClientRef.current) {
      stompClientRef.current.deactivate()
      stompClientRef.current = null
    }

    const getWsUrl = (): string => {
      if (typeof window !== "undefined") {
        const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
        
        if (checkIsSameJar()) {
          // Same JAR: use current browser origin
          const host = window.location.host;
          const wsPath = `${process.env.NEXT_PUBLIC_API_PATH || "/api/v1"}/ws`;
          return `${wsProto}//${host}${wsPath}`;
        } else {
          // Different: use NEXT_PUBLIC_API_URL (reads .env)
          let apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
          if (apiUrl.startsWith("/")) {
            apiUrl = `${window.location.protocol}//${window.location.host}${apiUrl}`;
          }
          
          try {
            const url = new URL(apiUrl);
            // Replace localhost with actual IP address for mobile local network access
            if (
              (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
              window.location.hostname !== "localhost" &&
              window.location.hostname !== "127.0.0.1"
            ) {
              url.hostname = window.location.hostname;
            }
            const wsProtocol = window.location.protocol === "https:" ? "wss:" : (url.protocol === "https:" ? "wss:" : "ws:");
            const host = url.host;
            const wsPath = `${url.pathname.replace(/\/$/, "")}/ws`;
            return `${wsProtocol}//${host}${wsPath}`;
          } catch (e) {
            console.error("[WebSocket] Failed to parse API URL:", e);
          }
        }
      }
      return "ws://localhost:8080/api/v1/ws";
    }

    const wsUrl = getWsUrl()

    console.log("[WebSocket] Connecting via STOMP to:", wsUrl)

    const client = new Client({
      brokerURL: wsUrl,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: (str) => {
        console.log("[STOMP Debug]", str)
      },
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, capped at 30s. Prevents
      // reconnect storms when the backend is down or the network is flapping
      // (mobile network switching, WiFi loss, server restart).
      reconnectDelay: 1000,
      reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
      maxReconnectDelay: 30000,
      // App-level STOMP heartbeats. The server broker is configured with a
      // matching 25s heartbeat (see WebSocketConfig#configureMessageBroker), so
      // a dead connection (device sleep, network loss, crashed tab) is detected
      // within ~2 missed beats (~50s) and the client auto-reconnects.
      heartbeatIncoming: 25000,
      heartbeatOutgoing: 25000,
    })

    client.onConnect = (frame) => {
      console.log("[STOMP] Connected successfully", frame)
      setIsConnected(true)

      // Heal-on-(re)connect: a disconnect window is exactly when real-time
      // messages get dropped (the socket flaps, /topic broadcasts during the gap
      // never arrive). onConnect fires on every reconnect, so re-pull the OPEN
      // chat's recent window + tail and upsert by id (idempotent). This closes the
      // tail-loss hole (a dropped LAST message has no follow-up to trigger the
      // per-message gap-fill, so it would otherwise stay missing until reopen) and
      // makes delivery complete within one reconnect instead of one chat-reopen.
      const resyncChatId = typeof window !== "undefined" ? (window as any).activeChatId : undefined
      if (resyncChatId) {
        ;(async () => {
          try {
            const localMax = await getLocalMaxSequence(resyncChatId)
            const recent = await MessageService.getMessages(resyncChatId, { limit: 50 })
            const tail = localMax > 0 ? await MessageService.getMessagesAfter(resyncChatId, localMax) : []
            const byId = new Map<string, any>()
            for (const m of recent.items) byId.set(m.id, m)
            for (const m of tail) byId.set(m.id, m)
            if (byId.size > 0) {
              await db.transaction("rw", db.messages, async () => {
                for (const m of byId.values()) {
                  await db.messages.put(mapResponseToLocalMessage(resyncChatId, m))
                }
              })
            }
          } catch (e) {
            console.warn("[WebSocket] reconnect resync failed:", e)
          }
        })()
      }
      // Refresh the chat list too so previews/unread/last-message heal after a gap.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })

      // Application-level presence heartbeat every 30s. The server's watchdog
      // marks the user OFFLINE if these stop for >60s (tab closed, crash, sleep,
      // network loss) — server-authoritative, never trusting client state.
      if (presenceHeartbeatRef.current) clearInterval(presenceHeartbeatRef.current)
      const beat = () => {
        try {
          if (client.connected) client.publish({ destination: "/app/presence/heartbeat" })
        } catch (err) {
          console.warn("[Presence] heartbeat publish failed", err)
        }
      }
      beat() // send immediately on connect, then every 30s
      presenceHeartbeatRef.current = setInterval(beat, 30000)

      // Sync initial visibility: if we (re)connected while the tab is hidden,
      // immediately tell the server we're idle (otherwise CONNECT just set us
      // ONLINE). The visibilitychange listener handles subsequent transitions.
      // Exception: on the Connect (match) tab, presence ignores display state, so
      // a hidden tab there stays ONLINE.
      if (typeof document !== "undefined" && document.hidden &&
          getTabFromHash(window.location.hash) !== "match") {
        try {
          client.publish({ destination: "/app/presence/visibility", body: "false" })
        } catch { /* not connected yet — ignored */ }
      }

      // Subscribe to matchmaking radar
      if (matchSubscriptionRef.current) {
        matchSubscriptionRef.current.unsubscribe()
      }
      matchSubscriptionRef.current = client.subscribe("/user/queue/match", (message) => {
        try {
          const envelope = JSON.parse(message.body)
          console.log("[STOMP] Received match envelope:", envelope)
          const { event, payload } = envelope
          
          if (payload) {
            formatMediaUrls(payload)
          }

          if (event && handlersRef.current[event]) {
            handlersRef.current[event].forEach((handler) => handler(payload))
          }

          // Browser notification for an incoming stranger message while backgrounded.
          if (event === "MESSAGE_RECEIVED" || event === "GIF_RECEIVED" || event === "IMAGE_RECEIVED") {
            void showBrowserNotification({
              title: "New message",
              body: event === "MESSAGE_RECEIVED" ? (payload?.content || "") : "Sent an attachment",
              tag: "match-chat",
              data: { url: "/#match/quick" },
            })
          }
        } catch (err) {
          console.error("[STOMP] Match payload parse error:", err)
        }
      })

      // On (re)connect, ask the server to replay any stranger-match messages buffered
      // while this device was backgrounded/offline. Sent after the subscription above
      // so the broker has it registered before the replay lands; replayed events carry
      // their original ids, so the match store upserts them without duplicates. No-op
      // server-side when nothing is buffered.
      setTimeout(() => {
        try {
          if (client.connected) client.publish({ destination: "/app/match/resume" })
        } catch { /* not connected — ignored */ }
      }, 500)

      // Subscribe to live matchmaking online count (replaces 10s polling).
      // Server broadcasts { count } on every change; write straight to cache.
      client.subscribe("/topic/match/online", (message) => {
        try {
          const payload = JSON.parse(message.body)
          if (typeof payload?.count === "number") {
            queryClient.setQueryData(QUERY_KEYS.MATCH.ONLINE_COUNT, payload.count)
          }
        } catch (err) {
          console.error("[STOMP] Online count parse error:", err)
        }
      })

      // Subscribe to the server-driven total unread count → drive the app badge.
      client.subscribe("/user/queue/unread", (message) => {
        try {
          const payload = JSON.parse(message.body)
          if (typeof payload?.totalUnread === "number") {
            setBadge(payload.totalUnread)
            handlersRef.current["unread_count"]?.forEach((h) => h(payload))
          }
        } catch (err) {
          console.error("[STOMP] Unread count parse error:", err)
        }
      })

      // Someone viewed my profile → refresh the live count badge and the views list.
      client.subscribe("/user/queue/profile-views", (message) => {
        try {
          const payload = JSON.parse(message.body)
          if (typeof payload?.total === "number" && typeof payload?.unseen === "number") {
            queryClient.setQueryData(QUERY_KEYS.PROFILE_VIEWS.COUNT, {
              total: payload.total,
              unseen: payload.unseen,
            })
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE_VIEWS.LIST })
            handlersRef.current["profile_viewed"]?.forEach((h) => h(payload))
          }
        } catch (err) {
          console.error("[STOMP] Profile-view event parse error:", err)
        }
      })

      // Subscribe to user chat events (e.g. chat_created, chat_deleted)
      if (chatsSubscriptionRef.current) {
        chatsSubscriptionRef.current.unsubscribe()
      }
      chatsSubscriptionRef.current = client.subscribe("/user/queue/chats", (message) => {
        try {
          const payload = JSON.parse(message.body)
          formatMediaUrls(payload)
          console.log("[STOMP] Received user chat event:", payload)
          if (payload.event === "chat_created" || payload.event === "chat_updated") {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
            if (payload.payload?.chatId) {
              ChatService.getChatById(payload.payload.chatId).then((c) => {
                putChatSafely(c)
              }).catch((err) => {
                console.error("[WebSocket] Failed to fetch and cache new chat:", err)
              })
            }
          } else if (payload.event === "chat_deleted" && payload.payload?.chatId) {
            const deletedChatId = payload.payload.chatId
            // 1. Remove the chat from local Dexie database instantly
            db.transaction("rw", [db.chats, db.messages, db.sync_state], async () => {
              await db.chats.delete(deletedChatId)
              await db.messages.where("chatId").equals(deletedChatId).delete()
              await db.sync_state.delete(deletedChatId)
            }).catch((err) => {
              console.error("[WebSocket] Failed to delete chat from Dexie:", err)
            })

            // 2. Remove the chat from QUERY_KEYS.CHATS.LIST cache instantly
            queryClient.setQueryData<any[]>(QUERY_KEYS.CHATS.LIST, (oldChats) => {
              if (!oldChats) return oldChats
              return oldChats.filter((c) => c.id !== deletedChatId)
            })

            // 3. Remove details cache
            queryClient.removeQueries({ queryKey: QUERY_KEYS.CHATS.DETAIL(deletedChatId) })
            
            // 4. Remove messages list cache
            queryClient.removeQueries({ queryKey: QUERY_KEYS.MESSAGES.LIST(deletedChatId) })

            // 5. Force refetch list with a delay to allow backend transaction to commit
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
            }, 500)

            // 6. Close the active chat if B currently has this deleted chat open
            const activeChatId = typeof window !== "undefined" ? (window as any).activeChatId : undefined
            if (deletedChatId === activeChatId) {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("chat:close", { detail: { chatId: deletedChatId } }))
              }
            }
          } else if (payload.event === "message_received" && payload.payload) {
            const { chatId, message: msgPayload } = payload.payload
            if (chatId && msgPayload) {
              enqueuePerChat(chatId, () => handleChatMessage(chatId, msgPayload))
            }
          }
        } catch (err) {
          console.error("[STOMP] User chat event parse error:", err)
        }
      })

      // Subscribe to friend events
      if (friendsSubscriptionRef.current) {
        friendsSubscriptionRef.current.unsubscribe()
      }
      friendsSubscriptionRef.current = client.subscribe("/user/queue/friends", (message) => {
        try {
          const payload = JSON.parse(message.body)
          console.log("[STOMP] Received friend event:", payload)
          
          if (payload.event === "friend_request_received" || payload.event === "friend_request_cancelled" || payload.event === "friend_request_rejected") {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONTACTS.REQUESTS })
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DISCOVER.LIST })
            
            if (payload.event === "friend_request_received") {
              const settings = useLobbyStore.getState().notificationSettings
              if (settings.sound && settings.messageTone !== "none") {
                playNotificationSound()
              }
            }
          }
          if (payload.event === "friend_request_accepted" || payload.event === "friend_removed") {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONTACTS.REQUESTS })
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONTACTS.LIST })
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DISCOVER.LIST })
          }
        } catch (err) {
          console.error("[STOMP] Friend event parse error:", err)
        }
      })

      // Subscribe to notifications
      if (notificationsSubscriptionRef.current) {
        notificationsSubscriptionRef.current.unsubscribe()
      }
      notificationsSubscriptionRef.current = client.subscribe("/user/queue/notifications", (message) => {
        try {
          console.log("[STOMP] Received notification:", message.body)
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS.LIST })
          
          const settings = useLobbyStore.getState().notificationSettings
          if (settings.sound && settings.messageTone !== "none") {
            playNotificationSound()
          }
        } catch (err) {
          console.error("[STOMP] Failed to process notification:", err)
        }
      })

      // Subscribe to lobby actions
      if (lobbySubscriptionRef.current) {
        lobbySubscriptionRef.current.unsubscribe()
      }
      lobbySubscriptionRef.current = client.subscribe("/topic/lobby", (message) => {
        try {
          const payload = JSON.parse(message.body)
          console.log("[STOMP] Received lobby action:", payload)
          if (payload.action === "JOIN") {
            // Update react-query cache for lobby
            queryClient.setQueryData<any[]>(QUERY_KEYS.PRESENCE.LOBBY, (oldUsers) => {
              if (!oldUsers) return [payload.user]
              if (payload.user.username === ownProfileRef.current?.username || payload.user.id === ownProfileRef.current?.id) return oldUsers
              if (oldUsers.some((u) => u.id === payload.user.id)) return oldUsers
              return [...oldUsers, payload.user]
            })

            if (handlersRef.current["lobby_joined"]) {
              handlersRef.current["lobby_joined"].forEach((h) => h(payload.user))
            }
          } else if (payload.action === "LEAVE") {
            // Update react-query cache for lobby
            queryClient.setQueryData<any[]>(QUERY_KEYS.PRESENCE.LOBBY, (oldUsers) => {
              if (!oldUsers) return []
              return oldUsers.filter((u) => u.username !== payload.username)
            })

            if (handlersRef.current["lobby_left"]) {
              handlersRef.current["lobby_left"].forEach((h) => h(payload.username))
            }
          }
        } catch (err) {
          console.error("[STOMP] Lobby message parse error:", err)
        }
      })

      // Subscribe to lobby chat messages
      if (lobbyChatSubscriptionRef.current) {
        lobbyChatSubscriptionRef.current.unsubscribe()
      }
      lobbyChatSubscriptionRef.current = client.subscribe("/user/queue/lobby-chat", (message) => {
        try {
          const payload = JSON.parse(message.body)
          console.log("[STOMP] Received lobby chat message:", payload)

          // Always persist to lobby store (works even when LobbyDashboard is unmounted)
          const ownUsername = ownProfileRef.current?.username
          if (ownUsername) {
            useLobbyStore.getState().addMessage(payload, ownUsername)
          }

          if (payload.sender !== ownUsername) {
            const settings = useLobbyStore.getState().notificationSettings
            if (settings.sound && settings.groupTone !== "none") {
              playNotificationSound()
            }
            // Browser notification while the tab is backgrounded / minimized.
            void showBrowserNotification({
              title: `Message from ${payload.sender || "Stranger"}`,
              body: displayContent(payload.content || "") || "New message",
              tag: `lobby:${payload.sender || "stranger"}`,
              data: { url: "/#match/lobby" },
            })
          }

          // Fire registered handlers (sound notifications etc.)
          if (handlersRef.current["lobby_message"]) {
            handlersRef.current["lobby_message"].forEach((h) => h(payload))
          }
        } catch (err) {
          console.error("[STOMP] Lobby chat message parse error:", err)
        }
      })

      // Subscribe to lobby typing status
      if (lobbyTypingSubscriptionRef.current) {
        lobbyTypingSubscriptionRef.current.unsubscribe()
      }
      lobbyTypingSubscriptionRef.current = client.subscribe("/user/queue/lobby-typing", (message) => {
        try {
          const payload = JSON.parse(message.body)
          console.log("[STOMP] Received lobby typing status:", payload)
          if (handlersRef.current["lobby_typing"]) {
            handlersRef.current["lobby_typing"].forEach((h) => h(payload))
          }
        } catch (err) {
          console.error("[STOMP] Lobby typing status parse error:", err)
        }
      })

      // Sync active topics
      syncChatSubscriptions(client)
      syncContactSubscriptions(client)

      // Re-establish STICKY presence subscriptions (open chat partner, discover people,
      // profile modal). onWebSocketClose cleared contactSubscriptionsRef, and the
      // component effects that registered these don't re-run on a reconnect — so without
      // this, a reconnect strands them and live status stops updating until a full page
      // reload. stickyPresenceRef survives reconnects precisely so we can replay them here.
      stickyPresenceRef.current.forEach((username) => subscribeToPresence(username, true))

      // markAllAsDelivered is now handled via separate useEffect to prevent race conditions with profile loading
    }

    client.onWebSocketClose = () => {
      console.log("[STOMP] WebSocket connection closed")
      setIsConnected(false)
      if (presenceHeartbeatRef.current) {
        clearInterval(presenceHeartbeatRef.current)
        presenceHeartbeatRef.current = null
      }
      chatSubscriptionsRef.current.clear()
      contactSubscriptionsRef.current.clear()
      processedMessageIdsRef.current.clear()
      matchSubscriptionRef.current = null
      chatsSubscriptionRef.current = null
      friendsSubscriptionRef.current = null
      notificationsSubscriptionRef.current = null
      lobbySubscriptionRef.current = null
      lobbyChatSubscriptionRef.current = null
      lobbyTypingSubscriptionRef.current = null
    }

    client.onStompError = (frame) => {
      console.error("[STOMP] Broker error:", frame.headers["message"])
      console.error("[STOMP] Details:", frame.body)
    }

    stompClientRef.current = client
    client.activate()
  }

  // Synchronize chat subscriptions on chats list updates
  useEffect(() => {
    if (stompClientRef.current?.connected) {
      syncChatSubscriptions(stompClientRef.current)
    }
  }, [chats])

  // Synchronize contact subscriptions on contacts list updates
  useEffect(() => {
    if (stompClientRef.current?.connected) {
      syncContactSubscriptions(stompClientRef.current)
    }
  }, [contacts])

  // Effect to manage websocket connection lifecycle based on auth state
  useEffect(() => {
    connect()

    const handleTokenChange = () => {
      connect()
    }

    window.addEventListener("auth:token-changed", handleTokenChange)

    return () => {
      window.removeEventListener("auth:token-changed", handleTokenChange)
      // Cancel any pending mark-read / mark-delivered debounce timers so their
      // network callbacks don't fire after the provider unmounts (leak + work
      // against a torn-down client).
      Object.values(markReadTimerRef.current).forEach(clearTimeout)
      markReadTimerRef.current = {}
      if (presenceHeartbeatRef.current) {
        clearInterval(presenceHeartbeatRef.current)
        presenceHeartbeatRef.current = null
      }
      if (stompClientRef.current) {
        stompClientRef.current.deactivate()
      }
      chatSubscriptionsRef.current.clear()
      contactSubscriptionsRef.current.clear()
      matchSubscriptionRef.current = null
      chatsSubscriptionRef.current = null
      friendsSubscriptionRef.current = null
      notificationsSubscriptionRef.current = null
      lobbySubscriptionRef.current = null
      lobbyChatSubscriptionRef.current = null
      lobbyTypingSubscriptionRef.current = null
    }
  }, [])

  // Tab-visibility presence (WhatsApp-Web style): switching/backgrounding the tab
  // marks us IDLE to others (auto-OFFLINE after a 10-min grace) even though the
  // socket stays alive; returning marks us ONLINE again. sendEvent no-ops when
  // disconnected; on reconnect, onConnect re-syncs the initial visibility.
  useEffect(() => {
    if (typeof document === "undefined") return
    const onVisibility = () => {
      // On the Connect (match) tab, presence must NOT follow display state:
      // backgrounding/minimizing keeps the user ONLINE. Suppress only the
      // "hidden" signal there; every other tab behaves exactly as before.
      if (document.hidden && getTabFromHash(window.location.hash) === "match") return
      sendEvent(document.hidden ? "presence_hidden" : "presence_visible", {})
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [sendEvent])

  // Genuine tab/window close from the Connect tab: notify others INSTANTLY rather than
  // letting them linger as "present" until the server-side disconnect-grace backstop
  // fires. We can't perfectly distinguish a close from a background, but `pagehide` with
  // persisted=false is the real unload path — a backgrounding PWA fires persisted=true
  // (bfcache) or plain visibilitychange, which we deliberately ignore so the grace +
  // reconnect path keeps the lobby/match alive. Best-effort: the STOMP frame may not
  // flush during unload, but the grace reaper guarantees eventual cleanup regardless.
  useEffect(() => {
    if (typeof window === "undefined") return
    const onPageHide = (e: PageTransitionEvent) => {
      if (e.persisted) return
      if (getTabFromHash(window.location.hash) !== "match") return
      const { segments } = parseHash(window.location.hash)
      if (segments.includes("lobby")) sendEvent("lobby/leave", {})
      if (segments.includes("quick")) sendEvent("EXIT_CHAT", {})
    }
    window.addEventListener("pagehide", onPageHide)
    return () => window.removeEventListener("pagehide", onPageHide)
  }, [sendEvent])

  // Instant reconnect on resume. When the page is backgrounded/suspended (mobile PWA,
  // minimized window) the socket dies and STOMP's exponential backoff timer is frozen,
  // so the next reconnect attempt can be scheduled far out. The moment we're visible
  // again — or the network returns — kick an immediate fresh connect instead of waiting
  // it out. Only act when the client WANTS to be connected (active) but currently isn't,
  // so we never disturb a healthy or intentionally-stopped (logged-out) connection.
  useEffect(() => {
    if (typeof window === "undefined") return
    const reconnectNow = () => {
      const c = stompClientRef.current as any
      if (!c || !c.active || c.connected) return
      try {
        // deactivate→activate resets the backoff and connects right away.
        Promise.resolve(c.deactivate())
          .then(() => { try { c.activate() } catch { /* ignore */ } })
          .catch(() => { /* ignore */ })
      } catch { /* ignore */ }
    }
    const onVisible = () => { if (!document.hidden) reconnectNow() }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("online", reconnectNow)
    window.addEventListener("focus", reconnectNow)
    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("online", reconnectNow)
      window.removeEventListener("focus", reconnectNow)
    }
  }, [])

  const hasMarkedDeliveredRef = useRef(false)

  // Reset marked delivered status when disconnected
  useEffect(() => {
    if (!isConnected) {
      hasMarkedDeliveredRef.current = false
    }
  }, [isConnected])

  // Mark all pending messages as delivered once we are connected and profile is loaded
  useEffect(() => {
    if (isConnected && ownProfile && !ownProfile.isGuest && !hasMarkedDeliveredRef.current) {
      hasMarkedDeliveredRef.current = true
      ChatService.markAllAsDelivered().catch((err: any) => {
        const status = err?.status ?? err?.response?.status
        if (status !== 401 && status !== 403 && status !== 0) {
          console.error("[WebSocket] markAllAsDelivered failed:", status, err?.message || err)
        }
      })
    }
  }, [isConnected, ownProfile])

  const contextValue = useMemo(() => ({
    isConnected,
    sendEvent,
    registerHandler,
    subscribeToPresence,
    unsubscribeFromPresence,
  }), [
    isConnected,
    sendEvent,
    registerHandler,
    subscribeToPresence,
    unsubscribeFromPresence,
  ])

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  )
}
