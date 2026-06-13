"use client"

import { motion } from "framer-motion"
import { Check, CheckCheck, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MessageStatus } from "./types"

interface MessageStatusIconProps {
  status: MessageStatus
  className?: string
}

export function MessageStatusIcon({ status, className }: MessageStatusIconProps) {
  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn("inline-flex items-center", className)}
    >
      {status === "sending" && (
        <Clock className="h-3 w-3 text-muted-foreground/70" />
      )}
      {status === "sent" && (
        <Check className="h-3.5 w-3.5 text-muted-foreground/70" />
      )}
      {status === "delivered" && (
        <CheckCheck className="h-3.5 w-3.5 text-muted-foreground/70" />
      )}
      {status === "seen" && (
        <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
      )}
    </motion.span>
  )
}
