"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  MapPin,
  Link as LinkIcon,
  Calendar,
  Edit2,
  Check,
  X,
  BadgeCheck,
  ArrowLeft,
  Loader2,
  Heart,
  MessageCircle,
  Bookmark,
  Send,
  Video,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn, getAvatarUrl } from "@/lib/utils";
import type { UserProfile } from "./types";
import { useNavigation } from "@/components/app-shell/navigation-context";
import { useUrlModal } from "@/lib/navigation/use-url-modal";
import { useUserPosts } from "@/src/api/hooks/useFeed";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFollowing, useFollowUser, useUnfollowUser } from "@/src/api/hooks/useFollow";
import { ProfileModal } from "./profile-modal";
import { FollowListModal, type FollowListTab } from "./follow-list-modal";
import { PostDetailModal } from "./post-detail-modal";
import { useOpenOrCreateChat } from "@/src/api/hooks/useChats";
import { useChatContext } from "@/components/chat/chat-context";

interface ProfileExplorerProps {
  profile: UserProfile;
  onUpdateProfile?: (updates: Partial<UserProfile>) => void;
  onMessage?: () => void;
  onBack?: () => void;
  onViewProfile?: (userId: string) => void;
  activeStories?: any[];
}

export function ProfileExplorer({
  profile,
  onUpdateProfile,
  onMessage,
  onBack,
  onViewProfile,
  activeStories = [],
}: ProfileExplorerProps) {
  const { activeTab } = useNavigation();
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editedBio, setEditedBio] = useState(profile.bio);
  const [bioExpanded, setBioExpanded] = useState(false);

  const [activeSubTab, setActiveSubTab] = useState<"posts" | "stories">("posts");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  // Open another user's profile in the Instagram-style modal (followers/following).
  const [modalUserId, setModalUserId] = useState<string | null>(null);
  // Followers / Following list modal.
  const [followModalTab, setFollowModalTab] = useState<FollowListTab | null>(null);

  // The post-detail overlay registers a back-stack entry here; the follow-list
  // and profile modals self-register inside their own components (so a profile
  // opened FROM the follow list nests under it: …/follow/user/<id>).
  useUrlModal(!!selectedPostId, () => setSelectedPostId(null), `post/${selectedPostId ?? ""}`);

  const openOrCreateChat = useOpenOrCreateChat();
  const { setSelectedConversationId, setShowMobileSecondaryPanel, setChatReturnTab } =
    useChatContext();

  const handleModalMessage = async (targetId: string) => {
    if (!targetId) return;
    try {
      // Reuse an existing 1:1 chat if these two users already have one.
      const chat = await openOrCreateChat(targetId);
      // Keep the profile modal OPEN and open the conversation nested under it
      // (#news/explore/user/<id>/messages) so Back returns to the profile, then the feed.
      // chatReturnTab records the origin root for the close handler.
      setChatReturnTab(activeTab);
      setSelectedConversationId(chat.id);
      setShowMobileSecondaryPanel(false);
    } catch {
      /* createChat surfaces its own error toast */
    }
  };

  // API Queries & Mutations
  const { data: postsResponse, isLoading: isPostsLoading } = useUserPosts(profile.id);

  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  // Check if current user follows this profile
  const { data: ownFollowingResponse } = useFollowing("me");
  const ownFollowingList = ownFollowingResponse?.items || [];
  // Local optimistic follow overrides (the "me" following query isn't auto-invalidated).
  const [localFollow, setLocalFollow] = useState<Record<string, boolean>>({});
  const isFollowingId = (id: string) =>
    localFollow[id] ?? ownFollowingList.some((u: any) => u.id === id);
  const toggleFollowId = (id: string) => {
    const cur = isFollowingId(id);
    setLocalFollow((s) => ({ ...s, [id]: !cur }));
    if (cur) unfollowMutation.mutate(id);
    else followMutation.mutate(id);
  };

  const isFollowingThisUser = isFollowingId(profile.id);

  const handleFollowToggle = () => toggleFollowId(profile.id);

  const handleSaveBio = () => {
    onUpdateProfile?.({ bio: editedBio });
    setIsEditingBio(false);
  };

  const bioIsTruncated = profile.bio.length > 150;
  const userPosts = postsResponse?.items || [];

  return (
    <div className="space-y-6 pb-20">
      {/* Profile header — avatar + actions */}
      <div className="px-4 md:px-6 pt-2">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 mb-3 h-9 w-9 rounded-full"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex gap-4">
          <Avatar className="h-20 w-20 md:h-24 md:w-24 ring-4 ring-primary/20 shrink-0">
            <AvatarImage src={getAvatarUrl(profile.avatar)} />
            <AvatarFallback className="text-2xl">{profile.name.charAt(0)}</AvatarFallback>
          </Avatar>

          {/* Identity beside the avatar (Instagram / Snapchat style) */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent truncate">
                {profile.name}
              </h1>
              {profile.followers > 10 && (
                <BadgeCheck className="h-5 w-5 text-primary fill-primary/20 shrink-0" />
              )}
            </div>
            <p className="text-sm font-medium text-foreground/80 truncate">@{profile.username}</p>
            {profile.location && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-foreground px-2.5 py-0.5 text-xs font-medium">
                <MapPin className="h-3 w-3" />
                {profile.location}
              </span>
            )}

            {/* Bio — the only editable field */}
            {isEditingBio ? (
              <div className="space-y-2 pt-1">
                <Textarea
                  value={editedBio}
                  onChange={(e) => setEditedBio(e.target.value)}
                  className="min-h-20 resize-none"
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
                      setIsEditingBio(false);
                      setEditedBio(profile.bio);
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
              <div className="pt-0.5">
                <p
                  className={cn(
                    "text-sm leading-relaxed text-foreground inline align-middle",
                    !bioExpanded && bioIsTruncated && "line-clamp-3",
                  )}
                >
                  {profile.bio || "No bio yet"}
                </p>
                {profile.isOwnProfile && (
                  <button
                    onClick={() => setIsEditingBio(true)}
                    aria-label="Edit bio"
                    className="ml-1.5 inline-flex items-center align-middle text-primary hover:opacity-80 cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                )}
                {bioIsTruncated && (
                  <button
                    onClick={() => setBioExpanded(!bioExpanded)}
                    className="block text-sm text-primary font-medium mt-1 cursor-pointer"
                  >
                    {bioExpanded ? "Show less" : "Read more"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Message / Follow (other users only) */}
        {!profile.isOwnProfile && (
          <div className="flex gap-2 mt-4">
            {onMessage && (
              <Button variant="outline" size="sm" className="flex-1" onClick={onMessage}>
                Message
              </Button>
            )}
            <Button
              size="sm"
              className="flex-1"
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
          </div>
        )}
      </div>

      {/* Profile info */}
      <div className="px-4 md:px-6 space-y-4">
        {/* Meta info */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
        <div className="flex items-center justify-around rounded-2xl border border-border/60 bg-card/50 py-3 px-2 mt-4">
          <button
            className="group flex flex-col items-center px-3"
            onClick={() => setActiveSubTab("posts")}
          >
            <span className="font-bold text-lg text-foreground">{formatCount(profile.posts)}</span>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              Posts
            </span>
          </button>
          <span className="h-8 w-px bg-border" />
          <button
            className="group flex flex-col items-center px-3"
            onClick={() => setFollowModalTab("followers")}
          >
            <span className="font-bold text-lg text-foreground">
              {formatCount(profile.followers)}
            </span>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              Followers
            </span>
          </button>
          <span className="h-8 w-px bg-border" />
          <button
            className="group flex flex-col items-center px-3"
            onClick={() => setFollowModalTab("following")}
          >
            <span className="font-bold text-lg text-foreground">
              {formatCount(profile.following)}
            </span>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              Following
            </span>
          </button>
        </div>
      </div>

      {/* Sub Tabs switcher */}
      <div className="px-4 md:px-6">
        <div className="flex border-b border-border">
          {[
            { id: "posts", label: "Posts" },
            { id: "stories", label: "Stories" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={cn(
                "flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-colors cursor-pointer",
                activeSubTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
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
                  const hasMedia = post.media && post.media.length > 0;
                  const first = post.media?.[0];
                  const firstUrl = typeof first === "string" ? first : first?.mediaUrl;
                  const firstIsVideo =
                    typeof first === "string"
                      ? /\.(mp4|webm|mov)$/i.test(first)
                      : (first?.mediaType || "").toLowerCase() === "video";
                  return (
                    <button
                      key={post.id}
                      onClick={() => setSelectedPostId(post.id)}
                      className="relative aspect-square overflow-hidden bg-muted group hover:brightness-90 transition-all text-left flex flex-col justify-between border-4 border-border/50 hover:border-border/80 rounded-2xl"
                    >
                      {hasMedia ? (
                        <>
                          {firstIsVideo ? (
                            <video
                              src={`${firstUrl}#t=0.1`}
                              muted
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img src={firstUrl} alt="" className="w-full h-full object-cover" />
                          )}
                          {firstIsVideo && (
                            <Video className="absolute top-2 right-2 h-4 w-4 text-white fill-white drop-shadow" />
                          )}
                          {post.media.length > 1 && !firstIsVideo && (
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
                  );
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
                        <span className="absolute bottom-2 left-2 text-[10px] bg-black/60 px-1 py-0.5 rounded text-white">
                          Video
                        </span>
                      </div>
                    ) : (
                      <img src={story.mediaUrl} alt="" className="w-full h-full object-cover" />
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
      </div>

      {/* Post Detail Modal */}
      <AnimatePresence>
        {(() => {
          const sp = userPosts.find((p: any) => p.id === selectedPostId);
          if (!selectedPostId || !sp) return null;
          return (
            <PostDetailModal
              post={{
                id: sp.id,
                content: sp.content,
                mediaUrls: (sp.media || []).map((m: any) => {
                  const url = typeof m === "string" ? m : m.mediaUrl;
                  const isVideo =
                    (typeof m === "string" ? "" : m.mediaType || "").toLowerCase() === "video" ||
                    /\.(mp4|webm|mov)$/i.test(url || "");
                  return { url, type: isVideo ? "video" : "image" };
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
          );
        })()}
      </AnimatePresence>

      {/* Instagram-style profile modal (opened from followers/following lists) */}
      <ProfileModal
        userId={modalUserId}
        isOpen={!!modalUserId}
        onClose={() => setModalUserId(null)}
        onMessage={handleModalMessage}
      />

      {/* Followers / Following */}
      <FollowListModal
        userId={profile.id}
        username={profile.username}
        followersCount={profile.followers}
        followingCount={profile.following}
        isOpen={!!followModalTab}
        initialTab={followModalTab ?? "followers"}
        onClose={() => setFollowModalTab(null)}
        onSelectUser={(id) => setModalUserId(id)}
      />
    </div>
  );
}

function formatJoinDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatCount(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
}
