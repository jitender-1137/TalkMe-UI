"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import {
  Heart,
  MessageCircle,
  Bookmark,
  MoreHorizontal,
  BadgeCheck,
  Send,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn, getAvatarUrl } from "@/lib/utils"
import { useProfileViewer } from "@/components/profile/use-profile-viewer"
import { toast } from "sonner"
import { copyPostLink } from "@/lib/post-link"
import { useUrlModal } from "@/lib/navigation/use-url-modal"
import type { Post } from "./types"
import { useProfile } from "@/src/api/hooks/useProfile"
import { SharePostSheet } from "./share-post-sheet"
import { InstagramVideo } from "./instagram-video"
import { ProfileModal } from "./profile-modal"
import { CommentsSheet } from "./comments-sheet"
import { LikedBySheet } from "./liked-by-sheet"
import { useOpenOrCreateChat } from "@/src/api/hooks/useChats"
import { useNavigation } from "@/components/app-shell/navigation-context"
import { useChatContext } from "@/components/chat/chat-context"
import { PostDetailModal } from "./post-detail-modal"

interface FeedPostProps {
  post: Post
  onLike: (postId: string) => void
  onBookmark: (postId: string) => void
  onShare: (postId: string) => void
  onComment: (postId: string, content: string) => void
  onAuthorClick?: (authorId: string) => void
}

