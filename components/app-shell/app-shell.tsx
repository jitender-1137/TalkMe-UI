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
import { ConnectDashboard } from "@/components/match"
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

function AppShellContent() {
  const { activeTab, setActiveTab } = useNavigation()
  const { showMobileSecondaryPanel, selectedConversationId, setSelectedConversationId, setShowMobileSecondaryPanel } = useChatContext()
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
      // On initial load, redirect guest or unauthenticated user to match tab silently
      if (isNotLoggedIn || isGuest) {
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

  useEffect(() => {
    if (!isAuthenticated) return

    const unbindDeleted = registerHandler("chat_deleted", (payload) => {
      const deletedChatId = payload.chatId
      if (deletedChatId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
        if (selectedConversationId === deletedChatId) {
          setSelectedConversationId(null)
          setShowMobileSecondaryPanel(true)
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
          <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-primary text-primary-foreground font-bold text-xl shadow-lg shadow-primary/25">
            T
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
