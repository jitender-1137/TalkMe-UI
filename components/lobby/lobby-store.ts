"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ChatUser, ChatMessage, Conversation } from "./types"

interface LobbyStoreState {
  // UI State
  activeTab: "lobby" | "inbox"
  genderFilter: "all" | "female" | "male"
  selectedUser: ChatUser | null
  showSettings: boolean
  
  // Transient/In-memory States
  onlineCount: number
  typingStatus: Record<string, boolean> // keyed by username
  activeConnections: Record<string, boolean> // online status of active dm users
  
  // Persisted States
  conversations: Conversation[]
  messages: Record<string, ChatMessage[]> // keyed by username
  blockedUsers: string[]
  notificationSettings: {
    sound: boolean
    desktop: boolean
  }

  // Actions
  setActiveTab: (tab: "lobby" | "inbox") => void
  setGenderFilter: (filter: "all" | "female" | "male") => void
  setSelectedUser: (user: ChatUser | null) => void
  setShowSettings: (show: boolean) => void
  setOnlineCount: (count: number) => void
  setTyping: (username: string, isTyping: boolean) => void
  setUserOnlineStatus: (username: string, isOnline: boolean) => void
  
  // Conversation/Message Actions
  addMessage: (msg: ChatMessage, ownUsername: string) => void
  deleteConversation: (username: string) => void
  markConversationAsRead: (username: string) => void
  
  // Settings Actions
  blockUser: (username: string) => void
  unblockUser: (username: string) => void
  updateNotificationSettings: (settings: Partial<LobbyStoreState["notificationSettings"]>) => void
  clearAllData: () => void
}

export const useLobbyStore = create<LobbyStoreState>()(
  persist(
    (set, get) => ({
      // UI State initial values
      activeTab: "lobby",
      genderFilter: "all",
      selectedUser: null,
      showSettings: false,
      
      // Transient State initial values
      onlineCount: 0,
      typingStatus: {},
      activeConnections: {},
      
      // Persisted State initial values
      conversations: [],
      messages: {},
      blockedUsers: [],
      notificationSettings: {
        sound: true,
        desktop: true,
      },

      setActiveTab: (tab) => set({ activeTab: tab }),
      setGenderFilter: (filter) => set({ genderFilter: filter }),
      setSelectedUser: (user) => {
        set({ selectedUser: user })
        if (user) {
          get().markConversationAsRead(user.username || user.name || "")
        }
      },
      setShowSettings: (show) => set({ showSettings: show }),
      setOnlineCount: (count) => set({ onlineCount: count }),
      setTyping: (username, isTyping) =>
        set((state) => ({
          typingStatus: {
            ...state.typingStatus,
            [username]: isTyping,
          },
        })),
      setUserOnlineStatus: (username, isOnline) =>
        set((state) => ({
          activeConnections: {
            ...state.activeConnections,
            [username]: isOnline,
          },
        })),

      blockUser: (username) =>
        set((state) => ({
          blockedUsers: [...state.blockedUsers.filter((u) => u !== username), username],
        })),
      unblockUser: (username) =>
        set((state) => ({
          blockedUsers: state.blockedUsers.filter((u) => u !== username),
        })),
      updateNotificationSettings: (settings) =>
        set((state) => ({
          notificationSettings: {
            ...state.notificationSettings,
            ...settings,
          },
        })),

      addMessage: (rawMsg, ownUsername) => {
        // Resolve sender and receiver supporting both raw STOMP payload (sender/recipient) and normalized ChatMessage (senderId/receiverId)
        const senderId = rawMsg.senderId || (rawMsg as any).sender || ""
        const receiverId = rawMsg.receiverId || (rawMsg as any).recipient || ""
        const timestamp = rawMsg.timestamp || (rawMsg.createdAt ? new Date(rawMsg.createdAt).getTime() : Date.now())

        const msg: ChatMessage = {
          id: rawMsg.id || Math.random().toString(),
          senderId,
          receiverId,
          content: rawMsg.content,
          createdAt: rawMsg.createdAt || new Date(timestamp).toISOString(),
          read: rawMsg.read || false,
          timestamp,
        }

        const isOwn = msg.senderId === ownUsername
        const chatPartnerUsername = isOwn ? msg.receiverId : msg.senderId

        if (!chatPartnerUsername) {
          console.warn("[LobbyStore] chatPartnerUsername is empty for message:", msg)
          return
        }

        set((state) => {
          // 1. Update messages log
          const partnerMessages = state.messages[chatPartnerUsername] ?? []
          if (partnerMessages.some((m) => m.id === msg.id)) {
            return state // Avoid duplicate messages
          }
          const updatedMessages = {
            ...state.messages,
            [chatPartnerUsername]: [...partnerMessages, msg],
          }

          // 2. Find or create conversation
          const existingConvIdx = state.conversations.findIndex(
            (c) => (c.user?.username || c.user?.name) === chatPartnerUsername
          )

          let updatedConversations = [...state.conversations]
          const now = Date.now()

          if (existingConvIdx !== -1) {
            const existingConv = state.conversations[existingConvIdx]
            const isCurrentlySelected = (state.selectedUser?.username || state.selectedUser?.name) === chatPartnerUsername
            
            updatedConversations[existingConvIdx] = {
              ...existingConv,
              lastMessage: msg.content,
              lastTimestamp: now,
              unreadCount: (!isOwn && !isCurrentlySelected) ? existingConv.unreadCount + 1 : existingConv.unreadCount,
            }
          } else {
            // Generate dummy details for new local conversation user if details not fully known yet
            const isCurrentlySelected = (state.selectedUser?.username || state.selectedUser?.name) === chatPartnerUsername
            const dummyUser: ChatUser = {
              id: chatPartnerUsername,
              username: chatPartnerUsername,
              age: 18,
              gender: "MALE",
              country: "Global",
              countryFlag: "🌐",
              avatar: "",
              online: true,
            }
            
            updatedConversations.push({
              id: chatPartnerUsername,
              user: dummyUser,
              unreadCount: (!isOwn && !isCurrentlySelected) ? 1 : 0,
              lastMessage: msg.content,
              lastTimestamp: now,
            })
          }

          // Sort conversations by last message timestamp descending
          updatedConversations.sort((a, b) => b.lastTimestamp - a.lastTimestamp)

          return {
            messages: updatedMessages,
            conversations: updatedConversations,
          }
        })
      },

      deleteConversation: (username) =>
        set((state) => {
          const updatedConversations = state.conversations.filter(
            (c) => (c.user?.username || c.user?.name) !== username
          )
          const updatedMessages = { ...state.messages }
          delete updatedMessages[username]
          
          let selectedUser = state.selectedUser
          if ((selectedUser?.username || selectedUser?.name) === username) {
            selectedUser = null
          }

          return {
            conversations: updatedConversations,
            messages: updatedMessages,
            selectedUser,
          }
        }),

      markConversationAsRead: (username) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            (c.user?.username || c.user?.name) === username ? { ...c, unreadCount: 0 } : c
          ),
        })),

      clearAllData: () =>
        set({
          conversations: [],
          messages: {},
          blockedUsers: [],
          selectedUser: null,
          activeTab: "lobby",
        }),
    }),
    {
      name: "talkme-lobby-store",
      partialize: (state) => ({
        conversations: state.conversations,
        messages: state.messages,
        blockedUsers: state.blockedUsers,
        notificationSettings: state.notificationSettings,
      }),
    }
  )
)