export function FeedPost({ post, onLike, onBookmark, onShare, onComment, onAuthorClick }: FeedPostProps) {
  const [commentsOpen, setCommentsOpen] = useState(false) // comments sheet
  const [likesOpen, setLikesOpen] = useState(false) // "liked by" sheet
  const [imageIndex, setImageIndex] = useState(0)
  const [shareOpen, setShareOpen] = useState(false)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false) // view-post modal
  const [commentText, setCommentText] = useState("")
  const carouselRef = useRef<HTMLDivElement>(null)

  // Each overlay gets its own URL segment and is closed by the Back button.
  // (ProfileModal self-registers its own `user/<id>` overlay.)
  useUrlModal(detailOpen, () => setDetailOpen(false), `post/${post.id}`)
  // Capture the stack z-index so the sheet renders at its proper depth — and a
  // profile opened FROM the sheet (next stack level) layers ABOVE it, not below.
  const commentsZ = useUrlModal(commentsOpen, () => setCommentsOpen(false), "comments")
  const likesZ = useUrlModal(likesOpen, () => setLikesOpen(false), "likes")
  useUrlModal(shareOpen, () => setShareOpen(false), "share")

  const { data: ownProfile } = useProfile()

  const openOrCreateChat = useOpenOrCreateChat()
  const { activeTab } = useNavigation()
  const { setSelectedConversationId, setShowMobileSecondaryPanel, setChatReturnTab } = useChatContext()

  // Convention: photo → image modal; name → profile modal.
  const { openPhoto } = useProfileViewer()

  // Open a user's profile card (from post author or a commenter).
  const openProfile = (userId?: string | null) => {
    if (userId) setProfileUserId(userId)
  }

  // "Message" from the profile card: create/open the chat and jump to Chats.
  const handleMessageFromProfile = async (targetId: string) => {
    if (!targetId) return
    try {
      // Reuse an existing 1:1 chat if these two users already have one.
      const chat = await openOrCreateChat(targetId)
      // Keep the profile modal OPEN and open the conversation nested under it
      // (#news/feed/user/<id>/messages) so Back returns to the profile, then the feed.
      // chatReturnTab records the origin root for the close handler.
      setChatReturnTab(activeTab)
      setSelectedConversationId(chat.id)
      setShowMobileSecondaryPanel(false)
    } catch {
      /* createChat surfaces its own error toast */
    }
  }

  const commentCount = post.commentsCount ?? post.comments?.length ?? 0

  // Open the comments bottom sheet on every device (no more desktop inline append).
  const handleToggleComments = () => setCommentsOpen(true)

  const handleLike = () => {
    onLike(post.id)
  }

  // Track the active slide of the media carousel for the "n/total" counter.
  const handleCarouselScroll = () => {
    const el = carouselRef.current
    if (!el || post.media.length < 2) return
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    if (idx !== imageIndex) setImageIndex(idx)
  }

  const handleSubmitComment = () => {
    const text = commentText.trim()
    if (!text) return
    onComment(post.id, text)
    setCommentText("")
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/60 rounded-3xl overflow-hidden shadow-sm"
    >
      {/* Post header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <Avatar
          className="h-11 w-11 rounded-2xl cursor-pointer"
          onClick={() => openPhoto(post.author.avatar, (post.author as any).gender)}
        >
          <AvatarImage src={getAvatarUrl(post.author.avatar)} className="rounded-2xl" />
          <AvatarFallback className="rounded-2xl">{post.author.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openProfile(post.author.id)}>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[15px] truncate hover:underline">{post.author.name}</span>
            {post.author.verified && (
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-primary">
                <BadgeCheck className="h-3.5 w-3.5 text-primary-foreground" />
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            @{post.author.username} · {formatTimeAgo(post.timestamp ?? (post as any).createdAt)}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={async () => {
                const ok = await copyPostLink(post.shortCode)
                toast[ok ? "success" : "error"](ok ? "Link copied" : "Couldn't copy link")
              }}
            >
              Copy link
            </DropdownMenuItem>
            <DropdownMenuItem>Report post</DropdownMenuItem>
            <DropdownMenuItem>Mute user</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Media carousel — swipe horizontally; click to open the view-post modal */}
      {post.media.length > 0 && (
        <div className="relative mx-3 mb-2 overflow-hidden rounded-2xl">
          <div
            ref={carouselRef}
            onScroll={handleCarouselScroll}
            className="flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
          >
            {post.media.map((media: any, i) => (
              <div
                key={media.id || media || i}
                className="w-full shrink-0 snap-center cursor-pointer"
                onClick={() => setDetailOpen(true)}
              >
                <MediaItem media={media} className="w-full aspect-[4/3]" />
              </div>
            ))}
          </div>

          {/* "n/total" counter */}
          {post.media.length > 1 && (
            <div className="absolute top-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              {imageIndex + 1}/{post.media.length}
            </div>
          )}
        </div>
      )}

      {/* Action bar — flat Instagram-style icons with inline counts. Tapping the
          heart toggles the like; tapping the count opens the "liked by" list. */}
      <div className="px-4 pt-1.5 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <button onClick={handleLike} aria-label="Like" className="cursor-pointer">
              <motion.span
                animate={post.liked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
                className="block"
              >
                <Heart
                  className={cn(
                    "h-[26px] w-[26px] transition-colors",
                    post.liked ? "fill-rose-500 text-rose-500" : "text-foreground",
                  )}
                />
              </motion.span>
            </button>
            {(post.likes ?? 0) > 0 && (
              <button
                onClick={() => setLikesOpen(true)}
                className="text-[15px] font-semibold text-foreground hover:opacity-70 cursor-pointer"
              >
                {formatCount(post.likes ?? 0)}
              </button>
            )}
          </div>

          <button
            onClick={handleToggleComments}
            aria-label="Comments"
            className="flex items-center gap-1.5 text-[15px] font-semibold text-foreground hover:opacity-70 cursor-pointer"
          >
            <MessageCircle className="h-[26px] w-[26px] -scale-x-100" />
            {commentCount > 0 && formatCount(commentCount)}
          </button>

          <button
            onClick={() => {
              setShareOpen(true)
              onShare(post.id)
            }}
            aria-label="Share"
            className="flex items-center gap-1.5 text-[15px] font-semibold text-foreground hover:opacity-70 cursor-pointer"
          >
            <Send className="h-[23px] w-[23px]" />
            {(post.shares ?? 0) > 0 && formatCount(post.shares ?? 0)}
          </button>
        </div>

        <button
          onClick={() => onBookmark(post.id)}
          aria-label="Save"
          className="cursor-pointer text-foreground hover:opacity-70"
        >
          <Bookmark className={cn("h-[26px] w-[26px]", post.bookmarked && "fill-current")} />
        </button>
      </div>

      {/* Caption + hashtags + date */}
      {post.content && (
        <div
          className={cn("px-4 pt-1", post.media.length === 0 && "cursor-pointer")}
          onClick={post.media.length === 0 ? () => setDetailOpen(true) : undefined}
        >
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-foreground">
            <span className="font-semibold mr-1.5">{post.author.username}</span>
            {renderCaption(post.content)}
          </p>
        </div>
      )}
      <div className="px-4 pt-1">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {formatPostDate(post.timestamp ?? (post as any).createdAt)}
        </span>
      </div>

      {/* Inline comment composer */}
      <div className="px-4 py-3 flex items-center gap-2.5">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={getAvatarUrl(ownProfile?.avatar)} />
          <AvatarFallback>{(ownProfile?.name ?? "You").charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 flex items-center h-10 rounded-full bg-muted/60 px-4">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmitComment()
            }}
            placeholder="Add a comment..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none border-none p-0"
          />
        </div>
        <button
          onClick={handleSubmitComment}
          disabled={!commentText.trim()}
          aria-label="Send comment"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 active:scale-95 transition-transform cursor-pointer"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {/* Comments bottom sheet — same bordered modal on every device */}
      <CommentsSheet
        postId={post.id}
        authorUsername={post.author.username}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        onUserClick={openProfile}
        zIndex={commentsZ}
      />

      <LikedBySheet
        postId={post.id}
        likeCount={post.likes ?? 0}
        open={likesOpen}
        onOpenChange={setLikesOpen}
        onUserClick={openProfile}
        zIndex={likesZ}
      />

      <SharePostSheet post={post} open={shareOpen} onOpenChange={setShareOpen} />

      <ProfileModal
        userId={profileUserId}
        isOpen={!!profileUserId}
        onClose={() => setProfileUserId(null)}
        onMessage={handleMessageFromProfile}
      />

      {detailOpen && (
        <PostDetailModal
          post={{
            id: post.id,
            shortCode: post.shortCode,
            content: post.content,
            mediaUrls: (post.media || []).map((m: any) => ({
              url: typeof m === "string" ? m : m.url,
              type: (typeof m === "string" ? "image" : m.type) === "video" ? "video" : "image",
            })),
            author: {
              id: post.author.id,
              name: post.author.name,
              avatar: post.author.avatar,
            },
            createdAt: post.timestamp ?? new Date(),
            likesCount: post.likes ?? 0,
            commentsCount: post.commentsCount ?? post.comments?.length ?? 0,
            isLiked: post.liked,
            isBookmarked: post.bookmarked,
          }}
          isOwner={!!ownProfile?.id && post.author.id === ownProfile.id}
          onClose={() => setDetailOpen(false)}
          onViewProfile={openProfile}
        />
      )}
    </motion.article>
  )
}

function MediaItem({
  media,
  className,
}: {
  media: string | { url: string; type: string }
  className?: string
}) {
  const url = typeof media === "string" ? media : media.url
  const type = typeof media === "string" ? (media.endsWith(".mp4") ? "video" : "image") : media.type
  return (
    <div className={cn("overflow-hidden bg-muted", className)}>
      {type === "video" ? (
        <InstagramVideo src={url} className="w-full h-full" />
      ) : (
        <img src={url} alt="" className="w-full h-full object-cover" />
      )}
    </div>
  )
}

function formatTimeAgo(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString()
}

function formatCount(count: number): string {
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`
  return `${(count / 1000000).toFixed(1)}M`
}

// Absolute date shown under the caption (Instagram-style, e.g. "1 JUNE").
function formatPostDate(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return ""
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long" })
}

// Render caption text, highlighting #hashtags (and @mentions) in the accent color.
function renderCaption(text: string) {
  return text.split(/(\s+)/).map((tok, i) => {
    if ((tok.startsWith("#") || tok.startsWith("@")) && tok.length > 1) {
      return (
        <span key={i} className="text-primary">
          {tok}
        </span>
      )
    }
    return <span key={i}>{tok}</span>
  })
}

