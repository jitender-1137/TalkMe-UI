"use client"

import { useState, useRef } from "react"
import { useLikePost, useUnlikePost, useBookmarkPost, useUnbookmarkPost } from "@/src/api/hooks/useFeed"
import type { Post } from "@/src/api/types/social.types"
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Smile } from "lucide-react"
import { formatDistanceToNowStrict } from "date-fns"

interface PostCardProps {
  post: Post
}

export default function PostCard({ post }: PostCardProps) {
  const [isLikedLocally, setIsLikedLocally] = useState(post.isLiked)
  const [likeCountLocally, setLikeCountLocally] = useState(post.likesCount)
  const [isBookmarkedLocally, setIsBookmarkedLocally] = useState(post.isBookmarked)
  const [showHeartAnim, setShowHeartAnim] = useState(false)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  
  const carouselRef = useRef<HTMLDivElement>(null)

  const likePostMutation = useLikePost()
  const unlikePostMutation = useUnlikePost()
  const bookmarkMutation = useBookmarkPost()
  const unbookmarkMutation = useUnbookmarkPost()

  const handleToggleLike = () => {
    if (isLikedLocally) {
      setIsLikedLocally(false)
      setLikeCountLocally((prev: number) => Math.max(0, prev - 1))
      unlikePostMutation.mutate(post.id)
    } else {
      setIsLikedLocally(true)
      setLikeCountLocally((prev: number) => prev + 1)
      likePostMutation.mutate(post.id)
    }
  }
  
  const handleDoubleTapLike = () => {
    if (!isLikedLocally) {
      setIsLikedLocally(true)
      setLikeCountLocally((prev: number) => prev + 1)
      likePostMutation.mutate(post.id)
    }
    // Trigger animation even if already liked
    setShowHeartAnim(true)
    setTimeout(() => setShowHeartAnim(false), 1000)
  }

  const handleToggleBookmark = () => {
    if (isBookmarkedLocally) {
      setIsBookmarkedLocally(false)
      unbookmarkMutation.mutate(post.id)
    } else {
      setIsBookmarkedLocally(true)
      bookmarkMutation.mutate(post.id)
    }
  }

  const handleScroll = () => {
    if (carouselRef.current) {
      const scrollLeft = carouselRef.current.scrollLeft
      const width = carouselRef.current.clientWidth
      const newIndex = Math.round(scrollLeft / width)
      setCurrentMediaIndex(newIndex)
    }
  }

  const formatTime = (dateString: string) => {
    try {
      const dist = formatDistanceToNowStrict(new Date(dateString))
      return dist
        .replace(' seconds', 's')
        .replace(' second', 's')
        .replace(' minutes', 'm')
        .replace(' minute', 'm')
        .replace(' hours', 'h')
        .replace(' hour', 'h')
        .replace(' days', 'd')
        .replace(' day', 'd')
        .replace(' months', 'mo')
        .replace(' month', 'mo')
        .replace(' years', 'y')
        .replace(' year', 'y')
    } catch {
      return '1d'
    }
  }

  return (
    <article className="border-b border-zinc-800 pb-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-0 py-3">
        <div className="flex items-center space-x-3 cursor-pointer">
          <div className="h-8 w-8 overflow-hidden rounded-full bg-zinc-800 border border-zinc-800">
            {post.userAvatar ? (
              <img src={post.userAvatar} alt={post.userName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-orange-500 to-fuchsia-600 text-white font-medium text-xs">
                {post.userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <h3 className="text-sm font-semibold text-zinc-100 hover:text-zinc-300">{post.userName}</h3>
            <span className="text-sm text-zinc-500">•</span>
            <span className="text-sm text-zinc-500">{formatTime(post.createdAt)}</span>
          </div>
        </div>
        <button className="text-zinc-100 hover:text-zinc-400 transition-colors">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Media */}
      <div className="relative rounded-[3px] border border-zinc-800 overflow-hidden bg-zinc-950 flex items-center justify-center group select-none">
        {post.media && post.media.length > 0 ? (
          <div 
            ref={carouselRef}
            onScroll={handleScroll}
            className="flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide aspect-square sm:aspect-[4/5]"
            onDoubleClick={handleDoubleTapLike}
          >
            {post.media.map((item, idx) => {
              const url = typeof item === "string" ? item : item.mediaUrl
              const isVideo = typeof item === "string"
                ? (item.endsWith(".mp4") || item.endsWith(".webm"))
                : (item.mediaType?.toUpperCase() === "VIDEO")
              return (
                <div key={idx} className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center">
                  {isVideo ? (
                    <video 
                      src={url} 
                      className="h-full w-full object-cover"
                      controls={false}
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    <img 
                      src={url} 
                      alt={`Post content ${idx + 1}`} 
                      className="h-full w-full object-cover" 
                      draggable={false}
                    />
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="w-full aspect-square flex items-center justify-center bg-zinc-900" onDoubleClick={handleDoubleTapLike}>
            <p className="text-zinc-500 italic">No media available</p>
          </div>
        )}
        
        {/* Heart Animation Overlay */}
        {showHeartAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <Heart 
              className="h-24 w-24 text-white drop-shadow-lg animate-[ping_0.5s_cubic-bezier(0,0,0.2,1)_forwards]" 
              fill="white" 
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-0 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleToggleLike}
              className="transition-transform active:scale-90"
            >
              <Heart 
                className={`h-[26px] w-[26px] ${isLikedLocally ? 'text-red-500' : 'text-zinc-100 hover:text-zinc-400'}`} 
                fill={isLikedLocally ? "currentColor" : "none"} 
              />
            </button>
            <button className="text-zinc-100 hover:text-zinc-400 transition-colors">
              <MessageCircle className="h-[26px] w-[26px] -scale-x-100" />
            </button>
            <button className="text-zinc-100 hover:text-zinc-400 transition-colors">
              <Send className="h-[26px] w-[26px]" />
            </button>
          </div>
          
          {/* Pagination Dots */}
          {post.media && post.media.length > 1 && (
            <div className="flex items-center space-x-1 absolute left-1/2 -translate-x-1/2">
              {post.media.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`rounded-full transition-all ${idx === currentMediaIndex ? 'h-[6px] w-[6px] bg-blue-500' : 'h-[6px] w-[6px] bg-zinc-600'}`}
                />
              ))}
            </div>
          )}

          <button 
            onClick={handleToggleBookmark}
            className="transition-transform active:scale-90"
          >
            <Bookmark 
              className={`h-[26px] w-[26px] ${isBookmarkedLocally ? 'text-zinc-100' : 'text-zinc-100 hover:text-zinc-400'}`} 
              fill={isBookmarkedLocally ? "currentColor" : "none"} 
            />
          </button>
        </div>

        {/* Likes */}
        {likeCountLocally > 0 && (
          <div className="mb-1 text-[14px] font-semibold text-zinc-100">
            {likeCountLocally.toLocaleString()} likes
          </div>
        )}

        {/* Caption */}
        {post.content && (
          <div className="text-[14px] leading-tight">
            <span className="font-semibold text-zinc-100 mr-2 cursor-pointer hover:text-zinc-300">{post.userName}</span>
            <span className="text-zinc-100 whitespace-pre-wrap">{post.content}</span>
          </div>
        )}

        {/* Comments Link */}
        {post.commentsCount > 0 && (
          <button className="mt-1 text-[14px] text-zinc-500 hover:text-zinc-400 cursor-pointer text-left w-full">
            View all {post.commentsCount} comments
          </button>
        )}
        
        {/* Inline Comment Input */}
        <div className="mt-2 flex items-center justify-between group">
          <input 
            type="text" 
            placeholder="Add a comment..." 
            className="flex-1 bg-transparent text-[14px] text-zinc-100 outline-none placeholder:text-zinc-500"
          />
          <div className="flex items-center space-x-2">
            <button className="text-[14px] font-semibold text-blue-500 hover:text-blue-400 hidden group-focus-within:block opacity-0 group-focus-within:opacity-100 transition-opacity">
              Post
            </button>
            <button className="text-zinc-500 hover:text-zinc-400">
              <Smile className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
