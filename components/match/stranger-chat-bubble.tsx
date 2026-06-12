"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { SafeModeMedia } from "./safe-mode-media"
import type { StrangerMessage } from "./types"

interface StrangerChatBubbleProps {
  message: StrangerMessage
  onRevealMedia: () => void
}

export function StrangerChatBubble({ message, onRevealMedia }: StrangerChatBubbleProps) {
  const isFromStranger = message.isFromStranger

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex w-full mb-3",
        isFromStranger ? "justify-start" : "justify-end"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] md:max-w-[70%]",
          isFromStranger ? "items-start" : "items-end"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 shadow-sm",
            isFromStranger
              ? "bg-card border border-border rounded-bl-md"
              : "bg-primary text-primary-foreground rounded-br-md"
          )}
        >
          {/* Media content with safe mode */}
          {message.media && (
            <div className="mb-2">
              <SafeModeMedia message={message} onReveal={onRevealMedia} />
            </div>
          )}
          
          {/* Text content */}
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
          
          {/* Timestamp */}
          <div
            className={cn(
              "flex items-center justify-end gap-1 mt-1",
              isFromStranger ? "text-muted-foreground" : "text-primary-foreground/70"
            )}
          >
            <span className="text-[10px]">{message.time}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
