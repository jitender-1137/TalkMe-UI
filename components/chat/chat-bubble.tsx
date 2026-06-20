"use client";

import { forwardRef, useState, useCallback, useRef, memo } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { Reply } from "lucide-react";
import { MessageStatusIcon } from "./message-status";
import { BubbleBody, BubbleShell } from "./bubble-body";
import { MessageReactions } from "./message-reactions";
import { MessageReply } from "./message-reply";
import { MessageMedia } from "./message-media";
import { EmojiPicker } from "./emoji-picker";
import { useLongPress } from "@/hooks/use-long-press";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Message } from "./types";

interface ChatBubbleProps {
  message: Message;
  onReactionClick?: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
  onRetry?: (message: Message) => void;
  onOpenMessageMenu?: (e: PointerEvent | MouseEvent, message: Message) => void;
}

const ChatBubbleImpl = forwardRef<HTMLDivElement, ChatBubbleProps>(
  ({ message, onReactionClick, onReply, onRetry, onOpenMessageMenu }, ref) => {
    const isMobile = useIsMobile();
    const [isPressed, setIsPressed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const { isSent, media, replyTo, reactions, isDeleted, type, content, time, status } = message;

    const openMenu = useCallback(
      (e: PointerEvent | MouseEvent) => {
        setIsPressed(false);
        // Call the parent callback to open the menu at the top level
        onOpenMessageMenu?.(e, message);
      },
      [onOpenMessageMenu, message],
    );

    const longPressHandlers = useLongPress({
      onLongPress: (e) => {
        setIsPressed(false);
        openMenu(e);
      },
      onPointerDown: () => setIsPressed(true),
    } as Parameters<typeof useLongPress>[0]);

    const x = useMotionValue(0);
    const replyIconOpacity = useTransform(x, [0, 50], [0, 1]);
    const replyIconScale = useTransform(x, [0, 50], [0.6, 1]);
    const replyIconX = useTransform(x, [0, 60], [-15, 5]);

    const hasTriggeredHapticRef = useRef(false);

    const handleDrag = useCallback((event: any, info: any) => {
      if (info.offset.x > 50) {
        if (!hasTriggeredHapticRef.current) {
          hasTriggeredHapticRef.current = true;
          if (typeof window !== "undefined" && window.navigator?.vibrate) {
            try {
              window.navigator.vibrate(10);
            } catch (e) {}
          }
        }
      } else {
        if (hasTriggeredHapticRef.current) {
          hasTriggeredHapticRef.current = false;
        }
      }
    }, []);

    const handleDragEnd = useCallback(
      (event: any, info: any) => {
        hasTriggeredHapticRef.current = false;
        if (info.offset.x > 50) {
          onReply?.(message);
        }
      },
      [onReply, message],
    );

    if (isDeleted) {
      return (
        <div ref={ref} className={cn("flex py-1", isSent ? "justify-end" : "justify-start")}>
          <div
            className={cn(
              "max-w-[75%] px-4 py-2.5 rounded-[20px] italic",
              isSent
                ? "bg-primary/20 text-muted-foreground rounded-br-md"
                : "bg-card/40 text-muted-foreground rounded-bl-md",
            )}
          >
            <p className="text-sm">This message was deleted</p>
          </div>
        </div>
      );
    }

    return (
      <>
        <div
          ref={ref}
          className={cn(
            "flex py-0.5 select-none",
            isSent ? "justify-end" : "justify-start",
            isMobile ? "flex-col" : "gap-2",
          )}
          onMouseEnter={() => !isMobile && setIsHovered(true)}
          onMouseLeave={() => !isMobile && setIsHovered(false)}
        >
          <div className={cn("flex items-end gap-2", isSent ? "flex-row-reverse" : "flex-row")}>
            <div
              className={cn(
                "max-w-[75%] flex-shrink-0 relative",
                isSent ? "items-end" : "items-start",
              )}
              {...longPressHandlers}
              onContextMenu={longPressHandlers.onContextMenu}
              style={{
                WebkitTouchCallout: "none",
                WebkitUserSelect: "none",
                touchAction: "manipulation",
              }}
            >
              {/* Swipe to reply icon indicator */}
              <motion.div
                style={{
                  opacity: replyIconOpacity,
                  scale: replyIconScale,
                  x: replyIconX,
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-0 pointer-events-none flex items-center justify-center w-8 h-8 rounded-full bg-muted/80 text-muted-foreground shadow-sm"
              >
                <Reply className="h-4 w-4" />
              </motion.div>

              {/* Draggable Message Bubble */}
              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 80 }}
                dragElastic={{ left: 0, right: 0.2 }}
                dragSnapToOrigin={true}
                style={{ x, touchAction: "pan-y" }}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                className="relative z-10 w-full flex flex-col"
              >
                <BubbleShell isSent={isSent} variant={type === "sticker" ? "sticker" : "default"}>
                  {replyTo && <MessageReply reply={replyTo} isSent={isSent} />}
                  {media && (
                    <MessageMedia
                      media={media}
                      isSent={isSent}
                      chatId={(message as any).chatId}
                      messageId={message.id}
                    />
                  )}
                  {type === "sticker" ? (
                    // Stickers keep the floating time pill overlaid on the image.
                    <div className="absolute bottom-1 right-1 flex items-center gap-1 bg-black/40 backdrop-blur-[2px] rounded-full px-2 py-0.5">
                      <span className="text-[10px] text-white/80 font-medium">{time}</span>
                      {isSent && (
                        <MessageStatusIcon
                          status={status}
                          onRetry={() => onRetry?.(message)}
                          className="[&_svg]:text-white/80"
                        />
                      )}
                    </div>
                  ) : (
                    <BubbleBody
                      content={content}
                      time={time}
                      hasMedia={!!media}
                      align={isSent ? "end" : "start"}
                      timeClassName={isSent ? "text-primary-foreground/65" : "text-muted-foreground"}
                      statusNode={
                        isSent ? (
                          <MessageStatusIcon status={status} onRetry={() => onRetry?.(message)} />
                        ) : undefined
                      }
                    />
                  )}
                </BubbleShell>

                {reactions && reactions.length > 0 && (
                  <MessageReactions
                    reactions={reactions}
                    isSent={isSent}
                    onReactionClick={(emoji) => onReactionClick?.(message.id, emoji)}
                  />
                )}
              </motion.div>
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
    );
  },
);

ChatBubbleImpl.displayName = "ChatBubble";

// Memoized: with the list's stable useCallback handlers, an individual bubble
// only re-renders when its own message/props change — not on every list render.
export const ChatBubble = memo(ChatBubbleImpl);
