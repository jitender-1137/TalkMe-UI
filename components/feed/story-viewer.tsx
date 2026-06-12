"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX, Pause, Play } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn, getAvatarUrl } from "@/lib/utils"
import type { StoryGroup, Story } from "./types"

interface StoryViewerProps {
  storyGroups: StoryGroup[]
  initialGroupIndex: number
  onClose: () => void
  onStoryViewed: (storyId: string) => void
}

export function StoryViewer({
  storyGroups,
  initialGroupIndex,
  onClose,
  onStoryViewed,
}: StoryViewerProps) {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const pausedProgressRef = useRef<number>(0)

  const currentGroup = storyGroups[currentGroupIndex]
  const currentStory = currentGroup?.stories[currentStoryIndex]
  const storyDuration = (currentStory?.duration || 5) * 1000

  const goToNextStory = useCallback(() => {
    if (currentStoryIndex < currentGroup.stories.length - 1) {
      setCurrentStoryIndex((prev) => prev + 1)
      setProgress(0)
    } else if (currentGroupIndex < storyGroups.length - 1) {
      setCurrentGroupIndex((prev) => prev + 1)
      setCurrentStoryIndex(0)
      setProgress(0)
    } else {
      onClose()
    }
  }, [currentStoryIndex, currentGroup?.stories.length, currentGroupIndex, storyGroups.length, onClose])

  const goToPrevStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((prev) => prev - 1)
      setProgress(0)
    } else if (currentGroupIndex > 0) {
      setCurrentGroupIndex((prev) => prev - 1)
      const prevGroup = storyGroups[currentGroupIndex - 1]
      setCurrentStoryIndex(prevGroup.stories.length - 1)
      setProgress(0)
    }
  }, [currentStoryIndex, currentGroupIndex, storyGroups])

  // Mark story as viewed
  useEffect(() => {
    if (currentStory && !currentStory.viewed) {
      onStoryViewed(currentStory.id)
    }
  }, [currentStory, onStoryViewed])

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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted((m) => !m)}
              className="text-white hover:bg-white/20 h-8 w-8"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
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
                src={currentStory.mediaUrl}
                className="w-full h-full object-cover"
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
                src={currentStory.mediaUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50 pointer-events-none" />
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
