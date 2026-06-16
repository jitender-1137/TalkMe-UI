"use client"

import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Client } from "@stomp/stompjs"
import { toast } from "sonner"
import { getAccessToken } from "@/src/api/token-store"
import { QUERY_KEYS } from "@/src/api/query-keys"
import { useChats } from "@/src/api/hooks/useChats"
import { useContacts } from "@/src/api/hooks/useContacts"
import { useProfile } from "@/src/api/hooks/useProfile"
import { MessageService } from "@/src/api/services/message.service"
import { ChatService } from "@/src/api/services/chat.service"
import type { Chat, Contact } from "@/src/api/types"
import { formatMediaUrls, checkIsSameJar } from "@/src/api/client"
import { X } from "lucide-react"
import { useLobbyStore } from "@/components/lobby/lobby-store"
import { db, mapResponseToLocalMessage, mapResponseToLocalChat, normalizeMessageStatus, putChatSafely } from "@/src/api/db"


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
  subscribeToPresence: (username: string) => void
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
  const matchSubscriptionRef = useRef<any>(null)
  const chatsSubscriptionRef = useRef<any>(null)
  const friendsSubscriptionRef = useRef<any>(null)
  const notificationsSubscriptionRef = useRef<any>(null)
  const lobbySubscriptionRef = useRef<any>(null)
  const lobbyChatSubscriptionRef = useRef<any>(null)
  const lobbyTypingSubscriptionRef = useRef<any>(null)
  const strangerChatIdRef = useRef<string | null>(null)
  const markReadTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
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
      } else if (event === "stranger_typing_started") {
        if (strangerChatIdRef.current) {
          client.publish({
            destination: `/app/chat/${strangerChatIdRef.current}/typing`,
            body: JSON.stringify(true)
          })
        }
      } else if (event === "stranger_typing_stopped") {
        if (strangerChatIdRef.current) {
          client.publish({
            destination: `/app/chat/${strangerChatIdRef.current}/typing`,
            body: JSON.stringify(false)
          })
        }
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
                const avatar = chatForReaction?.otherUser?.avatar ?? chatForReaction?.avatar

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

        case "messages_delivered": {
          // Update all sent messages to delivered status on the sender's side
          await db.transaction("rw", db.messages, async () => {
            const msgs = await db.messages
              .where("chatId")
              .equals(chatId)
              .filter(m => m.senderId === ownProfileRef.current?.id && (m.status === "sent" || m.status === "sending" || !m.status))
              .toArray();
            for (const m of msgs) {
              await db.messages.update(m.messageId, { status: "delivered" });
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

            if (ownProfileRef.current && ownProfileRef.current.id === eventData.readBy) {
              await db.chats.update(chatId, { unreadCount: 0 });
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
      await db.messages.put(mappedMsg)

      // Advance sync state
      const syncState = await db.sync_state.get(chatId)
      const currentSeq = syncState?.lastSequenceNumber || 0
      if (mappedMsg.sequenceNumber > currentSeq) {
        await db.sync_state.put({
          chatId,
          lastSequenceNumber: mappedMsg.sequenceNumber,
          lastSyncTimestamp: Date.now(),
        })
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
          const isGroup = chatForMuteCheck?.chatType === "GROUP" || chatForMuteCheck?.type === "group"
          const hasSound = isGroup 
            ? settings.groupTone !== "none" 
            : settings.messageTone !== "none"
            
          if (hasSound) {
            playNotificationSound()
          }
        }
      }

      // Toast notification trigger for messages from other users (only for non-active and non-muted chats)
      if (isFromOther && !isActiveChat && !isMuted) {
        const isGroup = chatForMuteCheck?.chatType === "GROUP" || chatForMuteCheck?.type === "group"
        const otherParticipant = chatForMuteCheck?.otherUser ?? chatForMuteCheck?.participants?.find((p) => p.id !== ownProfileRef.current?.id)
        const sender = isGroup
          ? (payload.senderName || chatForMuteCheck?.name || "Group Chat")
          : (otherParticipant?.name || payload.senderName || "Someone")
        const snippet = payload.content || "Sent an attachment"
        
        toast.custom((t) => {
          const avatar = chatForMuteCheck?.avatar || chatForMuteCheck?.otherUser?.avatar
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

    const data = { chatId, username, userId }

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
        handleChatMessage(chatId, payload)
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

  const subscribeToPresence = useCallback((username: string) => {
    const client = stompClientRef.current
    if (!client || !client.connected) return

    if (contactSubscriptionsRef.current.has(username)) return

    console.log(`[STOMP] Subscribing to presence for: ${username}`)

    const sub = client.subscribe(`/topic/presence/${username}`, (message) => {
      try {
        const payload = JSON.parse(message.body)
        formatMediaUrls(payload)
        console.log(`[STOMP] Received presence update for ${username}:`, payload)

        const statusLower = payload.status ? payload.status.toLowerCase() : "offline"
        const lastSeenVal = payload.lastSeen || null

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
      if (!usernames.has(username)) {
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
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    })

    client.onConnect = (frame) => {
      console.log("[STOMP] Connected successfully", frame)
      setIsConnected(true)

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
        } catch (err) {
          console.error("[STOMP] Match payload parse error:", err)
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
              handleChatMessage(chatId, msgPayload)
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

      // markAllAsDelivered is now handled via separate useEffect to prevent race conditions with profile loading
    }

    client.onWebSocketClose = () => {
      console.log("[STOMP] WebSocket connection closed")
      setIsConnected(false)
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
