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
import { UserProfileModal } from "@/components/chat/user-profile-modal"
import { getTabFromHash } from "@/lib/navigation/url-hash"
import { useBackDismiss } from "@/hooks/use-back-dismiss"
import { NotificationSetup } from "@/components/providers/notification-setup"

function AppShellContent() {
  const { activeTab, setActiveTab } = useNavigation()
  const { showMobileSecondaryPanel, selectedConversationId, setSelectedConversationId, setShowMobileSecondaryPanel, profileModal, setProfileModal, chatReturnTab, setChatReturnTab } = useChatContext()
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
    const isFull = isAuthenticated && !isGuest

    if (!hasInitializedTab.current) {
      // Resolve the deep-link tab from the hash through the centralized manager.
      // (NavigationProvider already seeded `activeTab` from the hash; here we
      // only override it with the auth-aware default when the deep link is
      // missing or not permitted for the current auth state.)
      const hashTab = getTabFromHash(window.location.hash)
      const canUseHashTab =
        hashTab === "discover"
          ? isAuthenticated
          : hashTab === "settings" || hashTab === "friends" || hashTab === "news"
            ? isFull
            : hashTab === "chats"
              ? isFull
              : hashTab === "match"
                ? true
                : false

      if (hashTab && canUseHashTab) {
        if (activeTab !== hashTab) setActiveTab(hashTab)
      } else if (isNotLoggedIn || isGuest) {
        if (activeTab !== "match") setActiveTab("match")
      } else {
        // Registered user with no usable deep link → chats.
        if (activeTab !== "chats") setActiveTab("chats")
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

  const selectedConversationIdRef = useRef(selectedConversationId)
  const lobbySelectedUserRef = useRef(lobbySelectedUser)

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId
  }, [selectedConversationId])

  useEffect(() => {
    lobbySelectedUserRef.current = lobbySelectedUser
  }, [lobbySelectedUser])

  const profileModalRef = useRef(profileModal)
  useEffect(() => {
    profileModalRef.current = profileModal
  }, [profileModal])

  const chatReturnTabRef = useRef(chatReturnTab)
  useEffect(() => {
    chatReturnTabRef.current = chatReturnTab
  }, [chatReturnTab])

  // ── Native-style Back for the mobile chat screen ───────────────────────────
  // On mobile, an open conversation (or a lobby/match chat) is a screen pushed
  // on top of the current tab. `useBackDismiss` pushes ONE history entry when it
  // opens; pressing Back pops that entry and runs `closeChatScreen`, which
  // closes the chat and returns to the tab it was opened from (e.g. Discover or
  // News set `chatReturnTab`; the Chats list sets none → stays on Chats).
  const isChatScreenOpen =
    (selectedConversationId !== null && !showMobileSecondaryPanel) ||
    (activeTab === "match" && lobbySelectedUser !== null)

  const closeChatScreen = () => {
    if (lobbySelectedUserRef.current !== null) {
      useLobbyStore.getState().setSelectedUser(null)
    }
    if (selectedConversationIdRef.current !== null) {
      setSelectedConversationId(null)
      setShowMobileSecondaryPanel(true)
    }
    const returnTab = chatReturnTabRef.current
    if (returnTab) setActiveTab(returnTab) // restore the originating tab
    setChatReturnTab(null)
  }

  useBackDismiss(isChatScreenOpen, closeChatScreen)

  // Contact profile modal is now driven purely by state (no hash / history).
  // Closing it never touches the browser history, so it can never add a back
  // stack entry. (Previously this used a hash + history.back() hack.)
  const handleProfileClose = () => setProfileModal(null)

  // Cross-view cleanup when the active tab changes.
  //
  // The URL hash is owned entirely by NavigationProvider (replaceState only),
  // so tab switches no longer fire `hashchange`. We therefore react to the
  // `activeTab` value itself: when the user leaves a tab, tear down any sub-view
  // that belonged to it (open conversation, lobby chat, matched session, or the
  // global profile modal). No history is touched here either.
  useEffect(() => {
    if (activeTab !== "chats" && selectedConversationIdRef.current !== null) {
      setSelectedConversationId(null)
      setShowMobileSecondaryPanel(true)
    }
    if (activeTab !== "match") {
      if (lobbySelectedUserRef.current !== null) {
        useLobbyStore.getState().setSelectedUser(null)
      }
      if (useMatchStore.getState().status === "matched") {
        useMatchStore.getState().resetMatch()
      }
    }
    if (profileModalRef.current !== null) {
      setProfileModal(null)
    }
  }, [activeTab, setSelectedConversationId, setShowMobileSecondaryPanel, setProfileModal])

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

        // 4. Close the conversation panel if currently open (state only — the
        // URL hash is managed centrally and stays on the chats tab).
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
        setChatReturnTab(null) // opened from a notification → Back returns to Chats list
        setSelectedConversationId(detail.chatId)
        setActiveTab("chats")
        setShowMobileSecondaryPanel(false)
      }
    }
    window.addEventListener("chat:open", handleOpenChat)
    return () => window.removeEventListener("chat:open", handleOpenChat)
  }, [setSelectedConversationId, setActiveTab, setShowMobileSecondaryPanel, setChatReturnTab])

  // When the refresh-token call returns 401 (session ended / superseded by a
  // login on another device), the API client dispatches "auth:session-expired".
  // Auth state is reset in auth-context; here we move the user to the Connect
  // tab so they land on a valid, unauthenticated entry point instead of a
  // guarded tab. (auth-context sits above NavigationProvider, so the tab switch
  // has to happen here where useNavigation is available.)
  useEffect(() => {
    const onSessionExpired = () => {
      setActiveTab("match")
    }
    window.addEventListener("auth:session-expired", onSessionExpired)
    return () => window.removeEventListener("auth:session-expired", onSessionExpired)
  }, [setActiveTab])

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
      {/* Notification setup (install detection, push subscription, badge) */}
      <NotificationSetup />

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

      {/* Global Contact Profile Modal */}
      {profileModal && (
        <UserProfileModal
          contact={profileModal.contact}
          userId={profileModal.userId}
          isOpen={profileModal !== null}
          onClose={handleProfileClose}
          isOwnProfile={false}
          sharedMedia={profileModal.sharedMedia || []}
        />
      )}
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
