"use client"

import { motion } from "framer-motion"
import { Check, CheckCheck, Clock, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MessageStatus } from "./types"

interface MessageStatusIconProps {
  status: MessageStatus
  className?: string
  /** When status is "failed", tapping the icon retries the send. */
  onRetry?: () => void
}

export function MessageStatusIcon({ status, className, onRetry }: MessageStatusIconProps) {
  if (status === "failed") {
    return (
      <button
        type="button"
        onClick={onRetry}
        aria-label="Failed to send — tap to retry"
        title="Failed to send — tap to retry"
        className={cn("inline-flex items-center text-red-500 hover:text-red-600", className)}
      >
        <AlertCircle className="h-3.5 w-3.5" />
      </button>
    )
  }
  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn("inline-flex items-center", className)}
    >
      {status === "uploading" && (
        <Loader2 className="h-3 w-3 text-muted-foreground/70 animate-spin" />
      )}
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
