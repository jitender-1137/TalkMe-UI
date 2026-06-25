"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Phone, Video, MoreHorizontal, ArrowLeft, Search, Menu, Trash2, BellOff, Ban, Image, UserCircle, UserPlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AvatarStatusBadge } from "@/components/presence"
import { useChatContext } from "./chat-context"
import { useImageViewer } from "@/components/providers"
import { BASE_URL } from "@/src/api/client"
import { cn } from "@/lib/utils"
import type { ChatContact, PresenceActivity } from "./types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ChatHeaderProps {
  contact: ChatContact
  onBack?: () => void
  showBackButton?: boolean
  onProfileClick?: () => void
  onAudioCall?: () => void
  onVideoCall?: () => void
  onSearchInChat?: () => void
  onViewMedia?: () => void
  onMuteNotifications?: () => void
  onBlockContact?: () => void
  onUnblockContact?: () => void
  onClearChat?: () => void
  onAddFriend?: () => void
  onRemoveFriend?: () => void
  isMuted?: boolean
}

function getActivityText(activity: PresenceActivity, lastSeen?: string): string {
  switch (activity) {
    case "typing":
      return "typing..."
    case "recording":
      return "recording audio..."
    case "recording_video":
      return "recording video..."
    case "online":
      return "Online"
    case "idle":
      return "Away"
    case "offline":
      return lastSeen ? `Last seen ${lastSeen}` : "Offline"
  }
}

function getPresenceStatus(activity: PresenceActivity): "online" | "idle" | "offline" {
  switch (activity) {
    case "typing":
    case "recording":
    case "recording_video":
    case "online":
      return "online"
    case "idle":
      return "idle"
    default:
      return "offline"
  }
}

export function ChatHeader({ 
  contact, 
  onBack, 
  showBackButton = false, 
  onProfileClick,
  onAudioCall,
  onVideoCall,
  onSearchInChat,
  onViewMedia,
  onMuteNotifications,
  onBlockContact,
  onUnblockContact,
  onClearChat,
  onAddFriend,
  onRemoveFriend,
  isMuted,
}: ChatHeaderProps) {
  const { setShowMobileSecondaryPanel } = useChatContext()
  const { showImage } = useImageViewer()
  const activityText = getActivityText(contact.activity, contact.lastSeen)
  const isActive = contact.activity === "typing" || contact.activity === "recording" || contact.activity === "recording_video"

  return (
    <header className="flex items-center justify-between px-4 h-16 border-b border-white/10 bg-card shrink-0">
      <div className="flex items-center gap-3">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 -ml-2 rounded-xl hover:bg-white/10 active:scale-95 transition-all"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        <button
          onClick={() => onProfileClick?.()}
          className="relative w-10 h-10 rounded-full cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <AvatarStatusBadge
            fallback={(contact.name || "U").slice(0, 2).toUpperCase()}
            status={getPresenceStatus(contact.activity)}
            size="md"
            showStatusDot
            src={contact.avatar}
            gender={contact.gender}
          />
        </button>

        <div className="min-w-0">
          <h2 className="font-semibold text-foreground truncate">{contact.name}</h2>
          <AnimatePresence mode="wait">
            <motion.p
              key={activityText}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "text-xs truncate",
                isActive ? "text-primary font-medium" : "text-muted-foreground"
              )}
            >
              {isActive && (
                <span className="inline-flex gap-0.5 mr-1">
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                    className="w-1 h-1 rounded-full bg-primary"
                  />
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                    className="w-1 h-1 rounded-full bg-primary"
                  />
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                    className="w-1 h-1 rounded-full bg-primary"
                  />
                </span>
              )}
              {contact.isBlockedByMe || contact.hasBlockedMe ? "" : activityText}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white/10 active:scale-95 transition-all" onClick={onAudioCall} disabled={contact.isBlockedByMe || contact.hasBlockedMe}>
          <Phone className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white/10 active:scale-95 transition-all" onClick={onVideoCall} disabled={contact.isBlockedByMe || contact.hasBlockedMe}>
          <Video className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white/10 active:scale-95 transition-all">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover border-white/10 rounded-xl">
            <DropdownMenuItem onClick={onSearchInChat}>
              <Search className="h-4 w-4 mr-2" />
              Search in chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onProfileClick}>
              <UserCircle className="h-4 w-4 mr-2" />
              View contact
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onViewMedia}>
              <Image className="h-4 w-4 mr-2" />
              Media, links, and docs
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMuteNotifications}>
              <BellOff className="h-4 w-4 mr-2" />
              {isMuted ? "Unmute notifications" : "Mute notifications"}
            </DropdownMenuItem>
            {contact.isFriend === false && (
              <DropdownMenuItem onClick={onAddFriend}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add friend
              </DropdownMenuItem>
            )}
            {contact.isFriend === true && (
              <DropdownMenuItem className="text-destructive" onClick={onRemoveFriend}>
                <Ban className="h-4 w-4 mr-2" />
                Remove friend
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {contact.isBlockedByMe ? (
              <DropdownMenuItem className="text-destructive" onClick={onUnblockContact}>
                <Ban className="h-4 w-4 mr-2" />
                Unblock contact
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem className="text-destructive" onClick={onBlockContact}>
                <Ban className="h-4 w-4 mr-2" />
                Block contact
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-destructive" onClick={onClearChat}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
