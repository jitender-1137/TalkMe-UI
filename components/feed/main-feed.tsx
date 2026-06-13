"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2 } from "lucide-react"
import { FeedPost } from "./feed-post"
import type { Post } from "./types"

interface MainFeedProps {
  initialPosts: Post[]
  onLoadMore: () => Promise<Post[]>
  onLike: (postId: string) => void
  onBookmark: (postId: string) => void
  onShare: (postId: string) => void
  onComment: (postId: string, content: string) => void
}

export function MainFeed({
  initialPosts,
  onLoadMore,
  onLike,
  onBookmark,
  onShare,
  onComment,
}: MainFeedProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    try {
      const newPosts = await onLoadMore()
      if (newPosts.length === 0) {
        setHasMore(false)
      } else {
        setPosts((prev) => [...prev, ...newPosts])
      }
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasMore, onLoadMore])

  // Intersection observer for infinite scroll
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [loadMore])

  // Update posts when initialPosts changes
  useEffect(() => {
    setPosts(initialPosts)
  }, [initialPosts])

  const handleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 }
          : post
      )
    )
    onLike(postId)
  }

  const handleBookmark = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, bookmarked: !post.bookmarked }
          : post
      )
    )
    onBookmark(postId)
  }

  const handleComment = (postId: string, content: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: [
                {
                  id: `comment-${Date.now()}`,
                  author: {
                    id: "current-user",
                    name: "You",
                    username: "you",
                    status: "online" as const,
                  },
                  content,
                  timestamp: new Date(),
                  likes: 0,
                  liked: false,
                },
                ...post.comments,
              ],
            }
          : post
      )
    )
    onComment(postId, content)
  }

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence initial={false}>
        {posts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.05, 0.3) }}
          >
            <FeedPost
              post={post}
              onLike={handleLike}
              onBookmark={handleBookmark}
              onShare={onShare}
              onComment={handleComment}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading more...</span>
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <p className="text-sm text-muted-foreground">You have reached the end</p>
        )}
      </div>
    </div>
  )
}
