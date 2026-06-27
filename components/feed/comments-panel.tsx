"use client"

import { useRef, useState } from "react"
import { Heart, Send, MoreHorizontal, Pencil, Trash2, Check, X, Loader2 } from "lucide-react"
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
import { useProfile } from "@/src/api/hooks/useProfile"
import {
  useComments,
  useCommentReplies,
  useCreateComment,
  useEditComment,
  useDeleteComment,
  useLikeComment,
  useUnlikeComment,
} from "@/src/api/hooks/useFeed"
import type { PostCommentDTO } from "@/src/api/services/post.service"

const QUICK_EMOJIS = ["❤️", "🙌", "🔥", "👏", "😢", "😍", "😮", "😂"]

// Render comment text with leading/inline @mentions highlighted (Instagram-style).
function renderWithMentions(text: string) {
  return text.split(/(@[A-Za-z0-9_.]+)/g).map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="text-sky-500 font-medium">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

interface CommentsPanelProps {
  postId: string
  authorUsername?: string
  /** Whether to fetch (e.g. only when a sheet is open). Defaults to true. */
  active?: boolean
  onUserClick?: (userId?: string | null) => void
  className?: string
}

/**
 * Reusable comments UI — scrollable list (cursor/page infinite scroll),
 * quick-emoji row and input. Used inline on desktop and inside the bottom sheet.
 */
export function CommentsPanel({
  postId,
  authorUsername,
  active = true,
  onUserClick,
  className,
}: CommentsPanelProps) {
  const [commentText, setCommentText] = useState("")
  // The thread we're currently replying into: rootId = the top-level comment id
  // (replies are one level deep, so a reply-to-a-reply still attaches to the root).
  const [replyTo, setReplyTo] = useState<{ rootId: string; username: string } | null>(null)
  // Top-level comment ids whose replies are expanded.
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: ownProfile } = useProfile()
  const myUsername = ownProfile?.username

  const {
    data,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useComments(active ? postId : "")
  const comments = data?.pages.flatMap((p) => p.items) ?? []

  const createComment = useCreateComment()
  const editComment = useEditComment()
  const deleteComment = useDeleteComment()
  const likeComment = useLikeComment()
  const unlikeComment = useUnlikeComment()

  // Load more when the user nears the bottom.
  const handleScroll = () => {
    const el = scrollRef.current
    if (!el || !hasNextPage || isFetchingNextPage) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      fetchNextPage()
    }
  }

  const toggleExpand = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  // Begin replying to `username` within thread `rootId`. Pre-fills the @mention,
  // expands the thread, and focuses the input.
  const startReply = (rootId: string, username: string) => {
    setReplyTo({ rootId, username })
    setCommentText((t) => (t.startsWith(`@${username} `) ? t : `@${username} `))
    setExpanded((s) => new Set(s).add(rootId))
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const cancelReply = () => {
    setReplyTo(null)
    setCommentText("")
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = commentText.trim()
    if (!text) return
    createComment.mutate({ postId, content: text, parentId: replyTo?.rootId })
    if (replyTo) setExpanded((s) => new Set(s).add(replyTo.rootId))
    setCommentText("")
    setReplyTo(null)
  }

  return (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      {/* List */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto min-h-0 px-4 py-3">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-1 py-10">
            <p className="font-semibold">No comments yet</p>
            <p className="text-sm text-muted-foreground">Start the conversation.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {comments.map((c) => (
              <div key={c.id}>
                <CommentRow
                  comment={c}
                  isOwn={!!myUsername && c.username === myUsername}
                  onUserClick={() => onUserClick?.(c.userId)}
                  onReply={() => startReply(c.id, c.username)}
                  onEdit={(text) => editComment.mutate({ postId, commentId: c.id, content: text })}
                  onDelete={() => deleteComment.mutate({ postId, commentId: c.id })}
                  onToggleLike={() =>
                    (c.likedByMe ? unlikeComment : likeComment).mutate({ postId, commentId: c.id })
                  }
                />
                {c.replyCount > 0 && (
                  <RepliesThread
                    postId={postId}
                    parentId={c.id}
                    replyCount={c.replyCount}
                    expanded={expanded.has(c.id)}
                    onToggle={() => toggleExpand(c.id)}
                    myUsername={myUsername}
                    onUserClick={onUserClick}
                    onStartReply={startReply}
                    editComment={editComment}
                    deleteComment={deleteComment}
                    likeComment={likeComment}
                    unlikeComment={unlikeComment}
                  />
                )}
              </div>
            ))}
            {isFetchingNextPage && (
              <div className="flex justify-center py-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick emoji row */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t border-border/60">
        {QUICK_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setCommentText((t) => t + e)}
            className="text-2xl leading-none hover:scale-110 transition-transform"
          >
            {e}
          </button>
        ))}
      </div>

      {/* "Replying to" indicator */}
      {replyTo && (
        <div className="shrink-0 flex items-center justify-between px-4 py-1.5 border-t border-border/60 bg-muted/40">
          <span className="text-xs text-muted-foreground">
            Replying to <span className="font-semibold text-foreground">@{replyTo.username}</span>
          </span>
          <button
            type="button"
            onClick={cancelReply}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Cancel reply"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={submit}
        className="shrink-0 flex items-center gap-2 px-3 py-2 border-t border-border/60 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={getAvatarUrl(ownProfile?.avatar)} />
          <AvatarFallback>{(ownProfile?.name || "U").charAt(0)}</AvatarFallback>
        </Avatar>
        <Input
          ref={inputRef}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder={
            replyTo
              ? `Reply to @${replyTo.username}…`
              : authorUsername
                ? `Add a comment for ${authorUsername}`
                : "Add a comment…"
          }
          className="flex-1 h-10 rounded-full bg-muted border-0 text-sm"
        />
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          disabled={!commentText.trim() || createComment.isPending}
          className="h-9 w-9 text-primary disabled:text-muted-foreground"
        >
          {createComment.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </form>
    </div>
  )
}

function CommentRow({
  comment,
  isOwn,
  isReply = false,
  onUserClick,
  onReply,
  onEdit,
  onDelete,
  onToggleLike,
}: {
  comment: PostCommentDTO
  isOwn: boolean
  isReply?: boolean
  onUserClick?: () => void
  onReply?: () => void
  onEdit: (content: string) => void
  onDelete: () => void
  onToggleLike: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.content)
  // Like state is driven by the (optimistically-updated) comment from the cache.
  const liked = !!comment.likedByMe
  const likesCount = comment.likesCount ?? 0

  const saveEdit = () => {
    const next = draft.trim()
    if (next && next !== comment.content) onEdit(next)
    setEditing(false)
  }

  return (
    <div className="flex gap-3 py-2">
      <Avatar
        className={cn(isReply ? "h-7 w-7" : "h-9 w-9", "shrink-0", onUserClick && "cursor-pointer")}
        onClick={onUserClick}
      >
        <AvatarImage src={getAvatarUrl(comment.profileImage ?? undefined)} />
        <AvatarFallback>{(comment.name || comment.username || "?").charAt(0)}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn("text-sm font-semibold", onUserClick && "cursor-pointer hover:underline")}
            onClick={onUserClick}
          >
            {comment.username || comment.name}
          </span>
          <span className="text-xs text-muted-foreground">{formatTimeAgo(comment.createdAt)}</span>
        </div>

        {editing ? (
          <div className="flex items-center gap-2 mt-1">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit()
                if (e.key === "Escape") setEditing(false)
              }}
              className="flex-1 h-8 text-sm"
            />
            <Button size="icon" className="h-8 w-8" onClick={saveEdit}>
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                setDraft(comment.content)
                setEditing(false)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">
              {renderWithMentions(comment.content)}
            </p>
            <div className="flex items-center gap-4 mt-1">
              <button
                onClick={onReply}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Reply
              </button>
              {isOwn && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-xs font-semibold text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="z-[320]">
                    <DropdownMenuItem onClick={() => setEditing(true)}>
                      <Pencil className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </>
        )}
      </div>

      {!editing && (
        <button
          onClick={onToggleLike}
          aria-pressed={liked}
          aria-label={liked ? "Unlike comment" : "Like comment"}
          className="shrink-0 self-start mt-1 flex flex-col items-center gap-0.5 text-muted-foreground hover:text-foreground"
        >
          <Heart className={cn("h-4 w-4", liked && "fill-rose-500 text-rose-500")} />
          {likesCount > 0 && <span className="text-[11px] leading-none">{likesCount}</span>}
        </button>
      )}
    </div>
  )
}

type CommentMutation = { mutate: (vars: any) => void }

function RepliesThread({
  postId,
  parentId,
  replyCount,
  expanded,
  onToggle,
  myUsername,
  onUserClick,
  onStartReply,
  editComment,
  deleteComment,
  likeComment,
  unlikeComment,
}: {
  postId: string
  parentId: string
  replyCount: number
  expanded: boolean
  onToggle: () => void
  myUsername?: string
  onUserClick?: (userId?: string | null) => void
  onStartReply: (rootId: string, username: string) => void
  editComment: CommentMutation
  deleteComment: CommentMutation
  likeComment: CommentMutation & { mutate: (v: any) => void }
  unlikeComment: CommentMutation
}) {
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isLoading } = useCommentReplies(
    postId,
    parentId,
    expanded,
  )
  const replies = data?.pages.flatMap((p) => p.items) ?? []

  return (
    <div className="pl-11">
      <button
        onClick={onToggle}
        className="flex items-center gap-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <span className="h-px w-6 bg-border" />
        {expanded ? "Hide replies" : `View ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
      </button>

      {expanded && (
        <div>
          {isLoading && replies.length === 0 ? (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            replies.map((r) => (
              <CommentRow
                key={r.id}
                comment={r}
                isReply
                isOwn={!!myUsername && r.username === myUsername}
                onUserClick={() => onUserClick?.(r.userId)}
                onReply={() => onStartReply(parentId, r.username)}
                onEdit={(text) =>
                  editComment.mutate({ postId, commentId: r.id, content: text, parentId })
                }
                onDelete={() => deleteComment.mutate({ postId, commentId: r.id, parentId })}
                onToggleLike={() =>
                  (r.likedByMe ? unlikeComment : likeComment).mutate({
                    postId,
                    commentId: r.id,
                    parentId,
                  })
                }
              />
            ))
          )}
          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="flex items-center gap-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <span className="h-px w-6 bg-border" />
              {isFetchingNextPage ? "Loading…" : "View more replies"}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function formatTimeAgo(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  if (weeks < 52) return `${weeks}w`
  return `${Math.floor(weeks / 52)}y`
}
