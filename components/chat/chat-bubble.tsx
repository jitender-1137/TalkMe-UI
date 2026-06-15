"use client"

import { forwardRef, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { MessageStatusIcon } from "./message-status"
import { MessageReactions } from "./message-reactions"
import { MessageReply } from "./message-reply"
import { MessageMedia } from "./message-media"
import { EmojiPicker } from "./emoji-picker"
import { useLongPress } from "@/hooks/use-long-press"
import { useIsMobile } from "@/hooks/use-mobile"
import type { Message } from "./types"

interface ChatBubbleProps {
  message: Message
  onReactionClick?: (messageId: string, emoji: string) => void
  onReply?: (message: Message) => void
  onOpenMessageMenu?: (e: PointerEvent | MouseEvent, message: Message) => void
}

export const ChatBubble = forwardRef<HTMLDivElement, ChatBubbleProps>(
  ({ message, onReactionClick, onReply, onOpenMessageMenu }, ref) => {
    const isMobile = useIsMobile()
    const [isPressed, setIsPressed] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    
    const { isSent, media, replyTo, reactions, isDeleted, type, content, time, status } = message

    const openMenu = useCallback((e: PointerEvent | MouseEvent) => {
      setIsPressed(false)
      // Call the parent callback to open the menu at the top level
      onOpenMessageMenu?.(e, message)
    }, [onOpenMessageMenu, message])

    const longPressHandlers = useLongPress({
      onLongPress: (e) => {
        setIsPressed(false)
        openMenu(e)
      },
      onPointerDown: () => setIsPressed(true),
    } as Parameters<typeof useLongPress>[0])



    if (isDeleted) {
      return (
        <div
          ref={ref}
          className={cn("flex py-1", isSent ? "justify-end" : "justify-start")}
        >
          <div
            className={cn(
              "max-w-[75%] px-4 py-2.5 rounded-[20px] italic",
              isSent
                ? "bg-primary/20 text-muted-foreground rounded-br-md"
                : "bg-card/40 text-muted-foreground rounded-bl-md"
            )}
          >
            <p className="text-sm">This message was deleted</p>
          </div>
        </div>
      )
    }

    return (
      <>
        <div
          ref={ref}
          className={cn(
            "flex py-3 select-none",
            isSent ? "justify-end" : "justify-start",
            isMobile ? "flex-col" : "gap-2"
          )}
          onMouseEnter={() => !isMobile && setIsHovered(true)}
          onMouseLeave={() => !isMobile && setIsHovered(false)}
        >
          <div className={cn("flex items-end gap-2", isSent ? "flex-row-reverse" : "flex-row")}>
            <div
              className={cn("max-w-[75%] flex-shrink-0", isSent ? "items-end" : "items-start")}
              {...longPressHandlers}
              onContextMenu={longPressHandlers.onContextMenu}
              style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", touchAction: "manipulation" }}
            >
              <div
              className={cn(
                type === "sticker"
                  ? "p-0 bg-transparent shadow-none relative overflow-hidden rounded-2xl"
                  : "px-4 py-2.5 rounded-[20px] shadow-sm relative",
                type !== "sticker" && (isSent
                  ? "bg-primary text-primary-foreground rounded-br-md shadow-primary/15"
                  : "bg-muted text-card-foreground rounded-bl-md")
              )}
            >
              {replyTo && <MessageReply reply={replyTo} isSent={isSent} />}
              {media && <MessageMedia media={media} isSent={isSent} chatId={(message as any).chatId} messageId={message.id} />}
              {content && (
                <p className={cn("text-sm leading-relaxed whitespace-pre-wrap break-words", media && "mt-1")}>
                  {content}
                </p>
              )}
              <div
                className={cn(
                  "flex items-center gap-1 mt-1",
                  isSent ? "justify-end" : "justify-start",
                  type === "sticker" && "absolute bottom-1 right-1 mt-0 bg-black/40 backdrop-blur-[2px] rounded-full px-2 py-0.5"
                )}
              >
                <span
                  className={cn(
                    "text-[10px]",
                    type === "sticker" ? "text-white/80 font-medium" : (isSent ? "text-primary-foreground/70" : "text-muted-foreground")
                  )}
                >
                  {time}
                </span>
                {isSent && <MessageStatusIcon status={status} className={type === "sticker" ? "[&_svg]:text-white/80" : undefined} />}
              </div>
            </div>

              {reactions && reactions.length > 0 && (
                <MessageReactions
                  reactions={reactions}
                  isSent={isSent}
                  onReactionClick={(emoji) => onReactionClick?.(message.id, emoji)}
                />
              )}
              </div>

            {!isMobile && (
              <div className={cn("w-10 h-10 flex-shrink-0", !isHovered && "invisible")}>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <EmojiPicker
                      onEmojiSelect={(emoji) => onReactionClick?.(message.id, emoji)}
                      isSent={isSent}
                    />
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </>
    )
  }
)
