"use client"

import { useFeed } from "@/src/api/hooks/useFeed"
import PostCard from "./post-card"
import { Loader2 } from "lucide-react"

import SuggestedSidebar from "./suggested-sidebar"
import StoriesTray from "./stories-tray"
import FeedHeader from "./feed-header"

export default function NewsDashboard() {
  const { data: feedData, isLoading, error } = useFeed()

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-black text-zinc-400">
        <p>Failed to load feed. Please try again later.</p>
      </div>
    )
  }

  const posts = feedData?.items || []

  return (
    <div className="flex h-full flex-col bg-black overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+96px)] md:pb-6">
      <FeedHeader />
      
      <div className="mx-auto flex w-full max-w-[820px] justify-center pt-8">
        
        {/* Main Feed Column */}
        <div className="w-full max-w-[470px] shrink-0">
          <StoriesTray />
          
          <div className="mt-6">
            {posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 rounded-full border-2 border-zinc-800 p-4">
                  <svg
                    className="h-8 w-8 text-zinc-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-zinc-100">Welcome to TalkMe</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  When you follow people, you'll see the photos and videos they post here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post: any) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar (Desktop Only) */}
        <div className="hidden lg:block lg:w-[320px] shrink-0 pl-16">
          <SuggestedSidebar />
        </div>
        
      </div>
    </div>
  )
}
