"use client"



import { useState, useCallback, useRef } from "react"
import { AppLayout } from "@/components/ui/app-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StoriesCarousel } from "./stories-carousel"
import { MainFeed } from "./main-feed"
import { ProfileExplorer } from "./profile-explorer"
import type { StoryGroup, Post, UserProfile } from "./types"
import { Loader2, Newspaper } from "lucide-react"

import {
  useFeed,
  useLikePost,
  useUnlikePost,
  useBookmarkPost,
  useUnbookmarkPost,
  useCreateComment,
} from "@/src/api/hooks/useFeed"
import {
  useStories,
  useCreateStory,
  useMarkStoryViewed,
} from "@/src/api/hooks/useStories"
import { useProfile, useUpdateProfile } from "@/src/api/hooks/useProfile"

export function NewsDashboard() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState("feed")
  
  const { data: ownProfile, isLoading: isProfileLoading } = useProfile()
  const { data: storiesResponse, isLoading: isStoriesLoading } = useStories()
  const { data: feedResponse, isLoading: isFeedLoading } = useFeed()

  const likePostMutation = useLikePost()
  const unlikePostMutation = useUnlikePost()
  const bookmarkPostMutation = useBookmarkPost()
  const unbookmarkPostMutation = useUnbookmarkPost()
  const createCommentMutation = useCreateComment()
  const createStoryMutation = useCreateStory()
  const markStoryViewedMutation = useMarkStoryViewed()
  const updateProfileMutation = useUpdateProfile()

  // Map API Profile to UserProfile
  const mappedProfile: UserProfile = {
    id: ownProfile?.id || "current-user",
    name: ownProfile?.name || "User",
    username: ownProfile?.email?.split("@")[0] || "user",
    avatar: ownProfile?.avatar || undefined,
    coverImage: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200",
    bio: ownProfile?.bio || "No bio yet",
    location: "San Francisco, CA",
    website: "",
    joinedDate: ownProfile?.createdAt ? new Date(ownProfile.createdAt) : new Date(),
    followers: 0,
    following: 0,
    posts: 0,
    interests: [],
    photos: [],
    status: ownProfile?.presence || "offline",
    isOwnProfile: true,
  }

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
      duration: 5,
    })),
  }))

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
    media: (post.media || []).map((url, i) => ({
      id: `${post.id}-media-${i}`,
      url,
      type: "image",
    })),
    likes: post.likesCount,
    comments: [], // Comments will be loaded/updated dynamically
    shares: 0,
    liked: post.isLiked,
    bookmarked: post.isBookmarked,
    timestamp: new Date(post.createdAt),
  }))

  const handleStoryViewed = useCallback((storyId: string) => {
    markStoryViewedMutation.mutate(storyId)
  }, [markStoryViewedMutation])

  const handleLoadMore = useCallback(async (): Promise<Post[]> => {
    // React Query handleFeed maintains lists, we can return empty array or paginate if needed.
    return []
  }, [])

  const handleLike = useCallback((postId: string) => {
    const post = feedResponse?.items.find((p) => p.id === postId)
    if (!post) return
    if (post.isLiked) {
      unlikePostMutation.mutate(postId)
    } else {
      likePostMutation.mutate(postId)
    }
  }, [feedResponse, likePostMutation, unlikePostMutation])

  const handleBookmark = useCallback((postId: string) => {
    const post = feedResponse?.items.find((p) => p.id === postId)
    if (!post) return
    if (post.isBookmarked) {
      unbookmarkPostMutation.mutate(postId)
    } else {
      bookmarkPostMutation.mutate(postId)
    }
  }, [feedResponse, bookmarkPostMutation, unbookmarkPostMutation])

  const handleShare = useCallback((postId: string) => {
    // API endpoint for share can be called here
  }, [])

  const handleComment = useCallback((postId: string, content: string) => {
    createCommentMutation.mutate({ postId, content })
  }, [createCommentMutation])

  const handleUpdateProfile = useCallback((updates: Partial<UserProfile>) => {
    updateProfileMutation.mutate({
      name: updates.name,
      bio: updates.bio,
    })
  }, [updateProfileMutation])

  const handleAddStoryClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    createStoryMutation.mutate({
      file,
      privacy: "all",
    })
    // Reset file input value
    if (e.target) e.target.value = ""
  }, [createStoryMutation])

  if (isProfileLoading || isStoriesLoading || isFeedLoading) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading Feed...</span>
      </div>
    )
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
          { id: "profile", label: "My Profile" },
        ]}
        activeFilterId={activeTab}
        onFilterChange={setActiveTab}
      >
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 pb-8 mt-0">
          {activeTab === "feed" && (
            <div>
              {/* Stories */}
              <div className="py-4 border-b border-border/40 dark:border-white/5">
                <StoriesCarousel
                  storyGroups={mappedStoryGroups}
                  onStoryViewed={handleStoryViewed}
                  onAddStory={handleAddStoryClick}
                  currentUserAvatar={mappedProfile.avatar}
                  currentUserName={mappedProfile.name}
                />
              </div>

              {/* Feed */}
              <div className="py-4">
                <MainFeed
                  initialPosts={mappedPosts}
                  onLoadMore={handleLoadMore}
                  onLike={handleLike}
                  onBookmark={handleBookmark}
                  onShare={handleShare}
                  onComment={handleComment}
                />
              </div>
            </div>
          )}

          {activeTab === "explore" && (
            <div className="py-4">
              <h2 className="text-lg font-bold mb-4 text-foreground">Trending Topics</h2>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {["Technology", "Design", "Travel", "Food"].map((topic) => (
                  <button
                    key={topic}
                    className="p-4 bg-card border border-border/50 rounded-xl hover:border-primary/50 transition-colors text-left cursor-pointer"
                  >
                    <p className="font-semibold text-foreground text-sm">{topic}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">5 posts</p>
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
              />
            </div>
          )}

          {activeTab === "profile" && (
            <div className="py-4">
              <ProfileExplorer
                profile={mappedProfile}
                onUpdateProfile={handleUpdateProfile}
              />
            </div>
          )}
        </div>
      </AppLayout>
    </div>
  )
}

