"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Settings,
  MessageSquare,
  Send,
  Smile,
  Users,
  ArrowLeft,
  X,
  Volume2,
  Bell,
  Globe,
  Loader2,
  Lock,
  UserCheck,
  UserMinus,
  MessageCircle,
  Moon,
  Sun,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useLobbyStore } from "./lobby-store"
import { useOnlineUsers, useInbox, useChat, usePresence } from "./hooks"
import { useWebSocket } from "@/components/providers/websocket-provider"
import { useProfile, useLobbyUsers } from "@/src/api/hooks/useProfile"
import { useAuth } from "@/components/app-shell/auth-context"
import { useTheme } from "next-themes"
import { MessageInput } from "@/components/chat/message-input"
import type { ChatUser, ChatMessage, Conversation } from "./types"

const COMMON_EMOJIS = ["😊", "😂", "🤣", "❤️", "👍", "🔥", "😍", "😘", "🥺", "😭", "😮", "🙏", "😎", "✨", "🎉", "💯"]

// Helper to detect if a message content is a media URL (GIF/sticker)
const isMediaUrl = (content: string) => {
  if (!content) return false
  const trimmed = content.trim()
  return (
    (trimmed.startsWith("https://") || trimmed.startsWith("http://")) &&
    (trimmed.match(/\.(gif|png|jpg|jpeg|webp|svg)(\?.*)?$/i) ||
     trimmed.includes("giphy.com") ||
     trimmed.includes("dicebear.com") ||
     trimmed.includes("robohash.org"))
  )
}

