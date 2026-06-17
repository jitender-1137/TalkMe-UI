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
    <div className="px-4 sm:px-6 py-4 flex flex-col gap-3">
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
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Pending requests ({requests.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {requests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                onAccept={() => acceptMutation.mutate(req.id)}
                onReject={() => declineMutation.mutate(req.id)}
                isAccepting={acceptMutation.isPending && acceptMutation.variables === req.id}
                isDeclining={declineMutation.isPending && declineMutation.variables === req.id}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function RequestCard({
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
  const avatarUrl = getAvatarUrl(request.sender?.avatar, request.sender?.gender)

  return (
    <div className="group relative flex flex-col justify-between gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all duration-200">
      {/* Time ago — top right */}
      <span className="absolute top-2.5 right-2.5 text-[9px] text-muted-foreground select-none">
        {timeAgo}
      </span>

      {/* Avatar + name (centered) */}
      <div className="flex flex-col items-center gap-2 pt-2 text-center">
        <Avatar className="h-14 w-14 border-2 border-background shadow-sm shrink-0">
          <AvatarImage src={avatarUrl} alt={senderName} />
          <AvatarFallback className="bg-muted text-muted-foreground font-medium text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 w-full px-1">
          <p className="text-xs font-semibold text-foreground truncate leading-tight">
            {senderName}
          </p>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            {username}
          </p>
        </div>
      </div>

      {/* Info details / tags */}
      <div className="flex flex-col gap-1.5 text-[10px] text-muted-foreground mt-0.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-0.5">
            <Users className="h-2.5 w-2.5 shrink-0" />
            0 mutual
          </span>
          <Badge variant="secondary" className="text-[9px] px-1 py-0 shrink-0">
            Request
          </Badge>
        </div>
      </div>

      {/* Accept / Decline CTA Buttons */}
      <div className="flex flex-col gap-1 mt-1.5 w-full">
        <Button
          size="sm"
          className="h-7 w-full text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white p-0"
          disabled={isAccepting || isDeclining}
          onClick={onAccept}
        >
          {isAccepting ? "Accepting…" : "Accept"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-full text-[10px] font-semibold border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50 p-0"
          disabled={isAccepting || isDeclining}
          onClick={onReject}
        >
          {isDeclining ? "Declining…" : "Decline"}
        </Button>
      </div>
    </div>
  )
}
