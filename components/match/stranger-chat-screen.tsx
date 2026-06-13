"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Image as ImageIcon, Smile } from "lucide-react"
import { useMatchStore } from "./match-store"
import { StrangerChatHeader } from "./stranger-chat-header"
import { StrangerChatBubble } from "./stranger-chat-bubble"
import type { Stranger, StrangerMessage } from "./types"

interface StrangerChatScreenProps {
  stranger: Stranger
  messages: StrangerMessage[]
  onSendMessage: (content: string) => void
  onSkip: () => void
  onReport: () => void
  onBlock: () => void
  onRevealMedia: (messageId: string) => void
}

export function StrangerChatScreen({
  stranger,
  messages,
  onSendMessage,
  onSkip,
  onReport,
  onBlock,
  onRevealMedia,
}: StrangerChatScreenProps) {
  const [inputValue, setInputValue] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Auto-focus input when the chat opens or switching user
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [stranger.id])

  const handleSend = () => {
    if (!inputValue.trim()) return
    onSendMessage(inputValue.trim())
    setInputValue("")
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with action buttons */}
      <StrangerChatHeader
        stranger={stranger}
        onSkip={onSkip}
        onReport={onReport}
        onBlock={onBlock}
      />

      {/* Chat messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-1">
          {/* Connection notice */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-6"
          >
            <div className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              Connected with {stranger.anonymousName}
            </div>
          </motion.div>

          {/* Shared interests */}
          {stranger.interests.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center mb-4"
            >
              <div className="text-xs text-muted-foreground">
                Shared interests: {stranger.interests.join(", ")}
              </div>
            </motion.div>
          )}

          {/* Messages */}
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <StrangerChatBubble
                key={message.id}
                message={message}
                onRevealMedia={() => onRevealMedia(message.id)}
              />
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {stranger.isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 px-4 py-2"
              >
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-muted-foreground"
                      animate={{ y: [0, -4, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {stranger.anonymousName} is typing...
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Message input bar */}
      <div className="sticky bottom-0 border-t border-border bg-card/95 backdrop-blur-md p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <ImageIcon className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <Smile className="h-5 w-5" />
          </Button>
          
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary"
          />
          
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="shrink-0 bg-primary hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
