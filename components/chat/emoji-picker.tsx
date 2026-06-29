'use client'

import { motion, AnimatePresence } from "framer-motion"
import { Smile, Plus } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { EmojiReactionPanel } from "./emoji-reaction-panel"

const EMOJI_LIST = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "🙏",
]

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
  isSent?: boolean
}

export function EmojiPicker({ onEmojiSelect, isSent }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showFull, setShowFull] = useState(false)

  const close = () => {
    setShowFull(false)
    setIsOpen(false)
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      // Keep open while the full picker is up; only hover-close the quick bar.
      onMouseLeave={() => { if (!showFull) setIsOpen(false) }}
    >
      {/* Trigger Button - subtle gray face icon (tap toggles for touch devices) */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-200 bg-transparent hover:bg-white/10 transition-all cursor-pointer"
        aria-label="Add reaction"
      >
        <Smile className="h-5 w-5" />
      </button>

      {/* Full emoji picker (opened by the "+") */}
      <AnimatePresence>
        {showFull && (
          <>
            {/* Click-away backdrop */}
            <div className="fixed inset-0 z-40" onClick={close} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 6 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className={cn(
                "absolute bottom-full mb-1.5 z-50",
                isSent ? "right-0 origin-bottom-right" : "left-0 origin-bottom-left",
              )}
            >
              <EmojiReactionPanel
                onSelect={(emoji) => {
                  onEmojiSelect(emoji)
                  close()
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && !showFull && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 5 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className={cn(
              "absolute bottom-full mb-1.5 py-1.5 px-3 bg-neutral-900 border border-white/10 rounded-full shadow-2xl flex items-center gap-1.5 z-50 whitespace-nowrap",
              isSent ? "right-0 origin-bottom-right" : "left-0 origin-bottom-left"
            )}
          >
            {EMOJI_LIST.map((emoji) => (
              <motion.button
                key={emoji}
                whileHover={{ scale: 1.35, y: -2 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                onClick={() => {
                  onEmojiSelect(emoji)
                  setIsOpen(false)
                }}
                className="text-2xl p-1 cursor-pointer transition-transform hover:z-10"
              >
                {emoji}
              </motion.button>
            ))}
            
            {/* Divider */}
            <div className="w-[1px] h-5 bg-white/10 mx-0.5" />

            {/* Plus Button — opens the full emoji picker */}
            <button
              onClick={() => setShowFull(true)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="More reactions"
            >
              <Plus className="h-4.5 w-4.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
