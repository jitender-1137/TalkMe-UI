"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  BellOff,
  Archive,
  Pin,
  Trash2,
  UserCircle,
  Ban,
  MailOpen,
  MoreHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface ConversationContextMenuProps {
  isOpen: boolean
  isMobile: boolean
  position?: { x: number; y: number }
  isUnread?: boolean
  isPinned?: boolean
  isMuted?: boolean
  isArchived?: boolean
  onClose: () => void
  onMute: () => void
  onArchive: () => void
  onPin: () => void
  onDelete: () => void
  onViewProfile: () => void
  onBlock: () => void
  onMarkReadToggle: () => void
}

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])
  return mounted ? createPortal(children, document.body) : null
}

export function ConversationContextMenu({
  isOpen,
  isMobile,
  position,
  isUnread = false,
  isPinned = false,
  isMuted = false,
  isArchived = false,
  onClose,
  onMute,
  onArchive,
  onPin,
  onDelete,
  onViewProfile,
  onBlock,
  onMarkReadToggle,
}: ConversationContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (e.button === 2) { // Right-click button
        onClose()
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [isOpen, onClose])

  const actions = [
    { icon: UserCircle, label: "View profile",   action: onViewProfile, danger: false },
    { icon: MailOpen,   label: isUnread ? "Mark as read" : "Mark as unread", action: onMarkReadToggle,  danger: false },
    { icon: Pin,        label: isPinned ? "Unpin chat" : "Pin chat",        action: onPin,         danger: false },
    { icon: Archive,    label: isArchived ? "Unarchive" : "Archive",         action: onArchive,     danger: false },
    { icon: BellOff,    label: isMuted ? "Unmute" : "Mute",            action: onMute,        danger: false },
    { icon: Ban,        label: "Block",           action: onBlock,       danger: true  },
    { icon: Trash2,     label: "Delete chat",     action: onDelete,      danger: true  },
    { icon: MoreHorizontal, label: "More...",     action: () => {},      danger: false },
  ]

  // Same floating popup for both mobile and desktop with viewport bounds checking
  const getAdjustedPosition = () => {
    const menuWidth = 240
    const menuHeight = actions.length * 45 + 10 // approximate height with padding
    const padding = 12
    
    let adjustedX = (position?.x ?? 0)
    let adjustedY = (position?.y ?? 0)
    
    // Adjust horizontal position if menu goes off-screen
    if (adjustedX + menuWidth + padding > window.innerWidth) {
      adjustedX = Math.max(padding, window.innerWidth - menuWidth - padding)
    }
    if (adjustedX < padding) {
      adjustedX = padding
    }
    
    // Adjust vertical position - try showing below first, then above if needed
    const spaceBelow = window.innerHeight - adjustedY
    const spaceAbove = adjustedY
    
    if (spaceBelow >= menuHeight + padding) {
      // Enough space below - show menu below the click
      adjustedY = adjustedY
    } else if (spaceAbove >= menuHeight + padding) {
      // Not enough space below but enough above - show menu above
      adjustedY = adjustedY - menuHeight - 5
    } else {
      // Not enough space either way - prioritize showing above the click
      adjustedY = Math.max(padding, adjustedY - menuHeight - 5)
    }
    
    // Final clamp to ensure menu stays within viewport
    adjustedY = Math.max(padding, Math.min(adjustedY, window.innerHeight - menuHeight - padding))
    
    return { x: adjustedX, y: adjustedY }
  }
  
  const adjustedPos = getAdjustedPosition()

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-[200]"
            />
            <motion.div
              key="menu"
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.92, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -4 }}
              transition={{ duration: 0.13 }}
              style={{ top: adjustedPos.y, left: adjustedPos.x }}
              className="fixed z-[201] min-w-[240px] bg-popover border border-white/10 rounded-2xl shadow-xl overflow-hidden"
            >
              {actions.map(({ icon: Icon, label, action, danger }, index) => (
                <div key={label}>
                  {index === 5 && <div className="h-px bg-white/10" />}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      action(); 
                      onClose();
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-white/10 active:bg-white/10 transition-colors",
                      danger ? "text-destructive hover:bg-destructive/10" : "text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  )
}