export function LobbyDashboard() {
  const { data: ownProfile } = useProfile()
  const { guestUser, isGuestMatch, isAuthenticated, logout, openLoginModal } = useAuth()
  const { theme, setTheme } = useTheme()
  const myUsername = ownProfile?.username || (isGuestMatch && guestUser?.name) || "Guest"
  const { registerHandler } = useWebSocket()
  const { joinLobby, leaveLobby, isConnected } = usePresence()
  
  // Zustand State
  const activeTab = useLobbyStore((state) => state.activeTab)
  const setActiveTab = useLobbyStore((state) => state.setActiveTab)
  
  const genderFilter = useLobbyStore((state) => state.genderFilter)
  const setGenderFilter = useLobbyStore((state) => state.setGenderFilter)
  
  const selectedUser = useLobbyStore((state) => state.selectedUser)
  const setSelectedUser = useLobbyStore((state) => state.setSelectedUser)
  
  const showSettings = useLobbyStore((state) => state.showSettings)
  const setShowSettings = useLobbyStore((state) => state.setShowSettings)
  
  const addMessage = useLobbyStore((state) => state.addMessage)
  const setTyping = useLobbyStore((state) => state.setTyping)
  const setUserOnlineStatus = useLobbyStore((state) => state.setUserOnlineStatus)
  const blockedUsers = useLobbyStore((state) => state.blockedUsers)
  const blockUser = useLobbyStore((state) => state.blockUser)
  const unblockUser = useLobbyStore((state) => state.unblockUser)
  const notificationSettings = useLobbyStore((state) => state.notificationSettings)
  const updateNotificationSettings = useLobbyStore((state) => state.updateNotificationSettings)
  const clearAllData = useLobbyStore((state) => state.clearAllData)

  // Hooks
  const { onlineUsers, isLoading: isUsersLoading, refetch } = useOnlineUsers()
  const { conversations, unreadCount: inboxUnreadCount, deleteConversation } = useInbox()

  // Connect to STOMP and register lobby handlers
  useEffect(() => {
    if (isConnected) {
      joinLobby()
    }

    // Sound notification handler (message persistence is handled by websocket-provider)
    const unbindMsg = registerHandler("lobby_message", (payload) => {
      if (
        notificationSettings.sound &&
        (selectedUser?.username || selectedUser?.name) !== (payload as any).sender
      ) {
        try {
          const audio = new Audio("/sounds/notification.mp3")
          audio.volume = 0.5
          audio.play().catch(() => {})
        } catch {}
      }
    })

    const unbindTyping = registerHandler("lobby_typing", (payload) => {
      // payload: { sender, recipient, isTyping }
      setTyping((payload as any).sender, (payload as any).isTyping)
    })

    const unbindJoin = registerHandler("lobby_joined", (user) => {
      setUserOnlineStatus((user as any).username, true)
    })

    const unbindLeave = registerHandler("lobby_left", (username) => {
      setUserOnlineStatus(username as string, false)
    })

    return () => {
      leaveLobby()
      unbindMsg()
      unbindTyping()
      unbindJoin()
      unbindLeave()
    }
  }, [
    isConnected,
    joinLobby,
    leaveLobby,
    registerHandler,
    setTyping,
    setUserOnlineStatus,
    notificationSettings.sound,
    selectedUser?.username,
    selectedUser?.name,
  ])

  // Mobile navigation helper
  const handleSelectUser = (user: ChatUser) => {
    setSelectedUser(user)
  }

  const handleCloseChat = () => {
    setSelectedUser(null)
  }

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden relative">
      {/* Settings Drawer */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent className="bg-card border-border text-foreground w-full sm:max-w-md">
          <SheetHeader className="border-b border-border pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 text-primary rounded-2xl border border-primary/10">
                <Settings className="w-5 h-5 transition-transform duration-700 hover:rotate-90" />
              </div>
              <div>
                <SheetTitle className="text-foreground font-bold text-lg leading-tight">Lobby Settings</SheetTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">Customise your transient lobby & chat profile preferences</p>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-6 pt-6 pb-8 px-1 overflow-y-auto max-h-[calc(100vh-120px)] custom-scrollbar">
            {/* Preferences Group */}
            <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-4 shadow-inner">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                App Preferences
              </h3>
              
              {/* Notification sound switch */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-primary" />
                    Sound Effects
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-normal">Play notification sound on new messages</p>
                </div>
                <Switch
                  checked={notificationSettings.sound}
                  onCheckedChange={(val) => updateNotificationSettings({ sound: val })}
                />
              </div>

              <div className="h-px bg-border/40" />

              {/* Notification desktop switch */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    Desktop Notifications
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-normal">Show desktop alert cards for new activity</p>
                </div>
                <Switch
                  checked={notificationSettings.desktop}
                  onCheckedChange={(val) => updateNotificationSettings({ desktop: val })}
                />
              </div>
            </div>

            {/* Theme switcher */}
            <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-3 shadow-inner">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                Theme & Appearance
              </h3>
              <div className="flex gap-2 bg-muted/60 p-1.5 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={cn(
                    "flex-1 h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all select-none active:scale-95",
                    theme === "light"
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sun className="w-4 h-4" />
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "flex-1 h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all select-none active:scale-95",
                    theme === "dark"
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Moon className="w-4 h-4" />
                  Dark
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("system")}
                  className={cn(
                    "flex-1 h-9 rounded-lg text-xs font-semibold flex items-center justify-center transition-all select-none active:scale-95",
                    theme === "system"
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  System
                </button>
              </div>
            </div>

            {/* Blocked Users Section */}
            <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-3 shadow-inner">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-primary" />
                Privacy & Blocks ({blockedUsers.length})
              </h3>
              {blockedUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground/80 italic py-1 select-none">No blocked users in this session</p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {blockedUsers.map((username, idx) => (
                    <div
                      key={username || `block-${idx}`}
                      className="flex items-center justify-between p-2 rounded-xl bg-card border border-border"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold flex items-center justify-center border border-destructive/20 select-none shrink-0">
                          {(username || "G").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-foreground/90 truncate max-w-[120px]">@{username}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[11px] text-destructive hover:text-destructive-foreground hover:bg-destructive h-7 px-2.5 rounded-lg transition-all flex items-center gap-1 active:scale-95 shrink-0"
                        onClick={() => unblockUser(username)}
                      >
                        <UserMinus className="w-3 h-3" />
                        Unblock
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="bg-destructive/5 border border-destructive/10 rounded-2xl p-4 space-y-3">
              <h3 className="text-[10px] font-bold text-destructive uppercase tracking-wider select-none">
                Danger Zone
              </h3>
              <Button
                variant="destructive"
                className="w-full h-11 bg-destructive/10 hover:bg-destructive text-destructive hover:text-destructive-foreground border border-destructive/20 hover:border-transparent rounded-xl transition-all font-semibold flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                onClick={() => {
                  if (confirm("Are you sure you want to clear all transient chat history?")) {
                    clearAllData()
                    setShowSettings(false)
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
                Clear Local Chat History
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Layout Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: User list and Inbox */}
        <div
          className={cn(
            "w-full md:w-[350px] lg:w-[400px] shrink-0 flex flex-col border-r border-border bg-background transition-all duration-300",
            selectedUser ? "hidden md:flex" : "flex"
          )}
        >
          {/* Header Card */}
          <div className="p-4 bg-card border-b border-border shrink-0">
            <h1 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0" />
              Talk with Strangers
            </h1>
          </div>

          {/* Statistics Tabs */}
          <div className="grid grid-cols-2 p-2 gap-2 bg-card border-b border-border shrink-0">
            <button
              onClick={() => setActiveTab("lobby")}
              className={cn(
                "py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-98 select-none",
                activeTab === "lobby"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="w-4 h-4" />
              <span>{onlineUsers.length} Online</span>
            </button>

            <button
              onClick={() => setActiveTab("inbox")}
              className={cn(
                "py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-98 select-none relative",
                activeTab === "inbox"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Inbox</span>
              {inboxUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[20px] h-5 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-card">
                  {inboxUnreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Filter Bar (Lobby view only) */}
          {activeTab === "lobby" && (
            <div className="px-4 py-3 bg-background border-b border-border shrink-0 flex items-center gap-2 overflow-x-auto select-none no-scrollbar">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 mr-1">
                Filter:
              </span>
              <button
                onClick={() => setGenderFilter("all")}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0",
                  genderFilter === "all" ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                All
              </button>
              <button
                onClick={() => setGenderFilter("female")}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0",
                  genderFilter === "female" ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                Female
              </button>
              <button
                onClick={() => setGenderFilter("male")}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0",
                  genderFilter === "male" ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                Male
              </button>
            </div>
          )}

          {/* Scrollable Container (User List or Inbox list) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {activeTab === "lobby" ? (
              isUsersLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs">Finding online strangers...</span>
                </div>
              ) : onlineUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center px-4">
                  <span className="text-3xl mb-2">📡</span>
                  <p className="text-sm font-semibold">No strangers online</p>
                  <p className="text-xs text-muted-foreground mt-1">Try switching filters or check back later</p>
                </div>
              ) : (
                onlineUsers.map((user, idx) => (
                  <div
                    key={user.id || user.username || user.name || `user-${idx}`}
                    onClick={() => handleSelectUser(user)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border border-transparent transition-all cursor-pointer select-none",
                      (selectedUser?.username || selectedUser?.name) === (user.username || user.name)
                        ? "bg-primary/12 border-border"
                        : "bg-card hover:bg-card/80"
                    )}
                  >
                    <Avatar className="w-10 h-10 border border-border shrink-0">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                        {(user.name || user.username || "Guest").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "font-semibold text-sm truncate",
                          user.gender?.toUpperCase() === "FEMALE" ? "text-pink-300" : "text-foreground"
                        )}>
                          {user.name || user.username || "Guest"}
                        </span>
                        <span className={cn(
                          "text-xs shrink-0",
                          user.gender?.toUpperCase() === "FEMALE" ? "text-pink-300/80 font-medium" : "text-muted-foreground"
                        )}>
                          {user.age} yrs
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                        <span className="text-sm shrink-0 leading-none">{user.countryFlag || "🌐"}</span>
                        <span>{user.country || "Global"}</span>
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : (
              /* INBOX VIEW */
              conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center px-4">
                  <span className="text-3xl mb-2">💬</span>
                  <p className="text-sm font-semibold">Your inbox is empty</p>
                  <p className="text-xs text-muted-foreground mt-1">Start messaging online users to see chats here</p>
                </div>
              ) : (
                conversations.map((conv, idx) => (
                  <div
                    key={conv.id || conv.user?.username || conv.user?.name || `conv-${idx}`}
                    onClick={() => handleSelectUser(conv.user)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border border-transparent transition-all cursor-pointer select-none relative group",
                      (selectedUser?.username || selectedUser?.name) === (conv.user?.username || conv.user?.name)
                        ? "bg-primary/12 border-border"
                        : "bg-card hover:bg-card/80"
                    )}
                  >
                    <Avatar className="w-10 h-10 border border-border shrink-0">
                      <AvatarImage src={conv.user?.avatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                        {(conv.user?.name || conv.user?.username || "Guest").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "font-semibold text-sm truncate mr-2",
                          conv.user?.gender?.toUpperCase() === "FEMALE" ? "text-pink-300" : "text-foreground"
                        )}>
                          {conv.user?.name || conv.user?.username || "Guest"}
                        </span>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-xl leading-none">
                            {conv.user?.countryFlag || "🌐"}
                          </span>
                          {/* Delete button (❌) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteConversation(conv.user?.username || conv.user?.name || "")
                            }}
                            className="p-1 bg-destructive/20 text-destructive hover:text-destructive-foreground hover:bg-destructive/30 rounded-lg transition-all border border-destructive/30 shrink-0"
                            title="Delete Conversation"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-muted-foreground truncate pr-2">
                          {conv.lastMessage}
                        </p>
                        {conv.unreadCount > 0 ? (
                          <span className="px-1.5 py-0.5 rounded-full bg-pink-500 text-white text-[9px] font-bold shrink-0">
                            1 Message
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(conv.lastTimestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Private Chat (or placeholder on desktop) */}
        <div
          className={cn(
            "flex-1 flex flex-col bg-background",
            selectedUser ? "flex" : "hidden md:flex items-center justify-center p-6 text-center text-muted-foreground"
          )}
        >
          {selectedUser ? (
            <PrivateChatPanel user={selectedUser} onBack={handleCloseChat} />
          ) : (
            <div className="space-y-4 max-w-sm select-none">
              <div className="w-20 h-20 bg-card rounded-full flex items-center justify-center text-4xl mx-auto border border-border">
                💬
              </div>
              <h2 className="text-lg font-bold text-foreground">Private Chat Area</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Select a stranger from the list to start a transient chat. Lobby chats are local, private, and end when you clear data or leave.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── PRIVATE CHAT PANEL COMPONENT ──────────────────────────────────────────────
interface PrivateChatPanelProps {
  user: ChatUser
  onBack: () => void
}

function PrivateChatPanel({ user, onBack }: PrivateChatPanelProps) {
  const { data: ownProfile } = useProfile()
  const { guestUser, isGuestMatch } = useAuth()
  const myUsername = ownProfile?.username || (isGuestMatch && guestUser?.name) || "Guest"
  const partnerUsername = user.username || user.name || "Guest"
  const { messages, sendMessage, sendTypingStatus, isPartnerTyping } = useChat(partnerUsername)
  const blockUser = useLobbyStore((state) => state.blockUser)
  const isBlocked = useLobbyStore((state) => state.blockedUsers.includes(partnerUsername))

  const { data: lobbyUsers = [] } = useLobbyUsers()
  const activeConnections = useLobbyStore((state) => state.activeConnections)

  const onlineUsernames = new Set(
    lobbyUsers.map((u: any) => u.username || u.name || "")
  )

  const isPartnerOnline = (() => {
    if (activeConnections[partnerUsername] === false) return false
    if (activeConnections[partnerUsername] === true) return true
    return onlineUsernames.has(partnerUsername)
  })()
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastPartnerRef = useRef(partnerUsername)

  // Scroll to bottom on load / message updates
  useEffect(() => {
    const isNewPartner = lastPartnerRef.current !== partnerUsername
    lastPartnerRef.current = partnerUsername

    if (isNewPartner) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
      }, 50)
      return () => clearTimeout(timer)
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isPartnerTyping, partnerUsername])

  // Typing handler for MessageInput
  const handleTyping = useCallback((isTyping: boolean) => {
    if (isPartnerOnline) {
      sendTypingStatus(isTyping)
    }
  }, [isPartnerOnline, sendTypingStatus])

  // Handle send from MessageInput
  const handleSend = useCallback((content: string) => {
    if (!content.trim()) return
    sendMessage(content.trim())
  }, [sendMessage])

  // Handle GIF/sticker send - send URL as message content
  const handleSendMediaDirectly = useCallback((url: string, _type: "image" | "sticker") => {
    sendMessage(url)
  }, [sendMessage])

  const formatMessageTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-muted relative">
      {/* Chat Header */}
      <header className="flex items-center justify-between p-4 bg-card border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          {/* Back button (Desktop & Mobile) */}
          <Button
            size="icon"
            variant="ghost"
            onClick={onBack}
            className="w-9 h-9 rounded-xl hover:bg-muted text-foreground active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <Avatar className="w-10 h-10 border border-border shrink-0">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
              {(user.name || user.username || "Guest").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div>
            <h2 className={cn(
              "font-semibold text-sm leading-tight flex items-center gap-2",
              user.gender?.toUpperCase() === "FEMALE" ? "text-pink-300" : "text-foreground"
            )}>
              {user.name || user.username || "Guest"}
              <span className={cn(
                "text-[10px]",
                user.gender?.toUpperCase() === "FEMALE" ? "text-pink-300/80 font-medium" : "text-muted-foreground"
              )}>
                ({user.age})
              </span>
            </h2>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
              {isPartnerOnline ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span>Online | {user.countryFlag || "🌐"} {user.country || "Global"}</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                  <span>Offline | {user.countryFlag || "🌐"} {user.country || "Global"}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="flex items-center gap-2">
          {isBlocked ? (
            <span className="text-xs text-destructive font-semibold px-2 py-1 bg-destructive/10 rounded-lg border border-destructive/20">
              Blocked
            </span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const partnerName = user.username || user.name || "Guest"
                if (confirm(`Are you sure you want to block @${partnerName}?`)) {
                  blockUser(partnerName)
                  onBack()
                }
              }}
              className="h-8 border-border hover:bg-destructive/10 text-xs hover:text-destructive text-muted-foreground"
            >
              Block
            </Button>
          )}

          {/* Right Exit/Back button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={onBack}
            className="w-8 h-8 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
            title="Exit Chat"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-background">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-xs mx-auto space-y-3 select-none text-muted-foreground">
            <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center text-2xl">
              👋
            </div>
            <h4 className="text-sm font-bold text-foreground">Start the conversation!</h4>
            <p className="text-xs text-muted-foreground leading-normal">
              Say hello to {user.name || user.username || "Guest"}. Chat messages are encrypted, local-only, and disappear when deleted.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, idx) => {
              const isOwn = msg.senderId === myUsername
              
              return (
                <div
                  key={msg.id || `msg-${idx}`}
                  className={cn("flex w-full", isOwn ? "justify-end" : "justify-start")}
                >
                  {isMediaUrl(msg.content) ? (
                    <div className="relative">
                      <img
                        src={msg.content}
                        alt="Media"
                        className="max-w-[220px] max-h-[220px] rounded-2xl object-contain bg-transparent"
                        loading="lazy"
                      />
                      <div className={cn(
                        "absolute bottom-1 right-2 px-2 py-0.5 rounded-full text-[9px] backdrop-blur-sm",
                        isOwn ? "bg-black/30 text-white" : "bg-black/20 text-white"
                      )}>
                        {formatMessageTime(msg.timestamp || new Date(msg.createdAt).getTime())}
                        {isOwn && <span className="ml-1">{msg.read ? "✓✓" : "✓"}</span>}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm transition-all duration-300 relative group select-text",
                        isOwn
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : "bg-card border border-border text-foreground rounded-bl-none"
                      )}
                    >
                      <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                        {msg.content}
                      </p>
                      <div className="flex items-center justify-end gap-1.5 mt-1 select-none">
                        <span className={cn(
                          "text-[9px]",
                          isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
                        )}>
                          {formatMessageTime(msg.timestamp || new Date(msg.createdAt).getTime())}
                        </span>
                        {isOwn && (
                          <span className="text-[10px] text-primary-foreground/70">
                            {msg.read ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            
            {/* Animated Typing Indicator */}
            {isPartnerTyping && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Composer Area — uses shared MessageInput component */}
      <MessageInput
        onSend={handleSend}
        disabled={!isPartnerOnline}
        onTyping={handleTyping}
        onSendMediaDirectly={handleSendMediaDirectly}
      />
    </div>
  )
}
