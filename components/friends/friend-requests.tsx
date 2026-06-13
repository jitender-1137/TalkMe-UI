"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Check, X, Users } from "lucide-react"
import { cn, getAvatarUrl } from "@/lib/utils"
import {
  useContactRequests,
  useAcceptContactRequest,
  useDeclineContactRequest,
} from "@/src/api/hooks/useContacts"
import type { FriendRequest } from "@/src/api/types"

const formatRelativeTime = (dateStr: string | undefined | null) => {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return "now"
  if (diffMins < 60) return `${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d`
}

export function FriendRequests({ onCountChange }: { onCountChange: (n: number) => void }) {
  const { data: requests = [], isLoading } = useContactRequests()

  useEffect(() => {
    onCountChange(requests.length)
  }, [requests.length, onCountChange])

  const acceptMutation = useAcceptContactRequest()
  const declineMutation = useDeclineContactRequest()

  return (
    <div className="px-6 py-4 flex flex-col gap-2 max-w-2xl">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-sm text-muted-foreground">Loading requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">All caught up</p>
          <p className="text-sm text-muted-foreground mt-1">
            No pending friend requests
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Pending — {requests.length}
          </p>
          {requests.map((req) => (
            <RequestRow
              key={req.id}
              request={req}
              onAccept={() => acceptMutation.mutate(req.id)}
              onReject={() => declineMutation.mutate(req.id)}
              isAccepting={acceptMutation.isPending && acceptMutation.variables === req.id}
              isDeclining={declineMutation.isPending && declineMutation.variables === req.id}
            />
          ))}
        </>
      )}
    </div>
  )
}

function RequestRow({
  request,
  onAccept,
  onReject,
  isAccepting,
  isDeclining,
}: {
  request: FriendRequest
  onAccept: () => void
  onReject: () => void
  isAccepting: boolean
  isDeclining: boolean
}) {
  const senderName = request.sender?.name || "Unknown User"
  const initials = senderName
    .split(" ")
    .map((n) => n[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const username = request.sender?.username 
    ? `@${request.sender.username}` 
    : `@${senderName.toLowerCase().replace(/\s+/g, "")}`

  const timeAgo = formatRelativeTime(request.createdAt || request.sender?.createdAt)

  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card transition-all duration-300">
      {/* Avatar */}
      <div className="relative">
        <Avatar className="h-12 w-12 border-2 border-background shadow-xs">
          <AvatarImage src={getAvatarUrl(request.sender?.avatar, request.sender?.gender)} alt={senderName} />
          <AvatarFallback className="bg-muted text-muted-foreground font-medium text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">{senderName}</span>
              <span className="text-xs text-muted-foreground">{username}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {request.sender?.email ?? "Wants to connect with you"}
            </p>
          </div>
          <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{timeAgo}</span>
        </div>

        {/* Mutual + interests */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            0 mutual friends
          </span>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              New Request
            </Badge>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3">
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={isAccepting || isDeclining}
            onClick={onAccept}
          >
            <Check className="h-3.5 w-3.5" />
            {isAccepting ? "Accepting…" : "Accept"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs font-medium border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive/60"
            disabled={isAccepting || isDeclining}
            onClick={onReject}
          >
            <X className="h-3.5 w-3.5" />
            {isDeclining ? "Declining…" : "Decline"}
          </Button>
        </div>
      </div>
    </div>
  )
}
