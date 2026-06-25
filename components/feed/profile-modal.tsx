"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useScrollRestore } from "@/lib/navigation/scroll-restore";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  Loader2,
  UserPlus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn, getAvatarUrl } from "@/lib/utils";
import { getMediaUrl } from "@/src/api/client";
import { useProfile, useUserById } from "@/src/api/hooks/useProfile";
import { useUserPosts } from "@/src/api/hooks/useFeed";
import { useStories } from "@/src/api/hooks/useStories";
import { useFollowing, useFollowUser, useUnfollowUser } from "@/src/api/hooks/useFollow";
import { PostDetailModal } from "./post-detail-modal";
import { FollowListModal, type FollowListTab } from "./follow-list-modal";
import { useUrlModal } from "@/lib/navigation/use-url-modal";

interface ProfileModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  /** Open / create a chat with the given user. */
  onMessage: (userId: string) => void;
}

/** Instagram-style profile card shown over the feed. */
export function ProfileModal({ userId, isOpen, onClose, onMessage }: ProfileModalProps) {
  // Allow drilling into other users without leaving the modal.
  const [viewUserId, setViewUserId] = useState<string | null>(userId);
  const [tab, setTab] = useState<"posts" | "tagged">("posts");
  const [followTab, setFollowTab] = useState<FollowListTab | null>(null);
  // Local optimistic follow overrides (the "me" following query isn't auto-invalidated).
  const [localFollow, setLocalFollow] = useState<Record<string, boolean>>({});
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // Preserve scroll per viewed user (drilling into another profile starts fresh).
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollRestore(scrollRef, `modal:profile:${viewUserId ?? "none"}`, {
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen) {
      setViewUserId(userId);
      setTab("posts");
      setFollowTab(null);
      setLocalFollow({});
      setSelectedPostId(null);
    }
  }, [isOpen, userId]);

  // This modal registers itself as a back-stack overlay (own URL segment) so it
  // nests under whatever opened it (e.g. a follow list → `…/follow/user/<id>`).
  const zIndex = useUrlModal(isOpen, onClose, `user/${userId ?? ""}`);
  // The post-detail overlay stacks above this modal.
  const postZ = useUrlModal(
    !!selectedPostId,
    () => setSelectedPostId(null),
    `post/${selectedPostId ?? ""}`,
  );

  const { data: ownProfile } = useProfile();
  const { data: user, isLoading } = useUserById(viewUserId || "");
  const { data: postsResponse, isLoading: isPostsLoading } = useUserPosts(viewUserId || "");
  const { data: storiesResponse } = useStories();
  const { data: ownFollowing } = useFollowing("me");

  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  const isOwnProfile = !!viewUserId && viewUserId === ownProfile?.id;
  const followingIds = useMemo(
    () => new Set((ownFollowing?.items || []).map((u: any) => u.id)),
    [ownFollowing],
  );
  const isFollowingUser = (id?: string | null) =>
    id ? (localFollow[id] ?? followingIds.has(id)) : false;

  const toggleFollow = (id?: string | null) => {
    if (!id) return;
    const cur = isFollowingUser(id);
    setLocalFollow((s) => ({ ...s, [id]: !cur }));
    if (cur) unfollowMutation.mutate(id);
    else followMutation.mutate(id);
  };

  const posts = postsResponse?.items || [];

  // Story highlights — the viewed user's active stories.
  const highlights = useMemo(() => {
    const group = (storiesResponse?.items || []).find((g: any) => g.userId === viewUserId);
    return group?.stories || [];
  }, [storiesResponse, viewUserId]);

  const goToUser = (id: string) => {
    setViewUserId(id);
    setFollowTab(null);
    setTab("posts");
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Full-screen panel (same width treatment as the other news modals) */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="fixed inset-0 bg-background flex flex-col overflow-hidden"
            style={{
              zIndex,
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <>
              {/* Top bar */}
              <div className="h-14 shrink-0 flex items-center gap-3 px-3 border-b border-border/60 w-full max-w-2xl mx-auto">
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
              <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
                <div className="w-full max-w-2xl mx-auto">
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
                            onClick={() => setFollowTab("followers")}
                          />
                          <Stat
                            value={user.followingCount ?? 0}
                            label="following"
                            onClick={() => setFollowTab("following")}
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
                            <div
                              key={story.id}
                              className="flex flex-col items-center gap-1 shrink-0 w-16"
                            >
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
              </div>
            </>

            {/* Followers / Following */}
            <FollowListModal
              userId={viewUserId}
              username={user?.username}
              followersCount={user?.followersCount}
              followingCount={user?.followingCount}
              isOpen={!!followTab}
              initialTab={followTab ?? "followers"}
              onClose={() => setFollowTab(null)}
              onSelectUser={goToUser}
            />
          </motion.div>

          {/* Post detail. Stacks above this profile modal via its overlay z. */}
          {(() => {
            const sp = posts.find((p: any) => p.id === selectedPostId);
            if (!selectedPostId || !sp) return null;
            return (
              <div className="relative" style={{ zIndex: postZ }}>
                <PostDetailModal
                  post={{
                    id: sp.id,
                    content: sp.content,
                    mediaUrls: (sp.media || [])
                      .map((m: any) => {
                        const raw = typeof m === "string" ? m : m.mediaUrl;
                        const url = getMediaUrl(raw) || "";
                        const isVideo =
                          (typeof m === "string" ? "" : m.mediaType || "").toLowerCase() ===
                            "video" || /\.(mp4|webm|mov)$/i.test(raw || "");
                        return { url, type: (isVideo ? "video" : "image") as "video" | "image" };
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
            );
          })()}
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}

/* ── Small pieces ──────────────────────────────────────────────────────────── */
function PostCell({ post, onClick }: { post: any; onClick?: () => void }) {
  const first = post.media?.[0];
  const url = first
    ? typeof first === "string"
      ? getMediaUrl(first)
      : getMediaUrl(first.mediaUrl)
    : undefined;
  const isVideo =
    first &&
    (typeof first === "string"
      ? /\.(mp4|webm|mov)$/i.test(first)
      : (first.mediaType || "").toLowerCase() === "video");

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative aspect-square bg-muted overflow-hidden group cursor-pointer text-left border-4 border-border/50 hover:border-border/80 transition-all rounded-2xl"
    >
      {url ? (
        isVideo ? (
          <video
            src={`${url}#t=0.1`}
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
        ) : (
          <img src={url} alt="" className="w-full h-full object-cover" />
        )
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
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-sm font-semibold border-4 rounded-2xl">
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
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
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
  );
}

function Stat({ value, label, onClick }: { value: number; label: string; onClick?: () => void }) {
  const content = (
    <>
      <span className="font-bold text-base leading-tight">{formatCount(value)}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </>
  );
  if (onClick) {
    return (
      <button onClick={onClick} className="flex flex-col items-center">
        {content}
      </button>
    );
  }
  return <div className="flex flex-col items-center">{content}</div>;
}

function formatCount(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${(count / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
}
