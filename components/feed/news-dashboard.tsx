"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { StoriesCarousel } from "./stories-carousel";
import { MainFeed } from "./main-feed";
import { ProfileExplorer } from "./profile-explorer";
import { ExploreDiscover } from "./explore-discover";
import { NewsHeader, NewsTabs } from "./news-header";
import type { StoryGroup, Post, UserProfile } from "./types";
import { Loader2, Plus, Newspaper, Compass, User, Search, X } from "lucide-react";
import CreatePostModal from "@/components/news/create-post-modal";
import { cn } from "@/lib/utils";
import { useScrollRestore } from "@/lib/navigation/scroll-restore";
import { toast } from "sonner";
import { validateUploadFile, validateVideoDuration } from "@/lib/upload/file-validation";

import {
  useFeed,
  useLikePost,
  useUnlikePost,
  useBookmarkPost,
  useUnbookmarkPost,
  useCreateComment,
} from "@/src/api/hooks/useFeed";
import {
  useStories,
  useCreateStory,
  useMarkStoryViewed,
  useDeleteStory,
} from "@/src/api/hooks/useStories";
import { useProfile, useUpdateProfile, useUserById } from "@/src/api/hooks/useProfile";
import { useUrlSubtab } from "@/lib/navigation/use-url-subtab";
import { useUrlModal } from "@/lib/navigation/use-url-modal";
import { parseHash } from "@/lib/navigation/url-hash";

const NEWS_SUBTABS = ["feed", "explore", "profile"] as const;
const SUBTAB_STORAGE_KEY = "news:last-subtab";

