"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  BadgeCheck,
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

  // Each overlay gets its own URL segment and is closed by the Back button.
  useUrlModal(detailOpen, () => setDetailOpen(false), `post/${post.id}`)
  useUrlModal(commentsOpen, () => setCommentsOpen(false), "comments")
  useUrlModal(shareOpen, () => setShareOpen(false), "share")
  useUrlModal(!!profileUserId, () => setProfileUserId(null), `user/${profileUserId ?? ""}`)

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

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl overflow-hidden"
    >
      {/* Post header */}
      <div className="flex items-center gap-3 p-4">
        <Avatar className="h-10 w-10 cursor-pointer" onClick={() => openProfile(post.author.id)}>
          <AvatarImage src={getAvatarUrl(post.author.avatar)} />
          <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openProfile(post.author.id)}>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm truncate hover:underline">{post.author.name}</span>
            {post.author.verified && (
              <BadgeCheck className="h-4 w-4 text-primary fill-primary/20" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            @{post.author.username} · {formatTimeAgo(post.timestamp ?? (post as any).createdAt)}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Copy link</DropdownMenuItem>
            <DropdownMenuItem>Report post</DropdownMenuItem>
            <DropdownMenuItem>Mute user</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Media grid — click to open the post in the view-post modal */}
      {post.media.length > 0 && (
        <div className="relative cursor-pointer" onClick={() => setDetailOpen(true)}>
          {post.media.length === 1 ? (
            <MediaItem media={post.media[0] as any} className="w-full aspect-square md:aspect-video" />
          ) : post.media.length === 2 ? (
            <div className="grid grid-cols-2 gap-0.5">
              {post.media.map((media: any) => (
                <MediaItem key={media.id || media} media={media} className="aspect-square" />
              ))}
            </div>
          ) : post.media.length === 3 ? (
            <div className="grid grid-cols-2 gap-0.5">
              <MediaItem media={post.media[0] as any} className="row-span-2 aspect-[1/2]" />
              <MediaItem media={post.media[1] as any} className="aspect-square" />
              <MediaItem media={post.media[2] as any} className="aspect-square" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-0.5">
              {post.media.slice(0, 4).map((media: any, index) => (
                <div key={media.id || media} className="relative">
                  <MediaItem media={media} className="aspect-square" />
                  {index === 3 && post.media.length > 4 && (
                    <div className="absolute inset-0 bg-black flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">
                        +{post.media.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Image indicator dots */}
          {post.media.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {post.media.slice(0, 5).map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-colors",
                    index === imageIndex ? "bg-white" : "bg-white/50"
                  )}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions bar */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-border">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={cn(
              "gap-1.5 h-9 px-3",
              post.liked && "text-rose-500 hover:text-rose-500"
            )}
          >
            <motion.div
              animate={post.liked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Heart
                className={cn("h-5 w-5", post.liked && "fill-current")}
              />
            </motion.div>
            <span className="text-sm font-medium">{formatCount(post.likes ?? 0)}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleComments}
            className="gap-1.5 h-9 px-3"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-medium">{formatCount(commentCount)}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShareOpen(true)
              onShare(post.id)
            }}
            className="gap-1.5 h-9 px-3"
          >
            <Share2 className="h-5 w-5" />
            <span className="text-sm font-medium">{formatCount(post.shares ?? 0)}</span>
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onBookmark(post.id)}
          className={cn("h-9 w-9", post.bookmarked && "text-primary")}
        >
          <Bookmark className={cn("h-5 w-5", post.bookmarked && "fill-current")} />
        </Button>
      </div>

      {/* Caption shown BELOW the like / comment / share actions.
          Text-only posts (no media) open the view-post modal on tap. */}
      {post.content && (
        <div
          className={cn("px-4 pb-3", post.media.length === 0 && "cursor-pointer")}
          onClick={post.media.length === 0 ? () => setDetailOpen(true) : undefined}
        >
          <p className="text-sm whitespace-pre-wrap">
            <span className="font-semibold mr-1.5">{post.author.username}</span>
            {post.content}
          </p>
        </div>
      )}

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
