"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { Reaction } from "./types"

interface MessageReactionsProps {
  reactions: Reaction[]
  isSent: boolean
  onReactionClick?: (emoji: string) => void
}

export function MessageReactions({ reactions, isSent, onReactionClick }: MessageReactionsProps) {
  if (!reactions || reactions.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-wrap gap-1 mt-1",
        isSent ? "justify-end" : "justify-start"
      )}
    >
      {reactions.map((reaction, index) => (
        <motion.button
          key={reaction.emoji}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.05, type: "spring", stiffness: 400 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onReactionClick?.(reaction.emoji)}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
            "bg-muted border border-border/50",
            "hover:bg-muted transition-colors",
            reaction.hasReacted && "ring-1 ring-primary/30 bg-primary/10"
          )}
        >
          <span className="text-sm">{reaction.emoji}</span>
          {reaction.count > 1 && (
            <span className="text-muted-foreground font-medium">{reaction.count}</span>
          )}
        </motion.button>
      ))}
    </motion.div>
  )
}
