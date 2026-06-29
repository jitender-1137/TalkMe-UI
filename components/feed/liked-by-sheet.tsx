"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, Eye, Search, X, Loader2, BadgeCheck, Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn, getAvatarUrl } from "@/lib/utils"
import { useProfile } from "@/src/api/hooks/useProfile"
import { useFollowing, useFollowUser, useUnfollowUser } from "@/src/api/hooks/useFollow"
import { usePostLikes } from "@/src/api/hooks/useFeed"

interface LikedBySheetProps {
  postId: string
  /** Authoritative like total (the post's count) shown in the header. */
  likeCount?: number
  /** Optional view count — rendered next to likes when provided. */
  viewCount?: number
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Open a liker's profile. */
  onUserClick?: (userId?: string | null) => void
  /** Stack z-index from useUrlModal so a profile opened from here layers above. */
  zIndex?: number
}

function formatCount(count: number): string {
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${(count / 1000).toFixed(count % 1000 === 0 ? 0 : 1)}K`
  return `${(count / 1000000).toFixed(1)}M`
}

/** Instagram-style "Likes and views" bottom sheet listing who liked a post. */
export function LikedBySheet({
  postId,
  likeCount,
  viewCount,
  open,
  onOpenChange,
  onUserClick,
  zIndex = 290,
}: LikedBySheetProps) {
  const [query, setQuery] = useState("")
  // Optimistic follow overrides — the "me" following query isn't auto-invalidated mid-session.
  const [localFollow, setLocalFollow] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (open) {
      setQuery("")
      setLocalFollow({})
    }
  }, [open])

  const { data: ownProfile } = useProfile()
  const { data: ownFollowing } = useFollowing("me")
  const { data: likes, isLoading } = usePostLikes(postId, open)

  const followMutation = useFollowUser()
  const unfollowMutation = useUnfollowUser()

  const followingIds = useMemo(
    () => new Set((ownFollowing?.items || []).map((u: any) => u.id)),
    [ownFollowing],
  )
  const isFollowing = (id: string) => localFollow[id] ?? followingIds.has(id)
  const toggleFollow = (id: string) => {
    const cur = isFollowing(id)
    setLocalFollow((s) => ({ ...s, [id]: !cur }))
    if (cur) unfollowMutation.mutate(id)
    else followMutation.mutate(id)
  }

  const list: any[] = likes?.items || []
  const filtered = query
    ? list.filter((u) =>
        `${u.name || ""} ${u.username || ""}`.toLowerCase().includes(query.toLowerCase()),
      )
    : list

  const content = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.stopPropagation()
              onOpenChange(false)
            }}
            style={{ zIndex }}
            className="fixed inset-0 bg-black/50"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{ zIndex: zIndex + 1 }}
            className="fixed bottom-0 inset-x-0 mx-auto w-full sm:max-w-[480px]
                       h-[72vh] bg-popover md:bg-muted rounded-t-2xl border border-border/80 shadow-2xl flex flex-col"
          >
            {/* Handle + title + stats */}
            <div className="shrink-0 pt-2 pb-3 border-b border-border/60">
              <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/40" />
              <h2 className="text-center font-semibold mt-2">
                {typeof viewCount === "number" ? "Likes and views" : "Likes"}
              </h2>
              <div className="mt-3 flex items-center justify-center gap-8">
                <div className="flex items-center gap-1.5 text-foreground">
                  <Heart className="h-5 w-5 text-rose-500 fill-rose-500" />
                  <span className="font-semibold">{formatCount(likeCount ?? list.length)}</span>
                </div>
                {typeof viewCount === "number" && (
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Eye className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">{formatCount(viewCount)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              {/* Search */}
              <div className="px-4 pt-3">
                <div className="flex items-center h-10 rounded-full bg-muted/60 px-4 focus-within:ring-1 focus-within:ring-primary/40">
                  <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search"
                    className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none border-none p-0"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      className="p-0.5 rounded-full hover:bg-muted-foreground/20 cursor-pointer"
                      aria-label="Clear"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>

              {/* "Liked by" list */}
              <div className="px-4 pt-3 pb-1 text-sm font-semibold text-foreground">Liked by</div>
              <div className="flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                    <Users className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      {query ? "No people found" : "No likes yet"}
                    </p>
                  </div>
                ) : (
                  filtered.map((u) => {
                    const isSelf = u.id === ownProfile?.id
                    const following = isFollowing(u.id)
                    return (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-muted/50 transition-colors"
                      >
                        <button
                          onClick={() => onUserClick?.(u.id)}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                        >
                          <Avatar className="h-12 w-12 shrink-0 ring-2 ring-primary/10">
                            <AvatarImage src={getAvatarUrl(u.avatar)} />
                            <AvatarFallback>{(u.name || u.username || "?").charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-semibold text-foreground truncate">
                                {u.username || u.name}
                              </span>
                              {u.isVerified && (
                                <BadgeCheck className="h-3.5 w-3.5 text-primary fill-primary/20 shrink-0" />
                              )}
                            </div>
                            {u.name && (
                              <p className="text-xs text-muted-foreground truncate">{u.name}</p>
                            )}
                          </div>
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => toggleFollow(u.id)}
                            className={cn(
                              "h-9 px-5 rounded-lg text-sm font-semibold shrink-0 transition-colors cursor-pointer",
                              following
                                ? "bg-muted text-foreground hover:bg-muted/70"
                                : "bg-primary text-primary-foreground hover:bg-primary/90",
                            )}
                          >
                            {following ? "Following" : "Follow"}
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  if (typeof document === "undefined") return null
  return createPortal(content, document.body)
}
