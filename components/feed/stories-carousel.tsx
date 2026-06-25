"use client"

import { useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, ChevronLeft, ChevronRight, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn, getAvatarUrl } from "@/lib/utils"
import { StoryViewer } from "./story-viewer"
import type { StoryGroup } from "./types"

interface StoriesCarouselProps {
  storyGroups: StoryGroup[]
  onStoryViewed: (storyId: string) => void
  onAddStory?: () => void
  onDeleteStory?: (storyId: string) => void
  currentUserAvatar?: string
  currentUserName?: string
  /** Current user's id — used to allow deleting one's own stories. */
  currentUserId?: string
}

export function StoriesCarousel({
  storyGroups,
  onStoryViewed,
  onAddStory,
  onDeleteStory,
  currentUserAvatar,
  currentUserName = "Your Story",
  currentUserId,
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

  // The current user's own story shows only as the first "Your story" circle
  // (Instagram-style) — never duplicated among the others.
  const ownGroup = useMemo(
    () => storyGroups.find((g) => g.userId === currentUserId) || null,
    [storyGroups, currentUserId],
  )
  const otherGroups = useMemo(
    () => storyGroups.filter((g) => g.userId !== currentUserId),
    [storyGroups, currentUserId],
  )
  // Playlist the viewer steps through: own first (if any), then everyone else.
  const orderedGroups = useMemo(
    () => (ownGroup ? [ownGroup, ...otherGroups] : otherGroups),
    [ownGroup, otherGroups],
  )

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
          className="flex gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden py-1 px-4 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {/* "Add Story" tile — opens own story if one exists; the + badge
              always adds a new story (Instagram-style). */}
          <motion.div
            onClick={ownGroup ? () => openStory(0) : onAddStory}
            whileTap={{ scale: 0.96 }}
            className="flex w-[88px] shrink-0 flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card/50 p-2.5 cursor-pointer"
          >
            <div className="relative">
              {ownGroup ? (
                <div
                  className={cn(
                    "rounded-full p-[2.5px]",
                    ownGroup.hasUnviewed
                      ? "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"
                      : "bg-muted",
                  )}
                >
                  <div className="bg-card rounded-full p-0.5">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={getAvatarUrl(currentUserAvatar)} />
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {currentUserName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              ) : (
                <div className="h-[60px] w-[60px] rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
                  <User className="h-7 w-7 text-muted-foreground" />
                </div>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddStory?.()
                }}
                aria-label="Add story"
                className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-primary flex items-center justify-center border-2 border-card"
              >
                <Plus className="h-3.5 w-3.5 text-primary-foreground" />
              </button>
            </div>
            <span className="text-xs font-medium text-foreground truncate max-w-full text-center">
              {ownGroup ? "Your Story" : "Add Story"}
            </span>
          </motion.div>

          {/* Everyone else's stories */}
          {otherGroups.map((group, i) => (
            <motion.button
              key={group.userId}
              onClick={() => openStory(ownGroup ? i + 1 : i)}
              whileTap={{ scale: 0.96 }}
              className="flex w-[88px] shrink-0 flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card/50 p-2.5"
            >
              <div className="relative">
                <div
                  className={cn(
                    "rounded-full p-[2.5px]",
                    group.hasUnviewed
                      ? "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"
                      : "bg-muted",
                  )}
                >
                  <div className="bg-card rounded-full p-0.5">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={getAvatarUrl(group.userAvatar)} />
                      <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                        {group.userName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                {/* online dot */}
                <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-primary border-2 border-card" />
              </div>
              <span className="text-xs font-medium text-foreground truncate max-w-full text-center">
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
            storyGroups={orderedGroups}
            initialGroupIndex={selectedGroupIndex}
            onClose={() => setViewerOpen(false)}
            onStoryViewed={onStoryViewed}
            onDeleteStory={onDeleteStory}
            currentUserId={currentUserId}
          />
        )}
      </AnimatePresence>
    </>
  )
}