export function NewsDashboard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Subtab lives in the URL as #news/<subtab> (replaceState — Back doesn't cycle).
  const [activeTab, setActiveTab] = useUrlSubtab("news", NEWS_SUBTABS, "feed");

  // Captured once at first render: did the URL deep-link a specific subtab?
  // A deep link (#news/explore) wins over the remembered subtab.
  const [deepLinkedSubtab] = useState<(typeof NEWS_SUBTABS)[number] | null>(() => {
    if (typeof window === "undefined") return null;
    const { tab, segments } = parseHash(window.location.hash);
    const seg = segments[0] as (typeof NEWS_SUBTABS)[number] | undefined;
    return tab === "news" && seg && NEWS_SUBTABS.includes(seg) ? seg : null;
  });
  const [viewedProfileId, setViewedProfileId] = useState<string | null>(null);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Scroll container + pull-to-refresh (mobile).
  const scrollRef = useRef<HTMLDivElement>(null);
  // Preserve scroll across tab switches + lock the background while a modal is open.
  useScrollRestore(scrollRef, "tab:news", { lockWhenOverlay: true });
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Horizontal swipe to change subtab (mobile).
  const swipeStart = useRef<{ x: number; y: number; inScroller: boolean } | null>(null);

  // Create-post modal gets its own URL (#news/<subtab>/create) and Back closes it.
  useUrlModal(isCreatePostOpen, () => setIsCreatePostOpen(false), "create");

  const { data: ownProfile, isLoading: isProfileLoading } = useProfile();
  const { data: targetProfile, isLoading: isTargetProfileLoading } = useUserById(
    viewedProfileId || "",
  );
  const {
    data: storiesResponse,
    isLoading: isStoriesLoading,
    refetch: refetchStories,
  } = useStories();
  const { data: feedResponse, isLoading: isFeedLoading, refetch: refetchFeed } = useFeed();

  const likePostMutation = useLikePost();
  const unlikePostMutation = useUnlikePost();
  const bookmarkPostMutation = useBookmarkPost();
  const unbookmarkPostMutation = useUnbookmarkPost();
  const createCommentMutation = useCreateComment();
  const createStoryMutation = useCreateStory();
  const markStoryViewedMutation = useMarkStoryViewed();
  const deleteStoryMutation = useDeleteStory();
  const updateProfileMutation = useUpdateProfile();

  // Map API Profile to UserProfile
  const mappedProfile: UserProfile = {
    id: ownProfile?.id || "current-user",
    name: ownProfile?.name || "User",
    username: ownProfile?.email?.split("@")[0] || "user",
    avatar: ownProfile?.avatar || undefined,
    coverImage: "",
    bio: ownProfile?.bio || "",
    location:
      ownProfile?.city && ownProfile?.country
        ? `${ownProfile.city}, ${ownProfile.country}`
        : ownProfile?.country || ownProfile?.city || "",
    website: "",
    joinedDate: ownProfile?.createdAt ? new Date(ownProfile.createdAt) : new Date(),
    followers: ownProfile?.followersCount || 0,
    following: ownProfile?.followingCount || 0,
    posts: ownProfile?.postsCount || 0,
    interests: ownProfile?.interests || [],
    photos: [],
    status: ownProfile?.presence || "offline",
    isOwnProfile: true,
  };

  // Map API Target Profile to UserProfile
  const mappedTargetProfile: UserProfile | null = targetProfile
    ? {
        id: targetProfile.id,
        name: targetProfile.name,
        username: targetProfile.username || targetProfile.email?.split("@")[0] || "user",
        avatar: targetProfile.avatar || undefined,
        coverImage: "",
        bio: targetProfile.bio || "",
        location:
          targetProfile.city && targetProfile.country
            ? `${targetProfile.city}, ${targetProfile.country}`
            : targetProfile.country || targetProfile.city || "",
        website: "",
        joinedDate: targetProfile.createdAt ? new Date(targetProfile.createdAt) : new Date(),
        followers: targetProfile.followersCount || 0,
        following: targetProfile.followingCount || 0,
        posts: targetProfile.postsCount || 0,
        interests: targetProfile.interests || [],
        photos: [],
        status: targetProfile.presence || "offline",
        isOwnProfile: false,
      }
    : null;

  // Map API Stories to components' StoryGroup[]
  const mappedStoryGroups: StoryGroup[] = (storiesResponse?.items || []).map((group) => ({
    userId: group.userId,
    userName: group.userName,
    userAvatar: group.userAvatar || undefined,
    hasUnviewed: group.hasUnviewed,
    stories: (group.stories || []).map((story) => ({
      id: story.id,
      userId: story.userId,
      userName: story.userName,
      userAvatar: story.userAvatar || undefined,
      mediaUrl: story.mediaUrl,
      mediaType: story.mediaType,
      timestamp: new Date(story.createdAt),
      viewed: story.viewed,
      duration: 10,
    })),
  }));

  // Map API Posts to components' Post[]
  const mappedPosts: Post[] = (feedResponse?.items || []).map((post) => ({
    id: post.id,
    author: {
      id: post.userId,
      name: post.userName,
      username: post.userName.toLowerCase().replace(/\s+/g, ""),
      avatar: post.userAvatar || undefined,
      verified: false,
      status: "online",
    },
    content: post.content,
    media: (post.media || []).map((m: any, i) => ({
      id: m.id || `${post.id}-media-${i}`,
      url: typeof m === "string" ? m : m.mediaUrl,
      type:
        typeof m === "string"
          ? m.endsWith(".mp4") || m.endsWith(".webm")
            ? "video"
            : "image"
          : (m.mediaType || "IMAGE").toLowerCase() === "video"
            ? "video"
            : "image",
    })),
    likes: post.likesCount,
    comments: [], // Comments will be loaded/updated dynamically
    commentsCount: post.commentsCount ?? post.comments?.length ?? 0,
    shares: 0,
    liked: post.isLiked,
    bookmarked: post.isBookmarked,
    timestamp: new Date(post.createdAt),
    shortCode: (post as any).shortCode,
  }));

  // Client-side feed search: match caption or author name.
  const query = searchQuery.trim().toLowerCase();
  const filteredPosts: Post[] = query
    ? mappedPosts.filter(
        (p) =>
          p.content?.toLowerCase().includes(query) ||
          p.author.name.toLowerCase().includes(query) ||
          p.author.username.toLowerCase().includes(query),
      )
    : mappedPosts;

  const handleStoryViewed = useCallback(
    (storyId: string) => {
      markStoryViewedMutation.mutate(storyId);
    },
    [markStoryViewedMutation],
  );

  const handleDeleteStory = useCallback(
    (storyId: string) => {
      deleteStoryMutation.mutate(storyId);
    },
    [deleteStoryMutation],
  );

  const handleLoadMore = useCallback(async (): Promise<Post[]> => {
    // React Query handleFeed maintains lists, we can return empty array or paginate if needed.
    return [];
  }, []);

  const handleLike = useCallback(
    (postId: string) => {
      const post = feedResponse?.items.find((p) => p.id === postId);
      if (!post) return;
      if (post.isLiked) {
        unlikePostMutation.mutate(postId);
      } else {
        likePostMutation.mutate(postId);
      }
    },
    [feedResponse, likePostMutation, unlikePostMutation],
  );

  const handleBookmark = useCallback(
    (postId: string) => {
      const post = feedResponse?.items.find((p) => p.id === postId);
      if (!post) return;
      if (post.isBookmarked) {
        unbookmarkPostMutation.mutate(postId);
      } else {
        bookmarkPostMutation.mutate(postId);
      }
    },
    [feedResponse, bookmarkPostMutation, unbookmarkPostMutation],
  );

  const handleShare = useCallback((postId: string) => {
    // API endpoint for share can be called here
  }, []);

  const handleComment = useCallback(
    (postId: string, content: string) => {
      createCommentMutation.mutate({ postId, content });
    },
    [createCommentMutation],
  );

  const handleUpdateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      updateProfileMutation.mutate({
        name: updates.name,
        bio: updates.bio,
      });
    },
    [updateProfileMutation],
  );

  const handleAddStoryClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Always reset the input so picking the same file again re-fires onChange.
      if (e.target) e.target.value = "";
      if (!file) return;

      // Validate size/type on the client first — do NOT call the uploads API for
      // a file that the server would reject anyway.
      const result = validateUploadFile(file, ["image", "video"]);
      if (!result.ok) {
        toast.error("Can't upload this file", { description: result.message });
        return;
      }
      // Story videos follow the same 90-second cap as post videos.
      const duration = await validateVideoDuration(file);
      if (!duration.ok) {
        toast.error("Can't upload this video", { description: duration.message });
        return;
      }

      createStoryMutation.mutate({
        file,
        privacy: "all",
      });
    },
    [createStoryMutation],
  );

  const handleRefreshFeed = useCallback(async () => {
    await Promise.all([refetchFeed(), refetchStories()]);
  }, [refetchFeed, refetchStories]);

  // Pull-to-refresh: rubber-band the scroll container at the top.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const PULL_THRESHOLD = 70;
    let startY: number | null = null;
    let distance = 0;

    const onTouchStart = (e: TouchEvent) => {
      startY = el.scrollTop <= 0 && !isRefreshing ? e.touches[0].clientY : null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (startY == null || isRefreshing) return;
      const delta = e.touches[0].clientY - startY;
      if (delta > 0 && el.scrollTop <= 0) {
        distance = Math.min(delta * 0.5, 90);
        setPullDistance(distance);
        if (e.cancelable) e.preventDefault();
      } else if (distance !== 0) {
        distance = 0;
        setPullDistance(0);
      }
    };
    const onTouchEnd = async () => {
      if (startY == null) return;
      startY = null;
      if (distance >= PULL_THRESHOLD && !isRefreshing) {
        setPullDistance(0);
        distance = 0;
        setIsRefreshing(true);
        try {
          await handleRefreshFeed();
        } finally {
          setIsRefreshing(false);
        }
      } else {
        distance = 0;
        setPullDistance(0);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [handleRefreshFeed, isRefreshing]);

  const handleSearchToggle = useCallback(() => {
    setSearchOpen((open) => {
      if (open) setSearchQuery("");
      return !open;
    });
  }, []);

  // Restore the last-used subtab when re-entering News (e.g. after visiting
  // Chats/Connect) — unless the URL explicitly deep-links one. The dashboard
  // unmounts on tab switch, so the choice is persisted in sessionStorage.
  useEffect(() => {
    if (deepLinkedSubtab) return;
    try {
      const saved = sessionStorage.getItem(SUBTAB_STORAGE_KEY) as
        | (typeof NEWS_SUBTABS)[number]
        | null;
      if (saved && NEWS_SUBTABS.includes(saved) && saved !== activeTab) {
        setActiveTab(saved);
      }
    } catch {
      /* sessionStorage unavailable (private mode) — fall back to default */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Remember the active subtab across tab switches / reloads.
  useEffect(() => {
    try {
      sessionStorage.setItem(SUBTAB_STORAGE_KEY, activeTab);
    } catch {
      /* ignore */
    }
  }, [activeTab]);

  // ── Swipe to switch subtab (mobile) ────────────────────────────────────────
  // Walk up from the touch target; if the gesture began inside a horizontally
  // scrollable element (stories tray, media carousel), let it scroll instead.
  const startedInHScroller = (target: EventTarget | null) => {
    let node = target as HTMLElement | null;
    while (node && node !== scrollRef.current) {
      const ox = getComputedStyle(node).overflowX;
      if ((ox === "auto" || ox === "scroll") && node.scrollWidth > node.clientWidth + 4) {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  };

  const handleSwipeStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) {
      swipeStart.current = null;
      return;
    }
    const t = e.touches[0];
    swipeStart.current = {
      x: t.clientX,
      y: t.clientY,
      inScroller: startedInHScroller(e.target),
    };
  };

  const handleSwipeEnd = (e: React.TouchEvent) => {
    const s = swipeStart.current;
    swipeStart.current = null;
    if (!s || s.inScroller || isEditingDisabled()) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    // Require a clear horizontal intent.
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const idx = NEWS_SUBTABS.indexOf(activeTab as (typeof NEWS_SUBTABS)[number]);
    if (dx < 0 && idx < NEWS_SUBTABS.length - 1) setActiveTab(NEWS_SUBTABS[idx + 1]);
    else if (dx > 0 && idx > 0) setActiveTab(NEWS_SUBTABS[idx - 1]);
  };

  // Don't steal swipes from text inputs / textareas (e.g. editing a bio).
  const isEditingDisabled = () => {
    const el = typeof document !== "undefined" ? document.activeElement : null;
    const tag = el?.tagName;
    return tag === "INPUT" || tag === "TEXTAREA";
  };

  const NEWS_TABS = [
    { id: "feed", label: "Feed", icon: Newspaper },
    { id: "explore", label: "Explore", icon: Compass },
    { id: "profile", label: "Profile", icon: User },
  ];

  if (isProfileLoading || isStoriesLoading || isFeedLoading) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading Feed...</span>
      </div>
    );
  }

  const isFeed = activeTab === "feed";

  return (
    <div className="relative h-full w-full flex flex-col overflow-hidden bg-background">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,video/*"
        className="hidden"
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
        {/* Header + subtabs stay pinned (sticky) while the content scrolls. */}
        <div className="sticky top-0 z-30 bg-background border-b border-border/40 dark:border-white/5">
          <NewsHeader
            subtitle={
              activeTab === "feed"
                ? "Stay updated with stories and moments from your world."
                : activeTab === "explore"
                  ? "Discover new people, topics and trending posts."
                  : "Your posts, stories and the people you follow."
            }
            searchOpen={isFeed && searchOpen}
            onSearchToggle={handleSearchToggle}
          />

          {/* Subtabs — out of the header, with the search bar opening below them */}
          <div className="max-w-2xl mx-auto w-full px-3 md:px-1 pt-2 pb-3">
          <NewsTabs
            tabs={NEWS_TABS}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as (typeof NEWS_SUBTABS)[number])}
          />
          {isFeed && searchOpen && (
            <div className="mt-3 flex items-center h-11 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 px-4 focus-within:border-primary/40">
              <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts and people..."
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none border-none p-0"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="p-0.5 rounded-full hover:bg-muted-foreground/20 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          )}
          </div>
        </div>

        {/* Pull-to-refresh indicator */}
        {(pullDistance > 0 || isRefreshing) && (
          <div
            className="flex items-center justify-center overflow-hidden shrink-0 transition-[height] duration-150"
            style={{ height: isRefreshing ? 44 : pullDistance }}
          >
            <Loader2
              className={cn("h-5 w-5 text-primary", isRefreshing && "animate-spin")}
              style={{
                opacity: isRefreshing ? 1 : Math.min(pullDistance / 70, 1),
                transform: isRefreshing ? undefined : `rotate(${(pullDistance / 70) * 270}deg)`,
              }}
            />
          </div>
        )}

        <div
          onTouchStart={handleSwipeStart}
          onTouchEnd={handleSwipeEnd}
          className="max-w-2xl mx-auto w-full px-3 md:px-1 pb-[calc(env(safe-area-inset-bottom)+96px)] md:pb-6"
        >
          {isFeed && (
            <div>
              {/* Stories */}
              <div className="border-b border-border/40 dark:border-white/5">
                <StoriesCarousel
                  storyGroups={mappedStoryGroups}
                  onStoryViewed={handleStoryViewed}
                  onAddStory={handleAddStoryClick}
                  onDeleteStory={handleDeleteStory}
                  currentUserAvatar={mappedProfile.avatar}
                  currentUserName={mappedProfile.name}
                  currentUserId={ownProfile?.id}
                />
              </div>

              {/* Feed */}
              <div className="pt-0">
                {searchQuery.trim() && filteredPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <p className="text-base font-semibold text-foreground">No results</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Nothing matches &ldquo;{searchQuery.trim()}&rdquo;
                    </p>
                  </div>
                ) : (
                  <MainFeed
                    initialPosts={filteredPosts}
                    onLoadMore={handleLoadMore}
                    onLike={handleLike}
                    onBookmark={handleBookmark}
                    onShare={handleShare}
                    onComment={handleComment}
                    onAuthorClick={(authorId) => {
                      setViewedProfileId(authorId);
                      setActiveTab("profile");
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {activeTab === "explore" && (
            <div className="pt-4">
              <ExploreDiscover
                onViewProfile={(authorId) => {
                  setViewedProfileId(authorId);
                  setActiveTab("profile");
                }}
              />
            </div>
          )}

          {activeTab === "profile" && (
            <div className="pt-0">
              {viewedProfileId && isTargetProfileLoading ? (
                <div className="flex flex-col justify-center items-center py-20 gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Loading Profile...</span>
                </div>
              ) : viewedProfileId && mappedTargetProfile ? (
                <ProfileExplorer
                  profile={mappedTargetProfile}
                  onBack={() => setViewedProfileId(null)}
                  onViewProfile={(userId) => setViewedProfileId(userId)}
                  activeStories={
                    mappedStoryGroups.find((g) => g.userId === viewedProfileId)?.stories || []
                  }
                />
              ) : (
                <ProfileExplorer
                  profile={mappedProfile}
                  onUpdateProfile={handleUpdateProfile}
                  onViewProfile={(userId) => setViewedProfileId(userId)}
                  activeStories={
                    mappedStoryGroups.find((g) => g.userId === ownProfile?.id)?.stories || []
                  }
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating create-post button (feed only) */}
      {isFeed && (
        <button
          onClick={() => setIsCreatePostOpen(true)}
          aria-label="Create post"
          className="absolute right-4 bottom-[calc(env(safe-area-inset-bottom)+96px)] md:bottom-6 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="h-7 w-7" />
        </button>
      )}

      <CreatePostModal isOpen={isCreatePostOpen} onClose={() => setIsCreatePostOpen(false)} />
    </div>
  );
}
