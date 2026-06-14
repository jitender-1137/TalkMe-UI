"use client"

import { useEffect, useRef, useState } from "react"
import { AuthProvider, useAuth } from "./auth-context"
import { NavigationProvider, useNavigation } from "./navigation-context"
import { GuestBanner } from "./guest-banner"
import { MobileBottomNav } from "./mobile-bottom-nav"
import { DesktopSidebar } from "./desktop-sidebar"
import { SecondaryPanel } from "./secondary-panel"
import { MainContent } from "./main-content"
import { SettingsPage } from "./settings-page"
import { ConnectDashboard, useMatchStore } from "@/components/match"
import { DiscoverDashboard } from "@/components/discover"
import { FriendsDashboard } from "@/components/friends"
import { NewsDashboard } from "@/components/feed"
import { ChatProvider, useChatContext } from "@/components/chat/chat-context"
import { LoginModal } from "./login-modal"
import { SignupModal } from "./signup-modal"
import { AuthGuard } from "./auth-guard"
import { GuestMatchForm } from "./guest-match-form"
import { cn } from "@/lib/utils"
import { useWebSocket } from "@/components/providers"
import { useQueryClient } from "@tanstack/react-query"
import { QUERY_KEYS } from "@/src/api/query-keys"
import { useLobbyStore } from "@/components/lobby/lobby-store"

