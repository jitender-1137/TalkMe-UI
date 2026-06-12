"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, ArrowLeft } from "lucide-react"
import { AvatarStatusBadge } from "@/components/presence"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { User } from "@/src/api/types"

interface LobbyMessage {
  id: string
  sender: string
  recipient: string
  content: string
  timestamp: number
  read?: boolean
}

interface LobbyChatAreaProps {
  targetUser: User | any
  ownProfile: User
  messages: LobbyMessage[]
  onSendMessage: (text: string) => void
  onBack: () => void
  isTyping?: boolean
  onTyping?: (isTyping: boolean) => void
}

const COMMON_EMOJIS = ["😊", "😂", "🤣", "❤️", "👍", "🔥", "😍", "😘", "🥺", "😭", "😮", "🙏", "😎", "✨", "🎉", "💯"]

export function LobbyChatArea({
  targetUser,
  ownProfile,
  messages,
  onSendMessage,
  onBack,
  isTyping = false,
  onTyping
}: LobbyChatAreaProps) {
  const [inputText, setInputText] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input when the chat opens or switching user
  useEffect(() => {
    inputRef.current?.focus()
  }, [targetUser?.id])

  // Handle typing status
  useEffect(() => {
    if (!onTyping) return
    if (inputText.trim()) {
      onTyping(true)
      const timeout = setTimeout(() => {
        onTyping(false)
      }, 1500)
      return () => clearTimeout(timeout)
    } else {
      onTyping(false)
    }
  }, [inputText, onTyping])

  const lastTargetUserRef = useRef(targetUser?.id)

  // Scroll to bottom on new messages or when typing state changes
  useEffect(() => {
    const isNewUser = lastTargetUserRef.current !== targetUser?.id
    lastTargetUserRef.current = targetUser?.id

    if (isNewUser) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
      }, 50)
      return () => clearTimeout(timer)
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isTyping, targetUser?.id])

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputText.trim()) return
    onSendMessage(inputText)
    setInputText("")
    setShowEmojiPicker(false)
  }

  const handleEmojiClick = (emoji: string) => {
    setInputText((prev) => prev + emoji)
  }

  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground relative border-l border-border">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-10 w-10 rounded-full hover:bg-muted active:scale-95 transition-all text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <AvatarStatusBadge
            src={targetUser.avatar || undefined}
            fallback={targetUser.name?.charAt(0) || "U"}
            status="online"
            size="md"
            gender={targetUser.gender || undefined}
          />
          
          <div>
            <h2 className="font-semibold text-sm text-foreground leading-tight flex items-center gap-1.5">
              {targetUser.name || targetUser.username}
              {targetUser.age && <span className="text-xs text-muted-foreground">({targetUser.age})</span>}
            </h2>
            <p className="text-[10px] text-emerald-500 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Lobby Chat (Local Only)
            </p>
          </div>
        </div>
      </header>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-background">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-xs mx-auto space-y-3 select-none">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <span className="text-2xl animate-pulse">😊</span>
            </div>
            <h4 className="text-sm font-bold text-foreground">Start a transient conversation</h4>
            <p className="text-xs text-muted-foreground leading-normal">
              Lobby chats are completely private, saved only in your browser storage, and will never reach the server database.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isOwn = msg.sender === ownProfile.username
              
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm transition-all duration-300 ${
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted border border-border text-foreground rounded-bl-none"
                    }`}
                  >
                    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap select-text">
                      {msg.content}
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-1.5 select-none">
                      <span className={cn("text-[9px]", isOwn ? "text-primary-foreground/75" : "text-muted-foreground")}>
                        {formatMessageTime(msg.timestamp)}
                      </span>
                      {isOwn && (
                        <span className="text-[10px] leading-none text-primary-foreground/90">
                          {msg.read ? (
                            <span className="font-bold">✓✓</span>
                          ) : (
                            <span className="opacity-60">✓✓</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* Animated Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted border border-border rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Form / Bottom Composer */}
      <div className="relative shrink-0 border-t border-border bg-card p-4">
        {/* Emoji Selector Popover */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              ref={emojiRef}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="absolute bottom-20 left-4 bg-card border border-border rounded-xl p-3 grid grid-cols-8 gap-2 shadow-2xl z-50 w-64"
            >
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  className="w-7 h-7 flex items-center justify-center text-lg hover:bg-muted rounded-md transition-all active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSend} className="flex items-center gap-3">
          {/* Emoji button */}
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="h-11 w-11 rounded-full bg-muted border border-border/80 hover:bg-muted/70 text-muted-foreground flex items-center justify-center transition-all duration-200"
          >
            <span className="text-lg">😊</span>
          </Button>

          <Input
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type Here..."
            className="flex-1 h-11 bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary text-foreground rounded-full px-5 placeholder:text-muted-foreground/60 transition-all duration-200"
          />

          <Button
            type="submit"
            disabled={!inputText.trim()}
            className="h-11 w-11 sm:w-auto px-0 sm:px-5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold rounded-full flex items-center justify-center transition-all active:scale-95 duration-200 shadow-sm shrink-0"
          >
            <Send className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline">SEND</span>
          </Button>
        </form>
      </div>
    </div>
  )
}
