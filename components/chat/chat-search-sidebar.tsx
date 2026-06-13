"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSearchChatMessages } from "@/src/api/hooks/useMessages"
import { useDebounce } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils"

interface ChatSearchSidebarProps {
  chatId: string
  isOpen: boolean
  onClose: () => void
  onMessageClick: (messageId: string) => void
}

export function ChatSearchSidebar({ chatId, isOpen, onClose, onMessageClick }: ChatSearchSidebarProps) {
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 500)

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useSearchChatMessages(chatId, debouncedQuery)

  const messages = useMemo(() => {
    if (!data?.pages) return []
    return data.pages.flatMap((page) => page.items)
  }, [data])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ""
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (mobile only, optional if we want it to close on outside click) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[250] bg-black/40 backdrop-blur-xs md:hidden"
          />

          {/* Sliding Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 240 }}
            className="fixed top-0 right-0 z-[260] h-full w-full sm:w-[400px] bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="h-16 flex items-center gap-3 px-4 border-b border-border bg-card shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 hover:bg-muted rounded-full shrink-0"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </Button>
              <h2 className="text-md font-semibold text-foreground">Search messages</h2>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-border bg-card">
              <div className="relative flex items-center bg-muted/50 rounded-lg overflow-hidden border border-border focus-within:border-primary/50 transition-colors">
                <Search className="h-4 w-4 text-muted-foreground ml-3 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search in chat..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-transparent border-none h-10 pl-3 pr-4 text-sm focus:outline-none"
                />
                {query && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-white/10 mr-1"
                    onClick={() => setQuery("")}
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                )}
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto bg-muted/10 scrollbar-thin" onScroll={handleScroll}>
              {!debouncedQuery ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center opacity-50">
                  <Search className="h-12 w-12 mb-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Search for messages</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Find links, text, and more in this chat
                  </p>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  No messages found for "{debouncedQuery}"
                </div>
              ) : (
                <div className="flex flex-col">
                  {messages.map((msg) => (
                    <button
                      key={msg.id}
                      onClick={() => onMessageClick(msg.id)}
                      className={cn(
                        "flex flex-col gap-1 p-4 border-b border-border text-left hover:bg-muted/50 transition-colors cursor-pointer",
                      )}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {msg.senderName || "User"}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDate(msg.timestamp || (msg as any).createdAt || "")}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90 line-clamp-2 leading-relaxed break-words">
                        {/* Basic highlighting */}
                        {msg.content?.split(new RegExp(`(${debouncedQuery})`, "gi")).map((part, i) =>
                          part.toLowerCase() === debouncedQuery.toLowerCase() ? (
                            <mark key={i} className="bg-primary/20 text-primary rounded-xs px-0.5 font-medium">
                              {part}
                            </mark>
                          ) : (
                            <span key={i}>{part}</span>
                          ),
                        )}
                      </p>
                    </button>
                  ))}
                  {isFetchingNextPage && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
