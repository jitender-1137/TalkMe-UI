"use client"

import { useEffect, useState } from "react"
import { AnimatePresence } from "framer-motion"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { usePost } from "@/src/api/hooks/useFeed"
import { useProfile } from "@/src/api/hooks/useProfile"
import { PostDetailModal, type PostDetailModalPost } from "./post-detail-modal"

/**
 * Global listener that opens the original post in the post-detail modal when a
 * shared-post card in chat is tapped (SharedPostCard dispatches `post:open`).
 * Fetches the post by id; if it was deleted (404) it toasts instead of opening.
 * Mounted once near the app root.
 */
export function SharedPostOpener() {
  const [postId, setPostId] = useState<string | null>(null)
  const { data: ownProfile } = useProfile()
  const { data: post, isLoading, isError } = usePost(postId)

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail?.postId
      if (typeof id === "string" && id) setPostId(id)
    }
    window.addEventListener("post:open", handler)
    return () => window.removeEventListener("post:open", handler)
  }, [])

  // Deleted / unavailable post → tell the user and reset instead of hanging.
  useEffect(() => {
    if (postId && isError) {
      toast("This post is no longer available")
      setPostId(null)
    }
  }, [postId, isError])

  const close = () => setPostId(null)

  const mapped: PostDetailModalPost | null = post
    ? {
        id: post.id,
        content: post.content,
        mediaUrls: (post.media || []).map((m: any) => ({
          url: m?.mediaUrl ?? m?.url ?? (typeof m === "string" ? m : ""),
          type: String(m?.mediaType ?? m?.type ?? "image").toLowerCase() === "video" ? "video" : "image",
        })),
        author: {
          id: post.user?.id ?? post.userId,
          name: post.user?.name ?? post.userName ?? "Unknown",
          avatar: post.user?.avatar ?? post.userAvatar,
        },
        createdAt: post.createdAt,
        likesCount: post.likesCount ?? 0,
        commentsCount: post.commentsCount ?? 0,
        isLiked: post.isLiked ?? post.likedByMe ?? false,
        isBookmarked: post.isBookmarked ?? post.bookmarkedByMe ?? false,
      }
    : null

  return (
    <>
      {/* Brief loading veil between the tap and the post arriving. */}
      {postId && isLoading && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60">
          <Loader2 className="h-7 w-7 animate-spin text-white" />
        </div>
      )}
      <AnimatePresence>
        {postId && mapped && (
          <PostDetailModal
            post={mapped}
            isOwner={!!ownProfile?.id && mapped.author.id === ownProfile.id}
            onClose={close}
          />
        )}
      </AnimatePresence>
    </>
  )
}
