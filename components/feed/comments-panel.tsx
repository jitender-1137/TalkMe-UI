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
  useCreateComment,
  useEditComment,
  useDeleteComment,
} from "@/src/api/hooks/useFeed"
import type { PostCommentDTO } from "@/src/api/services/post.service"

const QUICK_EMOJIS = ["❤️", "🙌", "🔥", "👏", "😢", "😍", "😮", "😂"]

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
  const scrollRef = useRef<HTMLDivElement>(null)

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

  // Load more when the user nears the bottom.
  const handleScroll = () => {
    const el = scrollRef.current
    if (!el || !hasNextPage || isFetchingNextPage) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      fetchNextPage()
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = commentText.trim()
    if (!text) return
    createComment.mutate({ postId, content: text })
    setCommentText("")
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
              <CommentRow
                key={c.id}
                comment={c}
                isOwn={!!myUsername && c.username === myUsername}
                onUserClick={() => onUserClick?.(c.userId)}
                onReply={() =>
                  setCommentText((t) => (t.includes(`@${c.username}`) ? t : `@${c.username} ${t}`))
                }
                onEdit={(text) => editComment.mutate({ postId, commentId: c.id, content: text })}
                onDelete={() => deleteComment.mutate({ postId, commentId: c.id })}
              />
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
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder={authorUsername ? `Add a comment for ${authorUsername}` : "Add a comment…"}
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
  onUserClick,
  onReply,
  onEdit,
  onDelete,
}: {
  comment: PostCommentDTO
  isOwn: boolean
  onUserClick?: () => void
  onReply?: () => void
  onEdit: (content: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.content)
  const [liked, setLiked] = useState(false)

  const saveEdit = () => {
    const next = draft.trim()
    if (next && next !== comment.content) onEdit(next)
    setEditing(false)
  }

  return (
    <div className="flex gap-3 py-2">
      <Avatar
        className={cn("h-9 w-9 shrink-0", onUserClick && "cursor-pointer")}
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
            <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{comment.content}</p>
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
          onClick={() => setLiked((v) => !v)}
          className="shrink-0 self-start mt-1 text-muted-foreground hover:text-foreground"
        >
          <Heart className={cn("h-4 w-4", liked && "fill-rose-500 text-rose-500")} />
        </button>
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
