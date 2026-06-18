"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MapPin,
  Link as LinkIcon,
  Calendar,
  Edit2,
  Camera,
  Check,
  X,
  BadgeCheck,
  ArrowLeft,
  Settings,
  Loader2,
  Heart,
  MessageCircle,
  Bookmark,
  Send,
  Video,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn, getAvatarUrl } from "@/lib/utils"
import type { UserProfile } from "./types"
import { useNavigation } from "@/components/app-shell/navigation-context"
import { useUserPosts } from "@/src/api/hooks/useFeed"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useFollowers, useFollowing, useFollowUser, useUnfollowUser } from "@/src/api/hooks/useFollow"
import { ProfileModal } from "./profile-modal"
import { PostDetailModal } from "./post-detail-modal"
import { useCreateChat } from "@/src/api/hooks/useChats"
import { useChatContext } from "@/components/chat/chat-context"
import { useProfile } from "@/src/api/hooks/useProfile"

interface ProfileExplorerProps {
  profile: UserProfile
  onUpdateProfile?: (updates: Partial<UserProfile>) => void
  onMessage?: () => void
  onBack?: () => void
  onViewProfile?: (userId: string) => void
  activeStories?: any[]
}

export function ProfileExplorer({
  profile,
  onUpdateProfile,
  onMessage,
  onBack,
  onViewProfile,
  activeStories = [],
}: ProfileExplorerProps) {
  const { setActiveTab } = useNavigation()
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [editedBio, setEditedBio] = useState(profile.bio)
  const [bioExpanded, setBioExpanded] = useState(false)
  const [editingInterests, setEditingInterests] = useState(false)
  const [interests, setInterests] = useState(profile.interests)
  const [newInterest, setNewInterest] = useState("")

  const [activeSubTab, setActiveSubTab] = useState<"posts" | "stories" | "followers" | "following">("posts")
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  // Open another user's profile in the Instagram-style modal (followers/following).
  const [modalUserId, setModalUserId] = useState<string | null>(null)

  const createChat = useCreateChat()
  const { setSelectedConversationId, setShowMobileSecondaryPanel, setChatReturnTab } = useChatContext()

  const handleModalMessage = (targetId: string) => {
    if (!targetId) return
    createChat.mutate(
      { participantId: targetId },
      {
        onSuccess: (chat) => {
          // Remember the origin so mobile Back returns to the News tab.
          setChatReturnTab("news")
          setSelectedConversationId(chat.id)
          setShowMobileSecondaryPanel(false)
          // setActiveTab updates the hash via replaceState (no history entry).
          setActiveTab("chats")
          setModalUserId(null)
        },
      },
    )
  }

  // API Queries & Mutations
  const { data: postsResponse, isLoading: isPostsLoading } = useUserPosts(profile.id)
  const { data: followersResponse, isLoading: isFollowersLoading } = useFollowers(profile.id)
  const { data: followingResponse, isLoading: isFollowingLoading } = useFollowing(profile.id)

  const followMutation = useFollowUser()
  const unfollowMutation = useUnfollowUser()

  // Check if current user follows this profile
  const { data: ownProfile } = useProfile()
  const { data: ownFollowingResponse } = useFollowing("me")
  const ownFollowingList = ownFollowingResponse?.items || []
  // Local optimistic follow overrides (the "me" following query isn't auto-invalidated).
  const [localFollow, setLocalFollow] = useState<Record<string, boolean>>({})
  const isFollowingId = (id: string) =>
    localFollow[id] ?? ownFollowingList.some((u: any) => u.id === id)
  const toggleFollowId = (id: string) => {
    const cur = isFollowingId(id)
    setLocalFollow((s) => ({ ...s, [id]: !cur }))
    if (cur) unfollowMutation.mutate(id)
    else followMutation.mutate(id)
  }

  const isFollowingThisUser = isFollowingId(profile.id)

  const handleFollowToggle = () => toggleFollowId(profile.id)

  const handleSaveBio = () => {
    onUpdateProfile?.({ bio: editedBio })
    setIsEditingBio(false)
  }

  const handleAddInterest = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newInterest.trim()) {
      const updated = [...interests, newInterest.trim()]
      setInterests(updated)
      onUpdateProfile?.({ interests: updated })
      setNewInterest("")
    }
  }

  const handleRemoveInterest = (interest: string) => {
    const updated = interests.filter((i) => i !== interest)
    setInterests(updated)
    onUpdateProfile?.({ interests: updated })
  }

  const bioIsTruncated = profile.bio.length > 150
  const userPosts = postsResponse?.items || []
  const userFollowers = followersResponse?.items || []
  const userFollowing = followingResponse?.items || []

  return (
    <div className="space-y-6 pb-20">
      {/* Cover and Avatar */}
      <div className="relative">
        {/* Cover image */}
        <div className="h-32 md:h-48 bg-muted rounded-xl overflow-hidden relative">
          {profile.coverImage && (
            <img
              src={profile.coverImage}
              alt=""
              className="w-full h-full object-cover"
            />
          )}

          {/* Top Left Navigation Back Button */}
          {onBack && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-3 left-3 h-9 w-9 bg-black/40 hover:bg-black/60 text-white border-0 rounded-full"
              onClick={onBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}

          {/* Top Right Buttons */}
          <div className="absolute top-3 right-3 flex gap-2">
            {profile.isOwnProfile && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1.5 bg-black/40 hover:bg-black/60 text-white border-0"
                >
                  <Camera className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit Cover</span>
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-9 w-9 bg-black/40 hover:bg-black/60 text-white border-0 rounded-full"
                  onClick={() => setActiveTab("settings")}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Avatar */}
        <div className="absolute -bottom-12 left-4 md:left-6">
          <div className="relative">
            <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-background">
              <AvatarImage src={getAvatarUrl(profile.avatar)} />
              <AvatarFallback className="text-2xl">{profile.name.charAt(0)}</AvatarFallback>
            </Avatar>
            {profile.isOwnProfile && (
              <Button
                variant="secondary"
                size="icon"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
              >
                <Camera className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="absolute -bottom-12 right-4 flex gap-2">
          {profile.isOwnProfile ? (
            <Button variant="outline" size="sm" onClick={() => setActiveTab("settings")}>
              <Edit2 className="h-4 w-4 mr-1.5" />
              Edit Profile
            </Button>
          ) : (
            <>
              {onMessage && (
                <Button variant="outline" size="sm" onClick={onMessage}>
                  Message
                </Button>
              )}
              <Button
                size="sm"
                variant={isFollowingThisUser ? "secondary" : "default"}
                onClick={handleFollowToggle}
                disabled={followMutation.isPending || unfollowMutation.isPending}
              >
                {followMutation.isPending || unfollowMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isFollowingThisUser ? (
                  "Unfollow"
                ) : (
                  "Follow"
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Profile info */}
      <div className="pt-14 px-4 md:px-6 space-y-4">
        {/* Name and username */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-foreground">{profile.name}</h1>
            {profile.followers > 10 && (
              <BadgeCheck className="h-5 w-5 text-primary fill-primary/20" />
            )}
          </div>
          <p className="text-muted-foreground">@{profile.username}</p>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          {isEditingBio ? (
            <div className="space-y-2">
              <Textarea
                value={editedBio}
                onChange={(e) => setEditedBio(e.target.value)}
                className="min-h-24 resize-none"
                maxLength={300}
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleSaveBio}>
                  <Check className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditingBio(false)
                    setEditedBio(profile.bio)
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <span className="text-xs text-muted-foreground ml-auto">
                  {editedBio.length}/300
                </span>
              </div>
            </div>
          ) : (
            <div className="relative">
              <p
                className={cn(
                  "text-sm leading-relaxed text-foreground",
                  !bioExpanded && bioIsTruncated && "line-clamp-3"
                )}
              >
                {profile.bio || "No bio yet"}
              </p>
              {bioIsTruncated && (
                <button
                  onClick={() => setBioExpanded(!bioExpanded)}
                  className="text-sm text-primary font-medium mt-1"
                >
                  {bioExpanded ? "Show less" : "Read more"}
                </button>
              )}
              {profile.isOwnProfile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingBio(true)}
                  className="absolute top-0 right-0 h-7 px-2"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {profile.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{profile.location}</span>
            </div>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <LinkIcon className="h-4 w-4" />
              <span>{profile.website.replace(/^https?:\/\//, "")}</span>
            </a>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Joined {formatJoinDate(profile.joinedDate)}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 border-y border-border py-3 mt-4">
          <button className="group text-left" onClick={() => setActiveSubTab("posts")}>
            <span className="font-bold block text-foreground">{formatCount(profile.posts)}</span>
            <span className="text-xs text-muted-foreground group-hover:underline">
              Posts
            </span>
          </button>
          <button className="group text-left" onClick={() => setActiveSubTab("followers")}>
            <span className="font-bold block text-foreground">{formatCount(profile.followers)}</span>
            <span className="text-xs text-muted-foreground group-hover:underline">
              Followers
            </span>
          </button>
          <button className="group text-left" onClick={() => setActiveSubTab("following")}>
            <span className="font-bold block text-foreground">{formatCount(profile.following)}</span>
            <span className="text-xs text-muted-foreground group-hover:underline">
              Following
            </span>
          </button>
        </div>
      </div>

      {/* Interests */}
      <div className="px-4 md:px-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Interests</h2>
          {profile.isOwnProfile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingInterests(!editingInterests)}
            >
              {editingInterests ? "Done" : "Edit"}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {interests.map((interest) => (
              <motion.div
                key={interest}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Badge
                  variant="secondary"
                  className={cn(
                    "px-3 py-1 cursor-default",
                    editingInterests && "pr-1.5"
                  )}
                >
                  {interest}
                  {editingInterests && (
                    <button
                      onClick={() => handleRemoveInterest(interest)}
                      className="ml-1.5 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              </motion.div>
            ))}
          </AnimatePresence>
          {editingInterests && (
            <Input
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyDown={handleAddInterest}
              placeholder="Add interest..."
              className="w-32 h-7 text-sm"
            />
          )}
        </div>
      </div>

      {/* Sub Tabs switcher */}
      <div className="px-4 md:px-6">
        <div className="flex border-b border-border">
          {[
            { id: "posts", label: "Posts" },
            { id: "stories", label: "Stories" },
            { id: "followers", label: "Followers" },
            { id: "following", label: "Following" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={cn(
                "flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-colors cursor-pointer",
                activeSubTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="px-4 md:px-6">
        {activeSubTab === "posts" && (
          <div>
            {isPostsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : userPosts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                No posts yet
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
                {userPosts.map((post: any) => {
                  const hasMedia = post.media && post.media.length > 0
                  return (
                    <button
                      key={post.id}
                      onClick={() => setSelectedPostId(post.id)}
                      className="relative aspect-square overflow-hidden bg-muted group hover:brightness-90 transition-all text-left flex flex-col justify-between"
                    >
                      {hasMedia ? (
                        <>
                          <img
                            src={typeof post.media[0] === "string" ? post.media[0] : post.media[0]?.mediaUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          {post.media.length > 1 && (
                            <span className="absolute top-2 right-2 bg-black/60 text-[10px] text-white px-1.5 py-0.5 rounded">
                              +{post.media.length - 1}
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="p-3 w-full h-full flex flex-col justify-between bg-gradient-to-br from-muted to-muted/50">
                          <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed font-light">
                            {post.content}
                          </p>
                          <span className="text-[10px] text-muted-foreground">Text Post</span>
                        </div>
                      )}
                      
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-opacity text-white font-semibold text-sm">
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
                })}
              </div>
            )}
          </div>
        )}

        {activeSubTab === "stories" && (
          <div>
            {activeStories.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                No active stories
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {activeStories.map((story: any) => (
                  <div
                    key={story.id}
                    className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted border border-border"
                  >
                    {story.mediaType === "video" ? (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground relative">
                        <Video className="h-8 w-8 text-muted-foreground" />
                        <span className="absolute bottom-2 left-2 text-[10px] bg-black/60 px-1 py-0.5 rounded text-white">Video</span>
                      </div>
                    ) : (
                      <img
                        src={story.mediaUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                      <span className="text-[10px] text-white/80 truncate">
                        {story.caption || "Active Story"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSubTab === "followers" && (
          <div>
            {isFollowersLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : userFollowers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No followers yet
              </div>
            ) : (
              <div className="space-y-1">
                {userFollowers.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                    <div
                      className="flex items-center gap-3 cursor-pointer group min-w-0 flex-1"
                      onClick={() => setModalUserId(u.id)}
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={getAvatarUrl(u.avatar)} />
                        <AvatarFallback>{u.name?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground group-hover:underline truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                      </div>
                    </div>
                    {u.id !== ownProfile?.id && (
                      <Button
                        size="sm"
                        variant={isFollowingId(u.id) ? "secondary" : "default"}
                        className="h-8 px-4 font-semibold shrink-0"
                        onClick={() => toggleFollowId(u.id)}
                      >
                        {isFollowingId(u.id) ? "Following" : "Follow"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSubTab === "following" && (
          <div>
            {isFollowingLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : userFollowing.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Not following anyone yet
              </div>
            ) : (
              <div className="space-y-1">
                {userFollowing.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                    <div
                      className="flex items-center gap-3 cursor-pointer group min-w-0 flex-1"
                      onClick={() => setModalUserId(u.id)}
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={getAvatarUrl(u.avatar)} />
                        <AvatarFallback>{u.name?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground group-hover:underline truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                      </div>
                    </div>
                    {u.id !== ownProfile?.id && (
                      <Button
                        size="sm"
                        variant={isFollowingId(u.id) ? "secondary" : "default"}
                        className="h-8 px-4 font-semibold shrink-0"
                        onClick={() => toggleFollowId(u.id)}
                      >
                        {isFollowingId(u.id) ? "Following" : "Follow"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post Detail Modal */}
      <AnimatePresence>
        {(() => {
          const sp = userPosts.find((p: any) => p.id === selectedPostId)
          if (!selectedPostId || !sp) return null
          return (
            <PostDetailModal
              post={{
                id: sp.id,
                content: sp.content,
                mediaUrls: (sp.media || []).map((m: any) => {
                  const url = typeof m === "string" ? m : m.mediaUrl
                  const isVideo =
                    (typeof m === "string" ? "" : (m.mediaType || "")).toLowerCase() === "video" ||
                    /\.(mp4|webm|mov)$/i.test(url || "")
                  return { url, type: isVideo ? "video" : "image" }
                }),
                author: { id: sp.userId, name: sp.userName, avatar: sp.userAvatar },
                createdAt: sp.createdAt,
                likesCount: sp.likesCount || 0,
                commentsCount: sp.commentsCount ?? 0,
                isLiked: !!sp.isLiked,
                isBookmarked: !!sp.isBookmarked,
              }}
              isOwner={!!profile.isOwnProfile}
              onClose={() => setSelectedPostId(null)}
              onViewProfile={(id) => setModalUserId(id)}
            />
          )
        })()}
      </AnimatePresence>

      {/* Instagram-style profile modal (opened from followers/following lists) */}
      <ProfileModal
        userId={modalUserId}
        isOpen={!!modalUserId}
        onClose={() => setModalUserId(null)}
        onMessage={handleModalMessage}
      />
    </div>
  )
}

function formatJoinDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function formatCount(count: number): string {
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`
  return `${(count / 1000000).toFixed(1)}M`
}
