"use client"

import { useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn, getAvatarUrl } from "@/lib/utils"
import { StoryViewer } from "./story-viewer"
import type { StoryGroup } from "./types"

interface StoriesCarouselProps {
  storyGroups: StoryGroup[]
  onStoryViewed: (storyId: string) => void
  onAddStory?: () => void
  currentUserAvatar?: string
  currentUserName?: string
}

export function StoriesCarousel({
  storyGroups,
  onStoryViewed,
  onAddStory,
  currentUserAvatar,
  currentUserName = "Your Story",
}: StoriesCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0)

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setShowLeftArrow(scrollLeft > 0)
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
  }

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return
    const scrollAmount = 200
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    })
  }

  const openStory = (index: number) => {
    setSelectedGroupIndex(index)
    setViewerOpen(true)
  }

  return (
    <>
      <div className="relative">
        {/* Scroll container */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto scrollbar-hide py-2 px-4 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {/* Add Story button */}
          <motion.button
            onClick={onAddStory}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
          >
            <div className="relative">
              <Avatar className="h-16 w-16 md:h-18 md:w-18 border-2 border-muted">
                <AvatarImage src={getAvatarUrl(currentUserAvatar)} />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {currentUserName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                <Plus className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            </div>
            <span className="text-xs font-medium text-muted-foreground truncate max-w-16 text-center">
              Add Story
            </span>
          </motion.button>

          {/* Story circles */}
          {storyGroups.map((group, index) => (
            <motion.button
              key={group.userId}
              onClick={() => openStory(index)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
              <div
                className={cn(
                  "relative p-0.5 rounded-full",
                  group.hasUnviewed
                    ? "bg-primary"
                    : "bg-muted"
                )}
              >
                {/* Animated gradient ring for unviewed */}
                {group.hasUnviewed && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    style={{ filter: "blur(4px)" }}
                  />
                )}
                <div className="relative bg-background rounded-full p-0.5">
                  <Avatar className="h-14 w-14 md:h-16 md:w-16">
                    <AvatarImage src={getAvatarUrl(group.userAvatar)} />
                    <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                      {group.userName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <span
                className={cn(
                  "text-xs truncate max-w-16 text-center",
                  group.hasUnviewed
                    ? "font-semibold text-foreground"
                    : "font-medium text-muted-foreground"
                )}
              >
                {group.userName.split(" ")[0]}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Navigation arrows - desktop only */}
        <AnimatePresence>
          {showLeftArrow && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute left-0 top-1/2 -translate-y-1/2 hidden md:block"
            >
              <Button
                variant="secondary"
                size="icon"
                onClick={() => scroll("left")}
                className="h-8 w-8 rounded-full shadow-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showRightArrow && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute right-0 top-1/2 -translate-y-1/2 hidden md:block"
            >
              <Button
                variant="secondary"
                size="icon"
                onClick={() => scroll("right")}
                className="h-8 w-8 rounded-full shadow-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Full-screen story viewer */}
      <AnimatePresence>
        {viewerOpen && (
          <StoryViewer
            storyGroups={storyGroups}
            initialGroupIndex={selectedGroupIndex}
            onClose={() => setViewerOpen(false)}
            onStoryViewed={onStoryViewed}
          />
        )}
      </AnimatePresence>
    </>
  )
}
