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
import { motion } from "framer-motion";
import { User } from "lucide-react";

export function MobileBottomNav() {
  const { showLoginModal, showSignupModal, user } = useAuth();
  const { activeTab, setActiveTab } = useNavigation();
  const { showMobileSecondaryPanel, selectedConversationId } = useChatContext();
  const matchStatus = useMatchStore((state) => state.status);

  const { data: conversations = [] } = useChats();
  const { data: contactRequests = [] } = useContactRequests();
  const { data: notifications = [] } = useNotifications();

  // Calculate unread counts
  const unreadChatsCount = conversations.reduce((acc, chat) => acc + (chat.unreadCount || 0), 0);
  const pendingRequestsCount = contactRequests.length;

  const lobbySelectedUser = useLobbyStore((state) => state.selectedUser);
  const { unreadCount: lobbyUnreadCount } = useInbox();

  const isOneToOneOpen =
    activeTab === "chats" && selectedConversationId !== null && !showMobileSecondaryPanel;
  const isLobbyChatOpen = activeTab === "match" && lobbySelectedUser !== null;
  const isMatchActive = activeTab === "match" && matchStatus !== "idle";

  // Hide nav bar when active in a conversation room or auth modals
  if (showLoginModal || showSignupModal || isOneToOneOpen || isLobbyChatOpen || isMatchActive) {
    return null;
  }

  const getBadgeCount = (itemId: string) => {
    if (itemId === "chats") return unreadChatsCount;
    if (itemId === "friends") return pendingRequestsCount;
    if (itemId === "match") return lobbyUnreadCount;
    return 0;
  };

  return (
    <nav className="fixed bottom-[calc(env(safe-area-inset-bottom)+28px)] left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-lg md:hidden">
      {/* Floating glassmorphic rounded pill */}
      <div className="rounded-full bg-white/70 dark:bg-[rgb(30,37,43)] backdrop-blur-[25px] border border-black/5 dark:border-white/10 shadow-lg shadow-black/10 dark:shadow-black/30 px-2">
        <div className="flex items-center justify-around h-13 py-1 relative">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badgeCount = getBadgeCount(item.id);

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                }}
                className={cn(
                  "flex flex-col items-center justify-center relative flex-1 py-1.5 transition-all cursor-pointer select-none",
                  isActive
                    ? "text-primary opacity-100"
                    : "text-muted-foreground hover:opacity-85 active:scale-95",
                )}
              >
                {/* Sliding active background indicator using Framer Motion spring layout */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-x-1 inset-y-0 rounded-2xl bg-primary/10 dark:bg-primary/15 border border-primary/40 dark:border-primary/50 shadow-[0_0_12px_rgba(34,197,94,0.35)] z-0"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}

                <div className="relative z-10 flex flex-col items-center">
                  <div className="relative p-1 rounded-full flex items-center justify-center min-h-7 min-w-7">
                    {/* Badge anchored to the icon (visible in active & inactive states) */}
                    {badgeCount > 0 && (
                      <span className="absolute top-0 -right-1 z-20 h-4 min-w-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold leading-none px-1 ring-2 ring-background dark:ring-[rgb(30,37,43)]">
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                    {item.id === "settings" ? (
                      /* settings tab shows user avatar image (DP) */
                      <div
                        className={cn(
                          "h-5.5 w-5.5 rounded-full overflow-hidden flex items-center justify-center transition-all duration-200 bg-zinc-800",
                          isActive
                            ? "ring-2 ring-primary scale-110"
                            : "ring-1 ring-muted-foreground/30",
                        )}
                      >
                        {user?.avatar ? (
                          <img src={user.avatar} alt="You" className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-3.5 w-3.5 text-zinc-400" />
                        )}
                      </div>
                    ) : (
                      <Icon
                        className={cn(
                          "h-5 w-5 transition-transform duration-200",
                          isActive && "scale-110",
                        )}
                        fill={isActive ? "currentColor" : "none"}
                        strokeWidth={isActive ? 2 : 1.75}
                      />
                    )}
                  </div>

                  <span
                    className={cn(
                      "text-[9px] tracking-tight transition-all",
                      isActive ? "font-semibold text-primary" : "font-medium text-muted-foreground",
                    )}
                  >
                    {item.id === "settings" ? "You" : item.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
