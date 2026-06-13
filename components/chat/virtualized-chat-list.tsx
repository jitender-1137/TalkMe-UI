"use client"

import { useRef, useEffect, useCallback, useState, useMemo } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChatBubble } from "./chat-bubble"
import { cn } from "@/lib/utils"
import type { Message } from "./types"

interface VirtualizedChatListProps {
  messages: Message[]
  onReactionClick?: (messageId: string, emoji: string) => void
  onReply?: (message: Message) => void
  onLoadMore?: () => void
  hasMore?: boolean
  isLoadingMore?: boolean
  onOpenMessageMenu?: (e: PointerEvent | MouseEvent, message: Message) => void
}

export function VirtualizedChatList({
  messages,
  onReactionClick,
  onReply,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  onOpenMessageMenu,
}: VirtualizedChatListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const isFirstLoad = useRef(true)

  // Deduplicate messages by ID to avoid duplicate keys in the virtualizer
  const uniqueMessages = useMemo(() => {
    const seen = new Set<string>()
    return messages.filter((msg) => {
      if (!msg || !msg.id) {
        console.warn("[VirtualizedChatList] Message with missing ID found", msg)
        return false
      }
      const stringId = String(msg.id).trim()
      if (seen.has(stringId)) {
        console.warn(`[VirtualizedChatList] Duplicate message ID found: ${stringId}`)
        return false
      }
      seen.add(stringId)
      return true
    })
  }, [messages])

  const lastMessageCount = useRef(uniqueMessages.length)

  const getItemKey = useCallback((index: number) => {
    const msg = uniqueMessages[index]
    return msg?.id ? String(msg.id).trim() : `fallback-key-${index}`
  }, [uniqueMessages])

  const virtualizer = useVirtualizer({
    count: uniqueMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => 100, []),
    overscan: 5,
    getItemKey,
  })

  const items = virtualizer.getVirtualItems()

  // Reset first load when the chat or first message ID changes
  const firstMessageId = uniqueMessages[0]?.id
  useEffect(() => {
    isFirstLoad.current = true
  }, [firstMessageId])

  // Scroll management
  useEffect(() => {
    if (uniqueMessages.length > 0) {
      if (isFirstLoad.current) {
        // Snap instantly on first load
        virtualizer.scrollToIndex(uniqueMessages.length - 1, { align: "end" })
        
        // Schedule secondary scroll snaps to handle items still rendering/measuring
        const timer1 = setTimeout(() => {
          virtualizer.scrollToIndex(uniqueMessages.length - 1, { align: "end" })
        }, 50)
        const timer2 = setTimeout(() => {
          virtualizer.scrollToIndex(uniqueMessages.length - 1, { align: "end" })
        }, 150)
        
        isFirstLoad.current = false
        return () => {
          clearTimeout(timer1)
          clearTimeout(timer2)
        }
      } else if (uniqueMessages.length > lastMessageCount.current && isNearBottom) {
        // Smooth scroll for subsequent new messages if user is near bottom
        virtualizer.scrollToIndex(uniqueMessages.length - 1, { align: "end", behavior: "smooth" })
      }
    }
    lastMessageCount.current = uniqueMessages.length
  }, [uniqueMessages.length, isNearBottom, virtualizer])

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const element = parentRef.current
    if (!element) return

    const { scrollTop, scrollHeight, clientHeight } = element
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    setShowScrollButton(distanceFromBottom > 200)
    setIsNearBottom(distanceFromBottom < 100)

    // Load more when scrolling to top
    if (scrollTop < 100 && hasMore && !isLoadingMore) {
      onLoadMore?.()
    }
  }, [hasMore, isLoadingMore, onLoadMore])

  const scrollToBottom = () => {
    virtualizer.scrollToIndex(uniqueMessages.length - 1, { align: "end", behavior: "smooth" })
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Loading indicator for infinite scroll */}
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

      {/* Chat messages */}
      <div
        ref={parentRef}
        onScroll={handleScroll}
        className="h-full overflow-auto px-4 scrollbar-thin"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          <div className="max-w-3xl mx-auto">
            {items.map((virtualItem) => {
              const message = uniqueMessages[virtualItem.index]
              const prevMessage = virtualItem.index > 0 ? uniqueMessages[virtualItem.index - 1] : null
              
              // Check if we need to show date separator
              const currentDate = new Date(message.timestamp)
              const prevDate = prevMessage ? new Date(prevMessage.timestamp) : null
              const showDateSeparator = !prevDate || 
                (currentDate.getFullYear() !== prevDate.getFullYear() ||
                currentDate.getMonth() !== prevDate.getMonth() ||
                currentDate.getDate() !== prevDate.getDate())
              
              const formatDateSeparator = (date: Date) => {
                const today = new Date()
                const yesterday = new Date(today)
                yesterday.setDate(yesterday.getDate() - 1)
                
                if (date.toDateString() === today.toDateString()) {
                  return "Today"
                } else if (date.toDateString() === yesterday.toDateString()) {
                  return "Yesterday"
                } else {
                  return date.toLocaleDateString("en-US", { 
                    weekday: "short", 
                    month: "short", 
                    day: "numeric" 
                  })
                }
              }

              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  {showDateSeparator && (
                    <div className="flex items-center justify-center py-3 my-2">
                      <div className="px-3 py-1 bg-muted/60 rounded-full text-xs text-muted-foreground font-medium">
                        {formatDateSeparator(currentDate)}
                      </div>
                    </div>
                  )}
                  <ChatBubble
                    message={message}
                    onReactionClick={onReactionClick}
                    onReply={onReply}
                    onOpenMessageMenu={onOpenMessageMenu}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Scroll to bottom button */}
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
                "bg-card border border-border hover:bg-muted"
              )}
            >
              <ArrowDown className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
