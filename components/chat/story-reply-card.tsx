"use client"

import { cn } from "@/lib/utils"
import { Play } from "lucide-react"
import type { StoryReplyRef } from "@/lib/story-reply"

/**
 * WhatsApp/Instagram-style story-reply preview shown above the reply text inside
 * a chat bubble: a quoted block with the story thumbnail and an "…'s story"
 * label. Tapping emits a `story:open` event (no-op until a listener exists).
 */
export function StoryReplyCard({
  story,
  isSent,
}: {
  story: StoryReplyRef
  isSent: boolean
}) {
  const open = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("story:open", { detail: { storyId: story.storyId } }))
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        "tappable mb-1.5 flex items-stretch gap-2 overflow-hidden rounded-lg border-l-4 pr-2 text-left",
        isSent
          ? "bg-primary-foreground/15 border-primary-foreground/50"
          : "bg-card/60 border-primary/50",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-center py-1.5 pl-2">
        <p
          className={cn(
            "text-[11px] font-semibold leading-tight",
            isSent ? "text-primary-foreground/90" : "text-primary",
          )}
        >
          {isSent ? `${story.ownerName}'s story` : "Replied to your story"}
        </p>
        <p
          className={cn(
            "text-[11px] leading-tight",
            isSent ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {story.mediaType === "video" ? "Video" : "Photo"}
        </p>
      </div>

      {story.thumbnail && (
        <div className="relative my-1 aspect-[9/16] w-9 shrink-0 overflow-hidden rounded bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {story.mediaType === "video" ? (
            // Video "thumbnail" is the video URL; render its first frame.
            <video
              // #t=0.1 seeks to a real frame so a poster paints (not a black frame).
              src={`${story.thumbnail}#t=0.1`}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img src={story.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
          )}
          {story.mediaType === "video" && (
            <div className="absolute inset-0 grid place-items-center">
              <Play className="h-3.5 w-3.5 fill-white text-white drop-shadow" />
            </div>
          )}
        </div>
      )}
    </button>
  )
}
