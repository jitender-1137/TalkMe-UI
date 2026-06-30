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
import { useOpenOrCreateChat } from "@/src/api/hooks/useChats"
import { getTabFromHash } from "@/lib/navigation/url-hash"
import { ScrollRestoreProvider } from "@/lib/navigation/scroll-restore"
import { useUrlModal } from "@/lib/navigation/use-url-modal"
import { NotificationSetup } from "@/components/providers/notification-setup"

function AppShellContent() {
  const { activeTab, setActiveTab } = useNavigation()
  const { showMobileSecondaryPanel, selectedConversationId, setSelectedConversationId, setShowMobileSecondaryPanel, profileModal, setProfileModal, chatReturnTab, setChatReturnTab } = useChatContext()
  const lobbySelectedUser = useLobbyStore((state) => state.selectedUser)
  const { isAuthenticated, isGuestMatch, isLoading, openLoginModal } = useAuth()
  const queryClient = useQueryClient()
  const { registerHandler } = useWebSocket()
  const openOrCreateChat = useOpenOrCreateChat()
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
  // A conversation is always viewed on the Chats tab (Discover/News/Friends switch
  // to it and remember `chatReturnTab`). It gets a nested URL segment so the hash
  // becomes #chats/messages while a chat is open and Back (button or swipe) returns
  // to #chats — closeChatScreen restores the originating tab when there is one.
  // (The lobby chat is intentionally NOT handled here — ConnectDashboard owns its
  // #match/lobby/chat overlay; see the note by the useUrlModal call below.)
  // A conversation can be opened from ANY root tab (Chats list, or a "Message"
  // button in Discover/News/Match/Friends). It is NOT tied to the chats tab: the
  // overlay segment ("messages") nests under whatever root is active, so the hash
  // becomes #discover/messages, #match/messages, #chats/messages, … and Back
  // returns to that root. On the chats tab the existing two-pane / mobile panel
  // renders it; on other tabs the cross-tab overlay below renders it.
  const isConversationOpen =
    selectedConversationId !== null && !showMobileSecondaryPanel

  const closeChatScreen = () => {
    if (lobbySelectedUserRef.current !== null) {
      useLobbyStore.getState().setSelectedUser(null)
    }
    if (selectedConversationIdRef.current !== null) {
      setSelectedConversationId(null)
      setShowMobileSecondaryPanel(true)
    }
    // We no longer switch tabs when opening a conversation (it nests under the current
    // root), so there is nothing to "restore" on close — and calling setActiveTab here
    // would clearOverlays(), tearing down any profile modal the chat was nested under.
    setChatReturnTab(null)
  }

  // Nests "messages" under the CURRENT root (e.g. #chats/messages, #discover/messages,
  // or #news/feed/user/<id>/messages when opened from a profile modal). Back closes the
  // conversation and returns to that parent. The returned z stacks the cross-tab overlay
  // above whatever it was opened from (tab content, or a profile modal).
  const conversationZ = useUrlModal(isConversationOpen, closeChatScreen, "messages")
  // The lobby chat's Back is owned SOLELY by ConnectDashboard's nested
  // "#match/lobby/chat" overlay. We must NOT also drive it from here — a second
  // history entry + popstate handler made one swipe-back consume two entries,
  // skipping #match/lobby and jumping straight to #match.

  // Contact profile modal is now driven purely by state (no hash / history).
  // Closing it never touches the browser history, so it can never add a back
  // stack entry. (Previously this used a hash + history.back() hack.)
  const handleProfileClose = () => setProfileModal(null)

  // "Message" inside the GLOBAL profile modal (opened anywhere via useProfileViewer's
  // openProfile, e.g. "People You May Know"). The modal is a fixed-z overlay, so we
  // close it first — otherwise the conversation overlay would render behind it — then
  // open the chat nested under the current root tab.
  const handleProfileMessage = async () => {
    const uid = profileModalRef.current?.userId
    if (!uid) return
    try {
      const chat = await openOrCreateChat(uid)
      setProfileModal(null)
      // The global profile modal is opened from INSIDE other overlays (Friends list /
      // Requests, comments, …) that sit over the chats two-pane. Switch to chats —
      // setActiveTab()'s clearOverlays() tears those down CLEANLY (no history race), so
      // the conversation isn't left hidden behind them. Opens as #chats/messages.
      setChatReturnTab(null)
      setSelectedConversationId(chat.id)
      setShowMobileSecondaryPanel(false)
      setActiveTab("chats")
    } catch {
      /* openOrCreateChat surfaces its own error toast */
    }
  }

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
          {/* Mobile: overlay when toggled — instant show/hide (no slide).
              Kept MOUNTED and merely hidden (not unmounted) when a chat is open,
              so returning to the list doesn't remount every row / replay status +
              last-message and lose scroll position. */}
          <div
            className={cn(
              "fixed inset-0 z-40 md:hidden overflow-auto bg-card",
              !showMobileSecondaryPanel && "hidden",
            )}
          >
            <SecondaryPanel />
          </div>
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

      {/* Cross-tab conversation overlay: a chat opened from Discover/News/Match/
          Friends renders here (nested as #<tab>/messages) so the root tab stays put
          and Back returns to it. The Chats tab keeps its own two-pane / mobile panel
          above, so this never renders there. z-[200] sits above tab content but below
          the global profile modal (z-250/260) launched from inside the chat. */}
      {isConversationOpen && activeTab !== "chats" && isFullUser && (
        <div
          className="fixed inset-0 bg-background md:ml-[72px] overflow-hidden"
          style={{ zIndex: conversationZ }}
        >
          <MainContent />
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Global Contact Profile Modal */}
      {profileModal && (
        <UserProfileModal
          contact={profileModal.contact}
          userId={profileModal.userId}
          isOpen={profileModal !== null}
          onClose={handleProfileClose}
          onMessage={handleProfileMessage}
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
        <ScrollRestoreProvider>
          <ChatProvider>
            <AppShellContent />
          </ChatProvider>
        </ScrollRestoreProvider>
      </NavigationProvider>
    </AuthProvider>
  )
}
