"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  MoreHorizontal,
  Play,
  Grid3x3,
  UserSquare2,
  Heart,
  MessageCircle,
  BadgeCheck,
  ChevronDown,
  Search,
  Loader2,
  UserPlus,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn, getAvatarUrl } from "@/lib/utils"
import { getMediaUrl } from "@/src/api/client"
import { useProfile, useUserById } from "@/src/api/hooks/useProfile"
import { useUserPosts } from "@/src/api/hooks/useFeed"
import { useStories } from "@/src/api/hooks/useStories"
import { useSuggestedFriends } from "@/src/api/hooks/useDiscover"
import { useFollowers, useFollowing, useFollowUser, useUnfollowUser } from "@/src/api/hooks/useFollow"
import { PostDetailModal } from "./post-detail-modal"

interface ProfileModalProps {
  userId: string | null
  isOpen: boolean
  onClose: () => void
  /** Open / create a chat with the given user. */
  onMessage: (userId: string) => void
}

type ConnTab = "followers" | "following" | "suggested"

/** Instagram-style profile card shown over the feed. */
export function ProfileModal({ userId, isOpen, onClose, onMessage }: ProfileModalProps) {
  // Allow drilling into other users without leaving the modal.
  const [viewUserId, setViewUserId] = useState<string | null>(userId)
  const [tab, setTab] = useState<"posts" | "tagged">("posts")
  const [view, setView] = useState<"profile" | "connections">("profile")
  const [connTab, setConnTab] = useState<ConnTab>("followers")
  // Local optimistic follow overrides (the "me" following query isn't auto-invalidated).
  const [localFollow, setLocalFollow] = useState<Record<string, boolean>>({})
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setViewUserId(userId)
      setTab("posts")
      setView("profile")
      setLocalFollow({})
      setSelectedPostId(null)
    }
  }, [isOpen, userId])

  const { data: ownProfile } = useProfile()
  const { data: user, isLoading } = useUserById(viewUserId || "")
  const { data: postsResponse, isLoading: isPostsLoading } = useUserPosts(viewUserId || "")
  const { data: storiesResponse } = useStories()
  const { data: ownFollowing } = useFollowing("me")

  const followMutation = useFollowUser()
  const unfollowMutation = useUnfollowUser()

  const isOwnProfile = !!viewUserId && viewUserId === ownProfile?.id
  const followingIds = useMemo(
    () => new Set((ownFollowing?.items || []).map((u: any) => u.id)),
    [ownFollowing],
  )
  const isFollowingUser = (id?: string | null) =>
    id ? (localFollow[id] ?? followingIds.has(id)) : false

  const toggleFollow = (id?: string | null) => {
    if (!id) return
    const cur = isFollowingUser(id)
    setLocalFollow((s) => ({ ...s, [id]: !cur }))
    if (cur) unfollowMutation.mutate(id)
    else followMutation.mutate(id)
  }

  const posts = postsResponse?.items || []

  // Story highlights — the viewed user's active stories.
  const highlights = useMemo(() => {
    const group = (storiesResponse?.items || []).find((g: any) => g.userId === viewUserId)
    return group?.stories || []
  }, [storiesResponse, viewUserId])

  const openConnections = (t: ConnTab) => {
    setConnTab(t)
    setView("connections")
  }

  const goToUser = (id: string) => {
    setViewUserId(id)
    setView("profile")
    setTab("posts")
  }

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[250] bg-black/50 backdrop-blur-xs"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            className="fixed left-1/2 top-1/2 z-[260] -translate-x-1/2 -translate-y-1/2
                       w-full h-full sm:h-[90vh] sm:max-w-[480px] sm:rounded-2xl
                       bg-background border border-border shadow-2xl overflow-hidden flex flex-col"
          >
            {view === "connections" ? (
              <ConnectionsView
                key="connections"
                username={user?.username || "profile"}
                tab={connTab}
                onTabChange={setConnTab}
                targetId={viewUserId}
                ownId={ownProfile?.id}
                isFollowingUser={isFollowingUser}
                onToggleFollow={toggleFollow}
                onBack={() => setView("profile")}
                onSelectUser={goToUser}
              />
            ) : (
              <>
                {/* Top bar */}
                <div className="h-14 shrink-0 flex items-center gap-3 px-3 border-b border-border/60">
                  <Button variant="ghost" size="icon" className="h-9 w-9 -ml-1" onClick={onClose}>
                    <ArrowLeft className="h-6 w-6" />
                  </Button>
                  <span className="flex-1 text-lg font-bold truncate">
                    {user?.username || "profile"}
                  </span>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <MoreHorizontal className="h-6 w-6" />
                  </Button>
                </div>

                {/* Scroll area */}
                <div className="flex-1 overflow-y-auto">
                  {isLoading || !user ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 py-24">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Loading profile…</span>
                    </div>
                  ) : (
                    <>
                      {/* Avatar + stats */}
                      <div className="flex items-center gap-5 px-4 pt-4">
                        <div className="rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2.5px] shrink-0">
                          <div className="rounded-full bg-background p-[2.5px]">
                            <Avatar className="h-[88px] w-[88px]">
                              <AvatarImage src={getAvatarUrl(user.avatar)} />
                              <AvatarFallback className="text-2xl">
                                {user.name?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </div>

                        <div className="flex flex-1 justify-around text-center">
                          <Stat value={user.postsCount ?? posts.length} label="posts" />
                          <Stat
                            value={user.followersCount ?? 0}
                            label="followers"
                            onClick={() => openConnections("followers")}
                          />
                          <Stat
                            value={user.followingCount ?? 0}
                            label="following"
                            onClick={() => openConnections("following")}
                          />
                        </div>
                      </div>

                      {/* Name + bio */}
                      <div className="px-4 pt-3 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-sm">{user.name}</p>
                          {user.isVerified && (
                            <BadgeCheck className="h-4 w-4 text-primary fill-primary/20" />
                          )}
                        </div>
                        {user.occupation && (
                          <p className="text-sm text-muted-foreground">{user.occupation}</p>
                        )}
                        {user.bio && (
                          <p className="text-sm whitespace-pre-wrap leading-snug">{user.bio}</p>
                        )}
                        {(user.city || user.country) && (
                          <p className="text-sm text-muted-foreground">
                            📍 {[user.city, user.country].filter(Boolean).join(", ")}
                          </p>
                        )}
                        {user.interests && user.interests.length > 0 && (
                          <p className="text-sm text-primary">
                            {user.interests.map((i) => `#${i.replace(/\s+/g, "")}`).join(" ")}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="px-4 pt-4">
                        {isOwnProfile ? (
                          <Button variant="secondary" className="w-full h-9 font-semibold">
                            Edit profile
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Button
                              className="flex-1 h-9 font-semibold"
                              variant={isFollowingUser(viewUserId) ? "secondary" : "default"}
                              onClick={() => toggleFollow(viewUserId)}
                            >
                              {isFollowingUser(viewUserId) ? (
                                <>
                                  Following <ChevronDown className="h-4 w-4 ml-1" />
                                </>
                              ) : (
                                "Follow"
                              )}
                            </Button>
                            <Button
                              variant="secondary"
                              className="flex-1 h-9 font-semibold"
                              onClick={() => viewUserId && onMessage(viewUserId)}
                            >
                              Message
                            </Button>
                            <Button variant="secondary" size="icon" className="h-9 w-9 shrink-0">
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Story highlights */}
                      {highlights.length > 0 && (
                        <div className="flex gap-4 overflow-x-auto px-4 pt-4 pb-1 scrollbar-thin">
                          {highlights.map((story: any, i: number) => (
                            <div key={story.id} className="flex flex-col items-center gap-1 shrink-0 w-16">
                              <div className="rounded-full border-2 border-border p-[2px]">
                                <Avatar className="h-[60px] w-[60px]">
                                  <AvatarImage src={getMediaUrl(story.mediaUrl)} />
                                  <AvatarFallback>{i + 1}</AvatarFallback>
                                </Avatar>
                              </div>
                              <span className="text-[11px] truncate w-full text-center text-muted-foreground">
                                {story.caption || "Story"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Tab bar */}
                      <div className="mt-3 flex border-t border-border/60">
                        <TabButton active={tab === "posts"} onClick={() => setTab("posts")}>
                          <Grid3x3 className="h-6 w-6" />
                        </TabButton>
                        <TabButton active={tab === "tagged"} onClick={() => setTab("tagged")}>
                          <UserSquare2 className="h-6 w-6" />
                        </TabButton>
                      </div>

                      {/* Grid content */}
                      {tab === "posts" ? (
                        isPostsLoading ? (
                          <div className="flex justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : posts.length === 0 ? (
                          <div className="py-16 text-center text-sm text-muted-foreground">
                            No posts yet
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-[2px]">
                            {posts.map((post: any) => (
                              <PostCell
                                key={post.id}
                                post={post}
                                onClick={() => setSelectedPostId(post.id)}
                              />
                            ))}
                          </div>
                        )
                      ) : (
                        <div className="py-16 flex flex-col items-center gap-2 text-muted-foreground">
                          <UserSquare2 className="h-10 w-10" />
                          <p className="text-sm">No tagged posts</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </motion.div>

          {/* Post detail. Wrapped in a stacking context above the profile modal
              (z-260) but below the image viewer (z-300), so opening an image from
              the post still layers correctly. */}
          {(() => {
            const sp = posts.find((p: any) => p.id === selectedPostId)
            if (!selectedPostId || !sp) return null
            return (
              <div className="relative z-[280]">
                <PostDetailModal
                  post={{
                    id: sp.id,
                    content: sp.content,
                    mediaUrls: (sp.media || [])
                      .map((m: any) => {
                        const raw = typeof m === "string" ? m : m.mediaUrl
                        const url = getMediaUrl(raw) || ""
                        const isVideo =
                          (typeof m === "string" ? "" : (m.mediaType || "")).toLowerCase() === "video" ||
                          /\.(mp4|webm|mov)$/i.test(raw || "")
                        return { url, type: (isVideo ? "video" : "image") as "video" | "image" }
                      })
                      .filter((x: { url: string }) => x.url),
                    author: {
                      id: sp.userId ?? viewUserId ?? "",
                      name: sp.userName ?? user?.name ?? "User",
                      avatar: sp.userAvatar ?? user?.avatar,
                    },
                    createdAt: sp.createdAt,
                    likesCount: sp.likesCount || 0,
                    commentsCount: sp.commentsCount ?? 0,
                    isLiked: !!sp.isLiked,
                    isBookmarked: !!sp.isBookmarked,
                  }}
                  isOwner={isOwnProfile}
                  onClose={() => setSelectedPostId(null)}
                  onViewProfile={(id) => setViewUserId(id)}
                />
              </div>
            )
          })()}
        </>
      )}
    </AnimatePresence>
  )

  if (typeof document === "undefined") return null
  return createPortal(modalContent, document.body)
}

/* ── Connections (followers / following / suggested) ───────────────────────── */
function ConnectionsView({
  username,
  tab,
  onTabChange,
  targetId,
  ownId,
  isFollowingUser,
  onToggleFollow,
  onBack,
  onSelectUser,
}: {
  username: string
  tab: ConnTab
  onTabChange: (t: ConnTab) => void
  targetId: string | null
  ownId?: string
  isFollowingUser: (id?: string | null) => boolean
  onToggleFollow: (id?: string | null) => void
  onBack: () => void
  onSelectUser: (id: string) => void
}) {
  const [query, setQuery] = useState("")

  const { data: followers, isLoading: loadingFollowers } = useFollowers(
    tab === "followers" ? targetId || "" : "",
  )
  const { data: following, isLoading: loadingFollowing } = useFollowing(
    tab === "following" ? targetId || "" : "",
  )
  const { data: suggested, isLoading: loadingSuggested } = useSuggestedFriends()

  const list: any[] =
    tab === "followers"
      ? followers?.items || []
      : tab === "following"
        ? following?.items || []
        : suggested?.items || []
  const loading =
    tab === "followers" ? loadingFollowers : tab === "following" ? loadingFollowing : loadingSuggested

  const filtered = list.filter((u) =>
    `${u.name || ""} ${u.username || ""}`.toLowerCase().includes(query.toLowerCase()),
  )

  const tabs: { id: ConnTab; label: string }[] = [
    { id: "followers", label: "Followers" },
    { id: "following", label: "Following" },
    { id: "suggested", label: "Suggested" },
  ]

  return (
    <>
      {/* Top bar */}
      <div className="h-14 shrink-0 flex items-center gap-3 px-3 border-b border-border/60">
        <Button variant="ghost" size="icon" className="h-9 w-9 -ml-1" onClick={onBack}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <span className="flex-1 text-lg font-bold truncate text-center pr-9">{username}</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/60 shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={cn(
              "flex-1 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="p-3 shrink-0">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="pl-9 h-10 bg-muted border-0"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            {query ? "No people found." : "Nothing here yet."}
          </p>
        ) : (
          filtered.map((u) => {
            const isSelf = u.id === ownId
            const following = isFollowingUser(u.id)
            return (
              <div key={u.id} className="flex items-center gap-3 py-2">
                <button
                  onClick={() => onSelectUser(u.id)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={getAvatarUrl(u.avatar)} />
                    <AvatarFallback>{(u.name || u.username || "?").charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold truncate">{u.username}</span>
                      {u.isVerified && (
                        <BadgeCheck className="h-3.5 w-3.5 text-primary fill-primary/20 shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{u.name}</p>
                  </div>
                </button>
                {!isSelf && (
                  <Button
                    size="sm"
                    variant={following ? "secondary" : "default"}
                    className="h-8 px-5 font-semibold shrink-0"
                    onClick={() => onToggleFollow(u.id)}
                  >
                    {following ? "Following" : "Follow"}
                  </Button>
                )}
              </div>
            )
          })
        )}
      </div>
    </>
  )
}

/* ── Small pieces ──────────────────────────────────────────────────────────── */
function PostCell({ post, onClick }: { post: any; onClick?: () => void }) {
  const first = post.media?.[0]
  const url = first
    ? typeof first === "string"
      ? getMediaUrl(first)
      : getMediaUrl(first.mediaUrl)
    : undefined
  const isVideo =
    first &&
    (typeof first === "string"
      ? /\.(mp4|webm|mov)$/i.test(first)
      : (first.mediaType || "").toLowerCase() === "video")

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative aspect-square bg-muted overflow-hidden group cursor-pointer text-left"
    >
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full p-2 flex items-center justify-center bg-gradient-to-br from-muted to-muted/40">
          <p className="text-[11px] text-muted-foreground line-clamp-4 text-center">
            {post.content}
          </p>
        </div>
      )}
      {isVideo && (
        <Play className="absolute top-1.5 right-1.5 h-4 w-4 text-white fill-white drop-shadow" />
      )}
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-sm font-semibold">
        <span className="flex items-center gap-1">
          <Heart className="h-4 w-4 fill-white" />
          {post.likesCount || 0}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="h-4 w-4 fill-white" />
          {post.commentsCount || 0}
        </span>
      </div>
    </button>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center py-2.5 border-t-2 -mt-px transition-colors",
        active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground",
      )}
    >
      {children}
    </button>
  )
}

function Stat({
  value,
  label,
  onClick,
}: {
  value: number
  label: string
  onClick?: () => void
}) {
  const content = (
    <>
      <span className="font-bold text-base leading-tight">{formatCount(value)}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </>
  )
  if (onClick) {
    return (
      <button onClick={onClick} className="flex flex-col items-center">
        {content}
      </button>
    )
  }
  return <div className="flex flex-col items-center">{content}</div>
}

function formatCount(count: number): string {
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K`
  return `${(count / 1000000).toFixed(1).replace(/\.0$/, "")}M`
}
