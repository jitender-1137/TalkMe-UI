"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX, Pause, Play, Trash2, Send, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn, getAvatarUrl } from "@/lib/utils"
import { getMediaUrl } from "@/src/api/client"
import { useOpenOrCreateChat } from "@/src/api/hooks/useChats"
import { MessageService } from "@/src/api/services/message.service"
import { showSuccessToast, showErrorToast } from "@/src/api/error-handler"
import type { StoryGroup, Story } from "./types"

const STORY_REACTIONS = ["❤️", "🔥", "😂", "😮", "😢", "👏", "🙌"]

interface StoryViewerProps {
  storyGroups: StoryGroup[]
  initialGroupIndex: number
  onClose: () => void
  onStoryViewed: (storyId: string) => void
  onDeleteStory?: (storyId: string) => void
  /** Current user's id — a delete button is shown on their own stories. */
  currentUserId?: string
}

export function StoryViewer({
  storyGroups,
  initialGroupIndex,
  onClose,
  onStoryViewed,
  onDeleteStory,
  currentUserId,
}: StoryViewerProps) {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [replyText, setReplyText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const openOrCreateChat = useOpenOrCreateChat()

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const pausedProgressRef = useRef<number>(0)

  // Snapshot the groups for this viewing session. Marking a story viewed
  // invalidates the stories query, which refetches AND re-sorts the groups
  // (unseen-first). If we read the live prop, the list would reorder mid-view
  // and `currentStory` identity would change on every render — re-triggering the
  // "mark viewed" effect in a loop (React error #185). The snapshot keeps the
  // playlist stable while the viewer is open.
  const [groups] = useState(() => storyGroups)

  const currentGroup = groups[currentGroupIndex]
  const currentStory = currentGroup?.stories[currentStoryIndex]
  // Each story is shown for 10s (Instagram-style) unless a specific duration is set.
  const storyDuration = (currentStory?.duration || 10) * 1000
  const isOwnStory = !!currentUserId && currentGroup?.userId === currentUserId

  const goToNextStory = useCallback(() => {
    if (currentStoryIndex < currentGroup.stories.length - 1) {
      setCurrentStoryIndex((prev) => prev + 1)
      setProgress(0)
    } else if (currentGroupIndex < groups.length - 1) {
      setCurrentGroupIndex((prev) => prev + 1)
      setCurrentStoryIndex(0)
      setProgress(0)
    } else {
      onClose()
    }
  }, [currentStoryIndex, currentGroup?.stories.length, currentGroupIndex, groups.length, onClose])

  const goToPrevStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((prev) => prev - 1)
      setProgress(0)
    } else if (currentGroupIndex > 0) {
      setCurrentGroupIndex((prev) => prev - 1)
      const prevGroup = groups[currentGroupIndex - 1]
      setCurrentStoryIndex(prevGroup.stories.length - 1)
      setProgress(0)
    }
  }, [currentStoryIndex, currentGroupIndex, groups])

  // Mark story as viewed — once per story id. Dedupe with a ref so we never
  // re-fire for the same story (which would loop via query invalidation).
  const viewedIdsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    const id = currentStory?.id
    if (!id || viewedIdsRef.current.has(id)) return
    viewedIdsRef.current.add(id)
    if (!currentStory?.viewed) onStoryViewed(id)
  }, [currentStory?.id, currentStory?.viewed, onStoryViewed])

  const handleDelete = useCallback(() => {
    if (!currentStory || !onDeleteStory) return
    setIsPaused(true)
    if (typeof window !== "undefined" && !window.confirm("Delete this story?")) {
      setIsPaused(false)
      return
    }
    onDeleteStory(currentStory.id)
    // Advance past the deleted story (or close if it was the last one).
    goToNextStory()
  }, [currentStory, onDeleteStory, goToNextStory])

  // Reply / react to a story → sent to the owner as a normal chat message.
  const sendToOwner = useCallback(
    async (content: string) => {
      const ownerId = currentGroup?.userId
      const text = content.trim()
      if (!ownerId || !text || isSending) return
      setIsSending(true)
      setIsPaused(true) // hold the story while we send
      try {
        const chat = await openOrCreateChat(ownerId)
        await MessageService.sendMessage(chat.id, { content: text })
        showSuccessToast(`Sent to ${currentGroup?.userName ?? "user"}`)
        setReplyText("")
      } catch (e) {
        showErrorToast(e)
      } finally {
        setIsSending(false)
        setIsPaused(false)
      }
    },
    [currentGroup?.userId, currentGroup?.userName, isSending, openOrCreateChat],
  )

  // Progress timer
  useEffect(() => {
    if (isPaused) return

    startTimeRef.current = Date.now() - (pausedProgressRef.current * storyDuration)
    
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current
      const newProgress = Math.min(elapsed / storyDuration, 1)
      setProgress(newProgress)

      if (newProgress >= 1) {
        goToNextStory()
      } else {
        timerRef.current = setTimeout(animate, 16)
      }
    }

    timerRef.current = setTimeout(animate, 16)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [currentStory?.id, isPaused, storyDuration, goToNextStory])

  // Store progress when pausing
  useEffect(() => {
    if (isPaused) {
      pausedProgressRef.current = progress
    }
  }, [isPaused, progress])

  // Reset paused progress on story change
  useEffect(() => {
    pausedProgressRef.current = 0
  }, [currentStory?.id])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goToNextStory()
      else if (e.key === "ArrowLeft") goToPrevStory()
      else if (e.key === "Escape") onClose()
      else if (e.key === " ") {
        e.preventDefault()
        setIsPaused((p) => !p)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [goToNextStory, goToPrevStory, onClose])

  if (!currentGroup || !currentStory) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 right-4 z-20 text-white hover:bg-white/20"
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Navigation arrows - desktop only */}
      <Button
        variant="ghost"
        size="icon"
        onClick={goToPrevStory}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/20 hidden md:flex"
        disabled={currentGroupIndex === 0 && currentStoryIndex === 0}
      >
        <ChevronLeft className="h-8 w-8" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={goToNextStory}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/20 hidden md:flex"
      >
        <ChevronRight className="h-8 w-8" />
      </Button>

      {/* Story content container */}
      <div className="relative w-full max-w-md h-full max-h-[85vh] md:rounded-2xl overflow-hidden">
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
          {currentGroup.stories.map((story, index) => (
            <div
              key={story.id}
              className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden"
            >
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width:
                    index < currentStoryIndex
                      ? "100%"
                      : index === currentStoryIndex
                      ? `${progress * 100}%`
                      : "0%",
                }}
                transition={{ duration: 0.1 }}
              />
            </div>
          ))}
        </div>

        {/* User header */}
        <div className="absolute top-6 left-0 right-0 z-10 flex items-center gap-3 px-4">
          <Avatar className="h-10 w-10 border-2 border-white">
            <AvatarImage src={getAvatarUrl(currentGroup.userAvatar)} />
            <AvatarFallback>{currentGroup.userName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">
              {currentGroup.userName}
            </p>
            <p className="text-white/70 text-xs">
              {formatTimeAgo(currentStory.timestamp ?? (currentStory as any).createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPaused((p) => !p)}
              className="text-white hover:bg-white/20 h-8 w-8"
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
            {currentStory.mediaType === "video" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMuted((m) => !m)}
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            )}
            {isOwnStory && onDeleteStory && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="text-white hover:bg-white/20 h-8 w-8"
                aria-label="Delete story"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Touch areas for mobile navigation */}
        <div className="absolute inset-0 z-[5] flex">
          <button
            className="w-1/3 h-full"
            onClick={goToPrevStory}
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          />
          <button
            className="w-1/3 h-full"
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          />
          <button
            className="w-1/3 h-full"
            onClick={goToNextStory}
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          />
        </div>

        {/* Story media */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStory.id}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full"
          >
            {currentStory.mediaType === "video" ? (
              <video
                src={getMediaUrl(currentStory.mediaUrl)}
                className="w-full h-full object-contain bg-black"
                autoPlay
                muted={isMuted}
                playsInline
                loop
                onError={(e) => {
                  // Hide video on error, fallback handled by parent
                  (e.target as HTMLVideoElement).style.display = 'none'
                }}
              />
            ) : (
              <img
                src={getMediaUrl(currentStory.mediaUrl)}
                alt=""
                className="w-full h-full object-contain bg-black"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Subtle top gradient so the progress bars + header stay legible
            (no full-screen dim — the story itself should be clearly visible). */}
        <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />

        {/* Reply + quick reactions — only on other people's stories. Both are
            delivered to the story owner as a normal chat message. */}
        {!isOwnStory && (
          <div className="absolute bottom-0 left-0 right-0 z-20 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black/60 to-transparent">
            {/* Emoji reactions */}
            <div className="flex items-center justify-center gap-3 mb-3">
              {STORY_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => sendToOwner(emoji)}
                  disabled={isSending}
                  className="text-2xl leading-none transition-transform hover:scale-125 disabled:opacity-50"
                  aria-label={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Reply input */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                sendToOwner(replyText)
              }}
              className="flex items-center gap-2"
            >
              <Input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
                placeholder={`Reply to ${currentGroup.userName}…`}
                className="flex-1 h-11 rounded-full bg-white/10 border-white/30 text-white placeholder:text-white/60 focus-visible:ring-white/40"
              />
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                disabled={!replyText.trim() || isSending}
                className="h-10 w-10 shrink-0 text-white hover:bg-white/20 disabled:opacity-50"
              >
                {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </form>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function formatTimeAgo(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}
