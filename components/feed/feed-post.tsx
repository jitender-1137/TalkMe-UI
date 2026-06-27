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
import { toast } from "sonner"
import { copyPostLink } from "@/lib/post-link"
import { useUrlModal } from "@/lib/navigation/use-url-modal"
import type { Post } from "./types"
import { useProfile } from "@/src/api/hooks/useProfile"
import { SharePostSheet } from "./share-post-sheet"
import { InstagramVideo } from "./instagram-video"
import { ProfileModal } from "./profile-modal"
import { CommentsSheet } from "./comments-sheet"
import { useOpenOrCreateChat } from "@/src/api/hooks/useChats"
import { useNavigation } from "@/components/app-shell/navigation-context"
import { useChatContext } from "@/components/chat/chat-context"
import { CommentsPanel } from "./comments-panel"
import { PostDetailModal } from "./post-detail-modal"
import { useIsMobile } from "@/hooks/use-mobile"

interface FeedPostProps {
  post: Post
  onLike: (postId: string) => void
  onBookmark: (postId: string) => void
  onShare: (postId: string) => void
  onComment: (postId: string, content: string) => void
  onAuthorClick?: (authorId: string) => void
}

export function FeedPost({ post, onLike, onBookmark, onShare, onComment, onAuthorClick }: FeedPostProps) {
  const isMobile = useIsMobile()
  const [commentsOpen, setCommentsOpen] = useState(false) // mobile sheet
  const [inlineComments, setInlineComments] = useState(false) // desktop inline
  const [imageIndex, setImageIndex] = useState(0)
  const [shareOpen, setShareOpen] = useState(false)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false) // view-post modal
  const [commentText, setCommentText] = useState("")
  const carouselRef = useRef<HTMLDivElement>(null)

  // Each overlay gets its own URL segment and is closed by the Back button.
  // (ProfileModal self-registers its own `user/<id>` overlay.)
  useUrlModal(detailOpen, () => setDetailOpen(false), `post/${post.id}`)
  useUrlModal(commentsOpen, () => setCommentsOpen(false), "comments")
  useUrlModal(shareOpen, () => setShareOpen(false), "share")

  const { data: ownProfile } = useProfile()

  const openOrCreateChat = useOpenOrCreateChat()
  const { setActiveTab } = useNavigation()
  const { setSelectedConversationId, setShowMobileSecondaryPanel, setChatReturnTab } = useChatContext()

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
      // Remember the origin so mobile Back returns to the News tab.
      setChatReturnTab("news")
      setSelectedConversationId(chat.id)
      setShowMobileSecondaryPanel(false)
      // setActiveTab updates the hash via replaceState (no history entry).
      setActiveTab("chats")
      setProfileUserId(null)
    } catch {
      /* createChat surfaces its own error toast */
    }
  }

  const commentCount = post.commentsCount ?? post.comments?.length ?? 0

  const handleToggleComments = () => {
    if (isMobile) setCommentsOpen(true)
    else setInlineComments((v) => !v)
  }

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
          onClick={() => openProfile(post.author.id)}
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

      {/* Action pills */}
      <div className="px-4 pt-1 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleLike}
            className={cn(
              "flex items-center gap-1.5 h-9 px-3 rounded-full border text-sm font-semibold transition-colors cursor-pointer",
              post.liked
                ? "border-rose-500/40 text-rose-500 bg-rose-500/5"
                : "border-border text-foreground hover:bg-muted-foreground/10",
            )}
          >
            <motion.span
              animate={post.liked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Heart className={cn("h-5 w-5", post.liked && "fill-current")} />
            </motion.span>
            {formatCount(post.likes ?? 0)}
          </button>

          <button
            onClick={handleToggleComments}
            className="flex items-center gap-1.5 h-9 px-3 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-muted-foreground/10 transition-colors cursor-pointer"
          >
            <MessageCircle className="h-5 w-5" />
            {formatCount(commentCount)}
          </button>

          <button
            onClick={() => {
              setShareOpen(true)
              onShare(post.id)
            }}
            className="flex items-center gap-1.5 h-9 px-3 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-muted-foreground/10 transition-colors cursor-pointer"
          >
            <Send className="h-[18px] w-[18px]" />
            {formatCount(post.shares ?? 0)}
          </button>
        </div>

        <button
          onClick={() => onBookmark(post.id)}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full border transition-colors cursor-pointer",
            post.bookmarked
              ? "border-primary/40 text-primary bg-primary/5"
              : "border-border text-foreground hover:bg-muted-foreground/10",
          )}
        >
          <Bookmark className={cn("h-5 w-5", post.bookmarked && "fill-current")} />
        </button>
      </div>

      {/* Caption */}
      {post.content && (
        <div
          className={cn("px-4", post.media.length === 0 && "cursor-pointer")}
          onClick={post.media.length === 0 ? () => setDetailOpen(true) : undefined}
        >
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-foreground">
            <span className="font-semibold mr-1.5">{post.author.username}</span>
            {post.content}
          </p>
        </div>
      )}

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

      {/* Desktop: comments shown directly inline */}
      {!isMobile && inlineComments && (
        <div className="border-t border-border h-[420px]">
          <CommentsPanel
            postId={post.id}
            authorUsername={post.author.username}
            onUserClick={openProfile}
          />
        </div>
      )}

      {/* Mobile: bottom sheet */}
      {isMobile && (
        <CommentsSheet
          postId={post.id}
          authorUsername={post.author.username}
          open={commentsOpen}
          onOpenChange={setCommentsOpen}
          onUserClick={openProfile}
        />
      )}

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

