"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SafeModeMedia } from "./safe-mode-media"
import type { StrangerMessage } from "./types"

interface StrangerChatBubbleProps {
  message: StrangerMessage
  onRevealMedia: () => void
  onHideMedia: () => void
  onAcceptImageRequest?: () => void
  onRejectImageRequest?: () => void
}

export function StrangerChatBubble({
  message,
  onRevealMedia,
  onHideMedia,
  onAcceptImageRequest,
  onRejectImageRequest,
}: StrangerChatBubbleProps) {
  const isFromStranger = message.isFromStranger

  // Intercept special image requests and acceptances
  if (message.content === "__IMAGE_REQUEST__") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex justify-center w-full mb-4"
      >
        <div className="bg-[#1e293b]/70 border border-slate-700/50 backdrop-blur-md rounded-2xl p-4 max-w-sm text-center shadow-xl space-y-3">
          <p className="text-sm font-medium text-slate-200">
            {isFromStranger
              ? "Stranger wants to exchange images. Allow?"
              : "You requested to exchange images. Waiting for approval..."}
          </p>
          {isFromStranger && onAcceptImageRequest && onRejectImageRequest && (
            <div className="flex justify-center gap-3">
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl"
                onClick={onAcceptImageRequest}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-white/10 rounded-xl"
                onClick={onRejectImageRequest}
              >
                Reject
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  if (message.content === "__IMAGE_ACCEPT__") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex justify-center w-full mb-4"
      >
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full px-4 py-1.5 text-xs font-semibold shadow-inner">
          {isFromStranger
            ? "Stranger accepted image exchange. Both of you can now send images."
            : "You accepted the image exchange request."}
        </div>
      </motion.div>
    )
  }

  if (message.content === "__IMAGE_REJECT__") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex justify-center w-full mb-4"
      >
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-full px-4 py-1.5 text-xs font-semibold shadow-inner">
          {isFromStranger
            ? "Stranger rejected the image exchange request."
            : "You rejected the image exchange request."}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
      className={cn("flex w-full mb-3", isFromStranger ? "justify-start" : "justify-end")}
    >
      <div className={cn("max-w-[80%] md:max-w-[70%] flex flex-col", isFromStranger ? "items-start" : "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 shadow-sm",
            isFromStranger
              ? "bg-[#202c33] border border-white/5 rounded-bl-md text-slate-100"
              : "bg-primary text-primary-foreground rounded-br-md"
          )}
        >
          {/* Media content with safe mode */}
          {message.media && (
            <div className="mb-2">
              <SafeModeMedia message={message} onReveal={onRevealMedia} onHide={onHideMedia} />
            </div>
          )}

          {/* Text content */}
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}

          {/* Timestamp */}
          <div
            className={cn(
              "flex items-center justify-end gap-1 mt-1",
              isFromStranger ? "text-slate-400" : "text-primary-foreground/75"
            )}
          >
            <span className="text-[10px]">{message.time}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
