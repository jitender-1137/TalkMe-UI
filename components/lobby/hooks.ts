"use client"

import { useEffect, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useLobbyStore } from "./lobby-store"
import { useWebSocket } from "@/components/providers/websocket-provider"
import { useProfile } from "@/src/api/hooks/useProfile"
import { useLobbyUsers } from "@/src/api/hooks/useProfile"
import { QUERY_KEYS } from "@/src/api/query-keys"
import type { ChatUser, ChatMessage } from "./types"

// ── 1. useOnlineUsers ─────────────────────────────────────────────────────────
export function useOnlineUsers() {
  const { data: lobbyUsers = [], isLoading, refetch } = useLobbyUsers()
  const genderFilter = useLobbyStore((state) => state.genderFilter)
  const blockedUsers = useLobbyStore((state) => state.blockedUsers)
  const setOnlineCount = useLobbyStore((state) => state.setOnlineCount)

  // Filter users based on gender filter and blocked list
  const onlineUsers = lobbyUsers.filter((user: any) => {
    const username = user.username || user.name || ""
    // Exclude blocked users
    if (blockedUsers.includes(username)) return false

    const userGender = (user.gender || "").toUpperCase()

    // Filter by gender
    if (genderFilter === "female") {
      return userGender === "FEMALE"
    }
    if (genderFilter === "male") {
      return userGender === "MALE"
    }
    return true
  })

  // Synchronize count to the store
  useEffect(() => {
    setOnlineCount(lobbyUsers.length)
  }, [lobbyUsers.length, setOnlineCount])

  return {
    onlineUsers: onlineUsers as unknown as ChatUser[],
    isLoading,
    refetch,
  }
}

// ── 2. useInbox ──────────────────────────────────────────────────────────────
export function useInbox() {
  const conversations = useLobbyStore((state) => state.conversations)
  const blockedUsers = useLobbyStore((state) => state.blockedUsers)
  const activeConnections = useLobbyStore((state) => state.activeConnections)
  const deleteConversation = useLobbyStore((state) => state.deleteConversation)

  const { data: lobbyUsers = [] } = useLobbyUsers()

  const onlineUsernames = new Set(
    lobbyUsers.map((u: any) => (u.username || u.name || "").toLowerCase())
  )

  const lobbyUsersMap = new Map<string, any>(
    lobbyUsers.map((u: any) => [(u.username || u.name || "").toLowerCase(), u])
  )

  const isUserOnline = (username: string) => {
    const key = username.toLowerCase()
    if (activeConnections[key] === false) return false
    if (activeConnections[key] === true) return true
    if (activeConnections[username] === false) return false
    if (activeConnections[username] === true) return true
    return onlineUsernames.has(key)
  }

  // Filter out blocked users and offline users from inbox list (Requirement 5)
  const filteredConversations = conversations.filter((c) => {
    const username = c.user?.username || c.user?.name || ""
    if (blockedUsers.includes(username)) return false
    return isUserOnline(username)
  })

  // Enrich conversations with dynamic profile data from online lobby users (Requirement 1)
  const enrichedConversations = filteredConversations.map((c) => {
    const username = c.user?.username || c.user?.name || ""
    const onlineUser = lobbyUsersMap.get(username.toLowerCase())
    if (onlineUser) {
      return {
        ...c,
        user: {
          ...c.user,
          name: onlineUser.name || c.user.name,
          username: onlineUser.username || c.user.username,
          gender: onlineUser.gender || c.user.gender,
          age: onlineUser.age || c.user.age,
          country: onlineUser.country || c.user.country,
          countryFlag: onlineUser.countryFlag || c.user.countryFlag,
          avatar: onlineUser.avatar || c.user.avatar,
        }
      }
    }
    return c
  })

  const unreadCount = enrichedConversations.reduce((acc, c) => acc + c.unreadCount, 0)

  return {
    conversations: enrichedConversations,
    unreadCount,
    deleteConversation,
  }
}

const EMPTY_ARRAY: ChatMessage[] = []

// ── 3. useChat ───────────────────────────────────────────────────────────────
export function useChat(partnerUsername: string | undefined) {
  const messages = useLobbyStore((state) => state.messages[partnerUsername ?? ""] ?? EMPTY_ARRAY)
  const { data: ownProfile } = useProfile()
  const { sendEvent } = useWebSocket()
  const typingStatus = useLobbyStore((state) => state.typingStatus[partnerUsername ?? ""] ?? false)

  const sendMessage = useCallback(
    (content: string) => {
      if (!partnerUsername || !content.trim()) return

      // Send to WebSocket backend
      sendEvent("lobby/chat", {
        recipient: partnerUsername,
        content: content.trim(),
      })
    },
    [partnerUsername, sendEvent]
  )

  const sendTypingStatus = useCallback(
    (isTyping: boolean) => {
      if (!partnerUsername) return
      sendEvent("lobby/typing", {
        recipient: partnerUsername,
        isTyping,
      })
    },
    [partnerUsername, sendEvent]
  )

  return {
    messages,
    sendMessage,
    sendTypingStatus,
    isPartnerTyping: typingStatus,
    ownProfile,
  }
}

// ── 4. usePresence ───────────────────────────────────────────────────────────
export function usePresence() {
  const { isConnected, sendEvent } = useWebSocket()

  const joinLobby = useCallback(() => {
    if (isConnected) {
      console.log("[Lobby] Joining lobby via WebSocket...")
      sendEvent("lobby/join", {})
    }
  }, [isConnected, sendEvent])

  const leaveLobby = useCallback(() => {
    if (isConnected) {
      console.log("[Lobby] Leaving lobby via WebSocket...")
      sendEvent("lobby/leave", {})
    }
  }, [isConnected, sendEvent])

  return {
    isConnected,
    joinLobby,
    leaveLobby,
  }
}
