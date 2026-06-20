"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAvatarUrl, cn } from "@/lib/utils"
import { Play } from "lucide-react"
import type { SharedPostRef } from "@/lib/shared-post"

/**
 * Instagram-style shared-post card rendered inside a chat bubble. Shows the
 * original author, the post media thumbnail and the caption. Tapping it emits a
 * `post:open` event (with the postId) so the app can route to the post — a
 * no-op if nothing listens yet, so it never appears broken.
 */
export function SharedPostCard({
  post,
  isSent,
}: {
  post: SharedPostRef
  isSent: boolean
}) {
  const open = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("post:open", { detail: { postId: post.postId } }))
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        "tappable block w-60 max-w-full overflow-hidden rounded-xl text-left",
        "bg-background/60 border",
        isSent ? "border-primary-foreground/20" : "border-border",
      )}
    >
      {/* Author row */}
      <div className="flex items-center gap-2 px-2.5 py-2">
        <Avatar className="h-6 w-6 shrink-0">
          <AvatarImage src={getAvatarUrl(post.authorAvatar ?? undefined)} />
          <AvatarFallback className="text-[10px]">
            {(post.authorName || "?").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-tight truncate text-foreground">
            {post.authorName}
          </p>
          {post.authorUsername && (
            <p className="text-[11px] leading-tight truncate text-muted-foreground">
              @{post.authorUsername}
            </p>
          )}
        </div>
      </div>

      {/* Media thumbnail */}
      {post.thumbnail && (
        <div className="relative aspect-square w-full bg-muted">
          {post.mediaType === "video" ? (
            // The "thumbnail" for a video is the video URL — <img> can't show
            // it, so render a muted <video> whose first frame acts as the poster.
            <video
              // #t=0.1 seeks to a real frame so a poster paints (not a black frame).
              src={`${post.thumbnail}#t=0.1`}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={post.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
          )}
          {post.mediaType === "video" && (
            <div className="absolute inset-0 grid place-items-center">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white">
                <Play className="h-4 w-4 fill-current" />
              </span>
            </div>
          )}
        </div>
      )}

      {/* Caption */}
      {post.caption && (
        <p className="px-2.5 py-2 text-[13px] leading-snug text-foreground line-clamp-2">
          {post.caption}
        </p>
      )}
    </button>
  )
}
