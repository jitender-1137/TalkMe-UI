"use client"

import { cn } from "@/lib/utils"
import { navigationItems } from "./navigation-config"
import { useNavigation } from "./navigation-context"
import { useAuth } from "./auth-context"
import { useChats, useContactRequests, useNotifications } from "@/src/api/hooks"
import { Button } from "@/components/ui/button"
import { useLobbyStore } from "@/components/lobby/lobby-store"
import { useInbox } from "@/components/lobby/hooks"
import { LogOut } from "lucide-react"
import { AvatarStatusBadge } from "@/components/presence"
import { usePresenceStore } from "@/lib/presence"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function DesktopSidebar() {
  const { activeTab, setActiveTab } = useNavigation()
  const { isGuest, user, logout, openLoginModal } = useAuth()
  const status = usePresenceStore((state) => state.status)
  const invisibleMode = usePresenceStore((state) => state.invisibleMode)
  const displayStatus = invisibleMode ? "offline" : status

  const { data: conversations = [] } = useChats()
  const { data: contactRequests = [] } = useContactRequests()
  const { data: notifications = [] } = useNotifications()

  // Calculate unread counts
  const unreadChatsCount = conversations.reduce((acc, chat) => acc + (chat.unreadCount || 0), 0)
  const pendingRequestsCount = contactRequests.length
  const unreadNotificationsCount = Array.isArray(notifications)
    ? notifications.filter((n) => !n.isRead).length
    : 0


  const { unreadCount: lobbyUnreadCount } = useInbox()

  const getBadgeCount = (itemId: string) => {
    if (itemId === "chats") return unreadChatsCount
    if (itemId === "friends") return pendingRequestsCount
    if (itemId === "match") return lobbyUnreadCount
    return 0
  }

  return (
    <aside className="hidden md:flex flex-col w-[72px] bg-sidebar border-r border-white/5 h-screen fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 border-b border-white/5">
        <div className="w-10 h-10 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg shadow-primary/25">
          <img src="/apple-icon.png" alt="TalkMe" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Navigation */}
      <TooltipProvider delayDuration={0}>
        <nav className="flex-1 flex flex-col items-center py-4 gap-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      setActiveTab(item.id)
                    }}
                    className={cn(
                      "relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                        : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/8 active:scale-95"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {getBadgeCount(item.id) > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-1">
                        {getBadgeCount(item.id) > 99 ? "99+" : getBadgeCount(item.id)}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>

        {/* Bottom actions */}
        <div className="flex flex-col items-center gap-2 pb-4 border-t border-white/5 pt-4">
          {isGuest ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={openLoginModal}
                  className="w-12 h-12 rounded-xl bg-primary hover:bg-primary/90"
                >
                  <span className="text-sm font-semibold">Go</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Sign Up / Login
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={logout}
                    className="w-12 h-12 rounded-xl text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  Log out
                </TooltipContent>
              </Tooltip>
              <AvatarStatusBadge
                fallback={user?.name?.charAt(0) || "U"}
                status={displayStatus}
                size="md"
              />
            </div>
          )}
        </div>
      </TooltipProvider>
    </aside>
  )
}
