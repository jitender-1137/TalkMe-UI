"use client";

import { memo, useRef, useEffect, useLayoutEffect, useCallback, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatBubble } from "./chat-bubble";
import { cn } from "@/lib/utils";
import type { Message } from "./types";

interface VirtualizedChatListProps {
  messages: Message[];
  /** Active conversation id — used to reset first-load scroll per chat. */
  chatId?: string | null;
  onReactionClick?: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onOpenMessageMenu?: (e: PointerEvent | MouseEvent, message: Message) => void;
}

function formatDateSeparator(date: Date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/**
 * Chat message list.
 *
 * Renders the (already-windowed) message set in NORMAL document flow — not a
 * virtualizer. The list is capped by `useMessages`' `limit`, so the DOM stays
 * small, and normal flow scrolls natively-smooth with zero measurement reflow.
 * (The previous TanStack-Virtual version used absolute positioning + a fixed
 * `estimateSize` that mismatched real bubble height, so every measurement during
 * scroll shifted offsets and made scrolling jump — especially when older
 * messages loaded in.)
 */
function VirtualizedChatListImpl({
  messages,
  chatId,
  onReactionClick,
  onReply,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  onOpenMessageMenu,
}: VirtualizedChatListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Stable per-message key: clientId survives the optimistic→real swap, so the
  // bubble is reused (not remounted) and its slide-in animation plays once.
  const keyOf = (m: Message) => String(m.clientId ?? m.id).trim();

  // Dedupe by stable key.
  const uniqueMessages = useMemo(() => {
    const seen = new Set<string>();
    return messages.filter((msg) => {
      if (!msg?.id) return false;
      const k = keyOf(msg);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [messages]);

  const isFirstLoad = useRef(true);
  const prevFirstIdRef = useRef<string | null>(null);
  const prevLastIdRef = useRef<string | null>(null);
  const isNearBottomRef = useRef(true);
  // scrollHeight captured right before a load-more, used to restore position
  // after older messages prepend (keep the user anchored on what they were reading).
  const prependHeightRef = useRef<number | null>(null);
  // Track the newest message id so only a freshly-appended message animates in.
  const animatedLastIdRef = useRef<string | null>(null);

  // Reset first-load scroll only when the conversation changes.
  useLayoutEffect(() => {
    isFirstLoad.current = true;
    prevFirstIdRef.current = null;
    prevLastIdRef.current = null;
    prependHeightRef.current = null;
  }, [chatId]);

  // Scroll management (runs synchronously before paint → no flicker).
  useLayoutEffect(() => {
    const el = parentRef.current;
    if (!el || uniqueMessages.length === 0) return;

    const firstId = keyOf(uniqueMessages[0]);
    const lastMsg = uniqueMessages[uniqueMessages.length - 1];
    const lastId = keyOf(lastMsg);

    if (isFirstLoad.current) {
      el.scrollTop = el.scrollHeight; // snap to bottom on first open
      isFirstLoad.current = false;
    } else {
      const lastChanged = lastId !== prevLastIdRef.current;
      const firstChanged = firstId !== prevFirstIdRef.current;

      if (firstChanged && !lastChanged && prependHeightRef.current != null) {
        // Older messages prepended → preserve the viewport by the height delta.
        el.scrollTop = el.scrollTop + (el.scrollHeight - prependHeightRef.current);
        prependHeightRef.current = null;
      } else if (lastChanged) {
        // New message at the bottom: follow for own messages, or if near bottom.
        // Always smooth so existing messages visibly slide up (native-app feel).
        const isOwn = lastMsg?.isSent === true;
        if (isOwn || isNearBottomRef.current) {
          requestAnimationFrame(() => {
            el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
          });
        }
      }
    }

    prevFirstIdRef.current = firstId;
    prevLastIdRef.current = lastId;
  }, [uniqueMessages]);

  // Auto-scroll to bottom on resize (e.g. mobile keyboard open/close)
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    let prevHeight = el.clientHeight;

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        const currentHeight = el.clientHeight;
        const heightDifference = prevHeight - currentHeight;

        // If height decreased significantly (keyboard opened) OR if user was near the bottom
        if (heightDifference > 80 || isNearBottomRef.current) {
          el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
        }
        prevHeight = currentHeight;
      });
    });

    resizeObserver.observe(el);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    setShowScrollButton(distanceFromBottom > 200);
    isNearBottomRef.current = distanceFromBottom < 120;

    if (scrollTop < 120 && hasMore && !isLoadingMore) {
      prependHeightRef.current = scrollHeight; // capture before content grows on top
      onLoadMore?.();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  const scrollToBottom = () => {
    parentRef.current?.scrollTo({ top: parentRef.current.scrollHeight, behavior: "smooth" });
  };

  const lastIndex = uniqueMessages.length - 1;

  return (
    <div className="relative flex-1 overflow-hidden">
      <AnimatePresence>
        {isLoadingMore && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-10"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-xs text-muted-foreground">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full"
              />
              Loading messages...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Native-flow scroll container (smooth, no virtualization reflow) */}
      <div
        ref={parentRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto overflow-x-hidden px-4 scrollbar-thin [overflow-anchor:none]"
      >
        <div className="max-w-3xl mx-auto py-2 flex flex-col">
          {uniqueMessages.map((message, index) => {
            const prev = index > 0 ? uniqueMessages[index - 1] : null;
            const currentDate = new Date(message.timestamp);
            const prevDate = prev ? new Date(prev.timestamp) : null;
            const showDateSeparator =
              !prevDate ||
              currentDate.getFullYear() !== prevDate.getFullYear() ||
              currentDate.getMonth() !== prevDate.getMonth() ||
              currentDate.getDate() !== prevDate.getDate();

            // Slide the newest message in (own AND incoming) so the list feels
            // like it scrolls up to it. The stable key (clientId) means the
            // optimistic→real swap reuses the same node, so this plays exactly
            // once per message — no replay/flicker.
            const k = keyOf(message);
            const isNewest = index === lastIndex;
            const justAppended = isNewest && k !== animatedLastIdRef.current;
            if (isNewest) animatedLastIdRef.current = k;

            return (
              <div key={k}>
                {showDateSeparator && (
                  <div className="flex items-center justify-center py-3 my-2">
                    <div className="px-3 py-1 bg-muted/60 rounded-full text-xs text-muted-foreground font-medium">
                      {formatDateSeparator(currentDate)}
                    </div>
                  </div>
                )}
                <motion.div
                  layout="position"
                  initial={justAppended ? { opacity: 0, y: 20, scale: 0.92 } : false}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    opacity: { duration: 0.5 },
                    y: { type: "spring", stiffness: 260, damping: 26, mass: 0.7 },
                    scale: { type: "spring", stiffness: 260, damping: 26, mass: 0.7 },
                    layout: { type: "spring", stiffness: 260, damping: 26, mass: 0.7 },
                  }}
                >
                  <ChatBubble
                    message={message}
                    onReactionClick={onReactionClick}
                    onReply={onReply}
                    onOpenMessageMenu={onOpenMessageMenu}
                  />
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {showScrollButton && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-4 right-4"
          >
            <Button
              size="icon"
              variant="secondary"
              onClick={scrollToBottom}
              className={cn(
                "h-10 w-10 rounded-full shadow-lg",
                "bg-card border border-border hover:bg-muted",
              )}
            >
              <ArrowDown className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Memoized: re-renders only when its own props change (messages, chatId, the
// memoized callbacks), so typing in the input or other ChatArea state updates
// no longer re-render the whole message list.
export const VirtualizedChatList = memo(VirtualizedChatListImpl);
