"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Send,
  BadgeCheck,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn, getAvatarUrl } from "@/lib/utils"
import type { Post, PostComment } from "./types"

interface FeedPostProps {
  post: Post
  onLike: (postId: string) => void
  onBookmark: (postId: string) => void
  onShare: (postId: string) => void
  onComment: (postId: string, content: string) => void
}

export function FeedPost({ post, onLike, onBookmark, onShare, onComment }: FeedPostProps) {
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [imageIndex, setImageIndex] = useState(0)

  const handleLike = () => {
    onLike(post.id)
  }

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (commentText.trim()) {
      onComment(post.id, commentText)
      setCommentText("")
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl overflow-hidden"
    >
      {/* Post header */}
      <div className="flex items-center gap-3 p-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={getAvatarUrl(post.author.avatar)} />
          <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm truncate">{post.author.name}</span>
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

      {/* Post content */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-sm whitespace-pre-wrap">{post.content}</p>
        </div>
      )}

      {/* Media grid */}
      {post.media.length > 0 && (
        <div className="relative">
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
            onClick={() => setShowComments(!showComments)}
            className="gap-1.5 h-9 px-3"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-medium">{formatCount(post.comments?.length ?? 0)}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onShare(post.id)}
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

      {/* Comments section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border overflow-hidden"
          >
            {/* Comment list */}
            <div className="max-h-60 overflow-y-auto">
              {post.comments?.slice(0, 5).map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
              {post.comments && post.comments.length > 5 && (
                <button className="w-full py-2 text-sm text-primary hover:underline">
                  View all {post.comments.length} comments
                </button>
              )}
            </div>

            {/* Add comment */}
            <form onSubmit={handleSubmitComment} className="p-3 border-t border-border">
              <div className="flex items-center gap-2">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 h-9 text-sm"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!commentText.trim()}
                  className="h-9 w-9"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
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
        <video
          src={url}
          className="w-full h-full object-cover"
          controls
          playsInline
          onError={(e) => {
            (e.target as HTMLVideoElement).style.display = 'none'
          }}
        />
      ) : (
        <img src={url} alt="" className="w-full h-full object-cover" />
      )}
    </div>
  )
}

function CommentItem({ comment }: { comment: PostComment }) {
  return (
    <div className="flex gap-3 p-3">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={getAvatarUrl(comment.author.avatar)} />
        <AvatarFallback>{comment.author.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{comment.author.name}</span>
          <span className="text-xs text-muted-foreground">
            {formatTimeAgo(comment.timestamp)}
          </span>
        </div>
        <p className="text-sm mt-0.5">{comment.content}</p>
        <div className="flex items-center gap-3 mt-1">
          <button className="text-xs text-muted-foreground hover:text-foreground">
            {comment.likes ?? 0} likes
          </button>
          <button className="text-xs text-muted-foreground hover:text-foreground">
            Reply
          </button>
        </div>
      </div>
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