function AppShellContent() {
  const { activeTab, setActiveTab } = useNavigation()
  const { showMobileSecondaryPanel, selectedConversationId, setSelectedConversationId, setShowMobileSecondaryPanel } = useChatContext()
  const lobbySelectedUser = useLobbyStore((state) => state.selectedUser)
  const { isAuthenticated, isGuestMatch, isLoading, openLoginModal } = useAuth()
  const queryClient = useQueryClient()
  const { registerHandler } = useWebSocket()
  const hasInitializedTab = useRef(false)
  const prevIsAuthenticated = useRef(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isLoading) return

    const isGuest = isGuestMatch
    const isNotLoggedIn = !isAuthenticated

    if (!hasInitializedTab.current) {
      // On initial load, check if hash is #profile for deep-linking
      if (window.location.hash === "#profile" && isAuthenticated && !isGuest) {
        if (activeTab !== "settings") {
          setActiveTab("settings")
        }
      } else if (isNotLoggedIn || isGuest) {
        if (activeTab !== "match") {
          setActiveTab("match")
        }
      } else {
        // Registered user on initial load gets chats tab
        if (activeTab !== "chats") {
          setActiveTab("chats")
        }
      }
      hasInitializedTab.current = true
      prevIsAuthenticated.current = isAuthenticated
    } else {
      // If user transitioned from unauthenticated to registered user, switch to chats
      if (!prevIsAuthenticated.current && isAuthenticated && !isGuest) {
        setActiveTab("chats")
      }
      prevIsAuthenticated.current = isAuthenticated
    }
  }, [isLoading, isAuthenticated, isGuestMatch, activeTab, setActiveTab, openLoginModal])

  const activeTabRef = useRef(activeTab)
  const selectedConversationIdRef = useRef(selectedConversationId)
  const lobbySelectedUserRef = useRef(lobbySelectedUser)

  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId
  }, [selectedConversationId])

  useEffect(() => {
    lobbySelectedUserRef.current = lobbySelectedUser
  }, [lobbySelectedUser])

  // Sync tab state with url hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash

      // If hash changed away from #messages and #profile, close any open chat rooms
      if (hash !== "#messages" && hash !== "#profile") {
        if (selectedConversationIdRef.current !== null) {
          setSelectedConversationId(null)
          setShowMobileSecondaryPanel(true)
        }
        if (lobbySelectedUserRef.current !== null) {
          useLobbyStore.getState().setSelectedUser(null)
        }
        if (useMatchStore.getState().status === "matched") {
          useMatchStore.getState().resetMatch()
        }
      }

      if (hash === "#profile") {
        const isViewingChat = selectedConversationIdRef.current !== null || lobbySelectedUserRef.current !== null
        const isDiscoverOrFriends = activeTabRef.current === "discover" || activeTabRef.current === "friends"
        if (!isViewingChat && !isDiscoverOrFriends && activeTabRef.current !== "settings") {
          setActiveTab("settings")
        }
      } else if (hash === "#messages") {
        if (activeTabRef.current !== "chats" && activeTabRef.current !== "match") {
          setActiveTab("chats")
        }
      }
    }

    window.addEventListener("hashchange", handleHashChange)
    
    // Check initial hash on mount
    const hash = window.location.hash
    if (hash === "#profile") {
      setActiveTab("settings")
    } else if (hash === "#messages") {
      setActiveTab("chats")
    }

    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [setSelectedConversationId, setShowMobileSecondaryPanel, setActiveTab])

  // Sync url hash based on active chat interfaces
  const isOneToOneOpen = activeTab === "chats" && selectedConversationId !== null && (!showMobileSecondaryPanel || window.innerWidth >= 768)
  const isLobbyChatOpen = activeTab === "match" && lobbySelectedUser !== null

  useEffect(() => {
    const isMessagingActive = isOneToOneOpen || isLobbyChatOpen
    const isProfileActive = activeTab === "settings"
    const isDiscoverOrFriends = activeTab === "discover" || activeTab === "friends"

    if (isMessagingActive) {
      if (window.location.hash !== "#messages" && window.location.hash !== "#profile") {
        window.location.hash = "#messages"
      }
    } else if (isProfileActive) {
      if (window.location.hash === "#messages") {
        window.location.hash = ""
      }
    } else if (isDiscoverOrFriends) {
      if (window.location.hash === "#messages") {
        window.location.hash = ""
      }
    } else {
      if (window.location.hash === "#messages" || window.location.hash === "#profile") {
        window.location.hash = ""
      }
    }
  }, [isOneToOneOpen, isLobbyChatOpen, activeTab])

  useEffect(() => {
    if (!isAuthenticated) return

    const unbindDeleted = registerHandler("chat_deleted", (payload) => {
      const deletedChatId = payload.chatId
      if (deletedChatId) {
        // 1. Remove the deleted chat from the local chats list cache instantly
        queryClient.setQueryData<any[]>(QUERY_KEYS.CHATS.LIST, (oldChats) => {
          if (!oldChats) return oldChats
          return oldChats.filter((c) => c.id !== deletedChatId)
        })

        // 2. Remove detail and message caches for the deleted chat
        queryClient.removeQueries({ queryKey: QUERY_KEYS.CHATS.DETAIL(deletedChatId) })
        queryClient.removeQueries({ queryKey: QUERY_KEYS.MESSAGES.LIST(deletedChatId) })

        // 3. Force refetch list with a delay to allow the backend transaction to commit
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
        }, 500)

        // 4. Close the conversation panel if currently open
        if (selectedConversationId === deletedChatId) {
          setSelectedConversationId(null)
          setShowMobileSecondaryPanel(true)
          if (typeof window !== "undefined" && window.location.hash === "#messages") {
            window.location.hash = ""
          }
        }
      }
    })
    return () => unbindDeleted()
  }, [isAuthenticated, registerHandler, selectedConversationId, setSelectedConversationId, setShowMobileSecondaryPanel, queryClient])

  useEffect(() => {
    const handleOpenChat = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail && detail.chatId) {
        setSelectedConversationId(detail.chatId)
        setActiveTab("chats")
        setShowMobileSecondaryPanel(false)
      }
    }
    window.addEventListener("chat:open", handleOpenChat)
    return () => window.removeEventListener("chat:open", handleOpenChat)
  }, [setSelectedConversationId, setActiveTab, setShowMobileSecondaryPanel])

  if (mounted && isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background">
        <div className="flex items-center gap-2 animate-pulse">
          <div className="flex items-center justify-center h-12 w-12 rounded-2xl overflow-hidden shadow-lg shadow-primary/25">
            <img src="/apple-icon.png" alt="TalkMe" className="w-full h-full object-cover" />
          </div>
          <span className="text-2xl font-bold text-foreground">TalkMe</span>
        </div>
        <div className="mt-4 text-sm text-muted-foreground animate-bounce">Restoring session...</div>
      </div>
    )
  }

  // Determine which view to render
  const showSettings  = activeTab === "settings"
  const showMatch     = activeTab === "match"
  const showDiscover  = activeTab === "discover"
  const showFriends   = activeTab === "friends"
  const showNews      = activeTab === "news"
  // Secondary (conversation) panel only for the chats tab now
  const showConversationPanel = activeTab === "chats"

  // Check if user can access Match (authenticated or guest match)
  const canAccessMatch = isAuthenticated || isGuestMatch

  // Full users are authenticated users who are not guest match users
  const isFullUser = isAuthenticated && !isGuestMatch

  return (
    <div className="h-dvh overflow-hidden bg-background flex flex-col">
      {/* Guest Mode Banner */}
      <GuestBanner />

      {/* Login/Signup Modals */}
      <LoginModal />
      <SignupModal />

      {/* Desktop Sidebar */}
      <DesktopSidebar />

      {/* Secondary Panel (Conversation List) - chats only, desktop + mobile when toggled */}
      {showConversationPanel && isFullUser && (
        <>
          {/* Desktop: always visible */}
          <div className="hidden md:block">
            <SecondaryPanel />
          </div>
          {/* Mobile: overlay when toggled */}
          {showMobileSecondaryPanel && (
            <div className="fixed inset-0 z-40 md:hidden overflow-auto bg-card">
              <SecondaryPanel />
            </div>
          )}
        </>
      )}

      {/* Main Content Area */}
      <main
        className={cn(
          "flex-1 overflow-hidden",
          showConversationPanel && isFullUser
            ? "md:ml-[72px] md:pl-80 lg:pl-96"
            : "md:ml-[72px]"
        )}
      >
        {showSettings ? (
          <AuthGuard tab="settings">
            <SettingsPage />
          </AuthGuard>
        ) : showMatch ? (
          canAccessMatch ? (
            <ConnectDashboard />
          ) : (
            <GuestMatchForm />
          )
        ) : showDiscover ? (
          <AuthGuard tab="discover">
            <DiscoverDashboard />
          </AuthGuard>
        ) : showFriends ? (
          <AuthGuard tab="friends">
            <FriendsDashboard />
          </AuthGuard>
        ) : showNews ? (
          <AuthGuard tab="news">
            <NewsDashboard />
          </AuthGuard>
        ) : showConversationPanel ? (
          <AuthGuard tab="chats">
            <MainContent />
          </AuthGuard>
        ) : (
          <AuthGuard tab="chats">
            <MainContent />
          </AuthGuard>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  )
}

export function AppShell() {
  return (
    <AuthProvider>
      <NavigationProvider>
        <ChatProvider>
          <AppShellContent />
        </ChatProvider>
      </NavigationProvider>
    </AuthProvider>
  )
}
