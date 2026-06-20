"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SafeModeMedia } from "./safe-mode-media"
import { MessageMedia } from "@/components/chat/message-media"
import { BubbleBody, BubbleShell } from "@/components/chat/bubble-body"
import type { MediaAttachment } from "@/components/chat/types"
import type { StrangerMessage } from "./types"

const isAudioUrl = (content: string) => {
  if (!content) return false;
  const trimmed = content.trim();
  const isUrl = trimmed.startsWith("https://") || 
                trimmed.startsWith("http://") || 
                trimmed.startsWith("/api/") || 
                trimmed.startsWith("/uploads/");
  return (
    isUrl &&
    (trimmed.match(/\.(webm|mp3|wav|ogg|m4a)(\?.*)?$/i) ||
      trimmed.includes("/uploads/voice-message-") ||
      trimmed.includes("/uploads/audio-") ||
      (trimmed.includes("/uploads/media") && (trimmed.includes(".webm") || trimmed.includes(".mp3") || trimmed.includes(".wav") || trimmed.includes(".ogg") || trimmed.includes(".m4a"))))
  );
};

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
        <BubbleShell isSent={!isFromStranger}>
          {/* Media content with safe mode */}
          {message.media && (
            <div className="mb-1">
              <SafeModeMedia message={message} onReveal={onRevealMedia} onHide={onHideMedia} />
            </div>
          )}

          {/* Audio content */}
          {message.content && isAudioUrl(message.content) && (
            <div className="my-1">
              <MessageMedia
                media={{
                  type: "audio",
                  url: message.content,
                  fileName: "voice-message.webm",
                }}
                isSent={!isFromStranger}
                chatId="stranger"
                messageId={message.id}
              />
            </div>
          )}

          {/* Shared compact body: text + inline bottom-right time (WhatsApp-style). */}
          <BubbleBody
            content={message.content && !isAudioUrl(message.content) ? message.content : undefined}
            time={message.time}
            hasMedia={!!message.media || (!!message.content && !!isAudioUrl(message.content))}
            timeClassName={isFromStranger ? "text-muted-foreground" : "text-primary-foreground/65"}
          />
        </BubbleShell>
      </div>
    </motion.div>
  )
}
