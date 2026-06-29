"use client"

import { cn } from "@/lib/utils"
import { Image as ImageIcon, Video, FileText, Mic } from "lucide-react"
import type { ReplyTo } from "./types"
import { replyHasThumbnail, replyPreviewLabel } from "@/lib/chat/reply-preview"

interface MessageReplyProps {
  reply: ReplyTo
  isSent: boolean
}

export function MessageReply({ reply, isSent }: MessageReplyProps) {
  const type = (reply.type || "text").toLowerCase()
  const getTypeIcon = () => {
    switch (type) {
      case "image":
      case "sticker":
        return <ImageIcon className="h-3 w-3 shrink-0" />
      case "video":
        return <Video className="h-3 w-3 shrink-0" />
      case "audio":
        return <Mic className="h-3 w-3 shrink-0" />
      case "document":
        return <FileText className="h-3 w-3 shrink-0" />
      default:
        return null
    }
  }
  const showThumb = replyHasThumbnail(reply)

  return (
    <div
      className={cn(
        "flex items-stretch gap-2 mb-2 rounded-lg p-2 border-l-4 overflow-hidden",
        isSent
          ? "bg-primary-foreground/20 border-primary-foreground/50"
          : "bg-card/60 border-primary/50",
      )}
    >
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-xs font-semibold truncate",
            isSent ? "text-primary-foreground/90" : "text-primary",
          )}
        >
          {reply.senderName}
        </p>
        <p
          className={cn(
            "text-xs truncate flex items-center gap-1",
            isSent ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {getTypeIcon()}
          {replyPreviewLabel(reply)}
        </p>
      </div>
      {showThumb && (
        <div className="h-10 w-10 shrink-0 rounded overflow-hidden bg-black/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={reply.mediaUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}
    </div>
  )
}
