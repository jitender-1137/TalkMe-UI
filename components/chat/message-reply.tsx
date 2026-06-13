"use client"

import { cn } from "@/lib/utils"
import { Image as ImageIcon, Video, FileText, Mic } from "lucide-react"
import type { ReplyTo } from "./types"

interface MessageReplyProps {
  reply: ReplyTo
  isSent: boolean
}

export function MessageReply({ reply, isSent }: MessageReplyProps) {
  const getTypeIcon = () => {
    switch (reply.type) {
      case "image":
        return <ImageIcon className="h-3 w-3" />
      case "video":
        return <Video className="h-3 w-3" />
      case "audio":
        return <Mic className="h-3 w-3" />
      case "document":
        return <FileText className="h-3 w-3" />
      default:
        return null
    }
  }

  return (
    <div
      className={cn(
        "flex mb-2 rounded-lg p-2 border-l-4",
        isSent
          ? "bg-primary-foreground/20 border-primary-foreground/50"
          : "bg-card/60 border-primary/50"
      )}
    >
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-xs font-semibold",
            isSent ? "text-primary-foreground/90" : "text-primary"
          )}
        >
          {reply.senderName}
        </p>
        <p
          className={cn(
            "text-xs truncate flex items-center gap-1",
            isSent ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {getTypeIcon()}
          {reply.content}
        </p>
      </div>
    </div>
  )
}
