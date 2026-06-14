"use client";

import { cn } from "@/lib/utils";
import { navigationItems } from "./navigation-config";
import { useNavigation } from "./navigation-context";
import { useChatContext } from "@/components/chat/chat-context";
import { useChats, useContactRequests, useNotifications } from "@/src/api/hooks";
import { useMatchStore } from "@/components/match/match-store";
import { useInbox } from "@/components/lobby/hooks";
import { useLobbyStore } from "@/components/lobby/lobby-store";
import { useAuth } from "./auth-context";

export function MobileBottomNav() {
  const { showLoginModal, showSignupModal } = useAuth();
  const { activeTab, setActiveTab } = useNavigation();
  const { showMobileSecondaryPanel, selectedConversationId } = useChatContext();
  const matchStatus = useMatchStore((state) => state.status);

  const { data: conversations = [] } = useChats();
  const { data: contactRequests = [] } = useContactRequests();
  const { data: notifications = [] } = useNotifications();

  // Calculate unread counts
  const unreadChatsCount = conversations.reduce((acc, chat) => acc + (chat.unreadCount || 0), 0);
  const pendingRequestsCount = contactRequests.length;
  const unreadNotificationsCount = Array.isArray(notifications)
    ? notifications.filter((n) => !n.isRead).length
    : 0;

  const lobbySelectedUser = useLobbyStore((state) => state.selectedUser);
  const { unreadCount: lobbyUnreadCount } = useInbox();

  const isOneToOneOpen = activeTab === "chats" && selectedConversationId !== null && !showMobileSecondaryPanel;
  const isLobbyChatOpen = activeTab === "match" && lobbySelectedUser !== null;
  const isStrangerChatOpen = activeTab === "match" && matchStatus === "matched";

  if (
    showLoginModal ||
    showSignupModal ||
    isOneToOneOpen ||
    isLobbyChatOpen ||
    isStrangerChatOpen
  ) {
    return null;
  }

  const getBadgeCount = (itemId: string) => {
    if (itemId === "chats") return unreadChatsCount;
    if (itemId === "friends") return pendingRequestsCount;
    if (itemId === "match") return lobbyUnreadCount;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-bottom">
      <div className="mx-6 mb-8 rounded-full bg-card border border-white/10 shadow-lg shadow-black/10">
        <div className="flex items-center justify-around h-14 px-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-all duration-200 relative rounded-xl",
                  isActive ? "text-primary" : "text-white/70 hover:text-white/90 active:scale-95",
                )}
              >
                <div className="relative">
                  <div
                    className={cn(
                      "rounded-xl transition-all duration-200",
                      isActive && "bg-primary/10",
                    )}
                  >
                    <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
                  </div>
                  {getBadgeCount(item.id) > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-1">
                      {getBadgeCount(item.id) > 99 ? "99+" : getBadgeCount(item.id)}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium transition-all",
                    isActive && "font-semibold",
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
