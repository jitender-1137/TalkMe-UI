"use client";

import { useState, useCallback, useRef } from "react";
import { AppLayout } from "@/components/ui/app-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StoriesCarousel } from "./stories-carousel";
import { MainFeed } from "./main-feed";
import { ProfileExplorer } from "./profile-explorer";
import type { StoryGroup, Post, UserProfile } from "./types";
import { Loader2, Newspaper, PlusSquare, RefreshCw } from "lucide-react";
import CreatePostModal from "@/components/news/create-post-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { validateUploadFile } from "@/lib/upload/file-validation";

import {
  useFeed,
  useLikePost,
  useUnlikePost,
  useBookmarkPost,
  useUnbookmarkPost,
  useCreateComment,
} from "@/src/api/hooks/useFeed";
import { useStories, useCreateStory, useMarkStoryViewed, useDeleteStory } from "@/src/api/hooks/useStories";
import { useProfile, useUpdateProfile, useUserById } from "@/src/api/hooks/useProfile";

export function NewsDashboard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("feed");
  const [viewedProfileId, setViewedProfileId] = useState<string | null>(null);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  const { data: ownProfile, isLoading: isProfileLoading } = useProfile();
  const { data: targetProfile, isLoading: isTargetProfileLoading } = useUserById(
    viewedProfileId || "",
  );
  const {
    data: storiesResponse,
    isLoading: isStoriesLoading,
    refetch: refetchStories,
  } = useStories();
  const {
    data: feedResponse,
    isLoading: isFeedLoading,
    refetch: refetchFeed,
    isFetching: isFeedFetching,
  } = useFeed();

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
    commentsCount: post.commentsCount ?? (post.comments?.length ?? 0),
    shares: 0,
    liked: post.isLiked,
    bookmarked: post.isBookmarked,
    timestamp: new Date(post.createdAt),
  }));

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
    (e: React.ChangeEvent<HTMLInputElement>) => {
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

  if (isProfileLoading || isStoriesLoading || isFeedLoading) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading Feed...</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,video/*"
        className="hidden"
      />
      <AppLayout
        title="News"
        icon={Newspaper}
        filterChips={[
          { id: "feed", label: "Feed" },
          { id: "explore", label: "Explore" },
          { id: "profile", label: "Profile" },
        ]}
        activeFilterId={activeTab}
        onFilterChange={setActiveTab}
        collapseFiltersToHeader={true}
        onRefresh={activeTab === "feed" ? handleRefreshFeed : undefined}
        headerRight={
          activeTab === "feed" ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-foreground hover:bg-muted-foreground/10"
                onClick={handleRefreshFeed}
                aria-label="Refresh feed"
              >
                <RefreshCw className={cn("h-5 w-5", isFeedFetching && "animate-spin")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-foreground hover:bg-muted-foreground/10"
                onClick={() => setIsCreatePostOpen(true)}
              >
                <PlusSquare className="h-6 w-6" />
              </Button>
            </div>
          ) : undefined
        }
      >
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 pb-4 mt-0">
          {activeTab === "feed" && (
            <div>
              {/* Stories */}
              <div className="py-4 border-b border-border/40 dark:border-white/5">
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
              <div className="pb-20">
                <MainFeed
                  initialPosts={mappedPosts}
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
              </div>
            </div>
          )}

          {activeTab === "explore" && (
            <div className="pb-20">
              <h2 className="text-lg font-bold mb-4 text-foreground">Trending Topics</h2>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {["Technology", "Design", "Travel", "Food"].map((topic) => (
                  <button
                    key={topic}
                    className="p-4 bg-card border border-border/50 rounded-xl hover:border-primary/50 transition-colors text-left cursor-pointer"
                  >
                    <p className="font-semibold text-foreground text-sm">{topic}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">5 posts</p>
                  </button>
                ))}
              </div>

              <h2 className="text-lg font-bold mb-4 text-foreground">Suggested Posts</h2>
              <MainFeed
                initialPosts={mappedPosts}
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
            </div>
          )}

          {activeTab === "profile" && (
            <div className="pb-20">
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
      </AppLayout>
      <CreatePostModal isOpen={isCreatePostOpen} onClose={() => setIsCreatePostOpen(false)} />
    </div>
  );
}
