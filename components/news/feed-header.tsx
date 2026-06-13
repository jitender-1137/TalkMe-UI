"use client"

import { Heart, PlusSquare } from "lucide-react"
import { useCreatePost } from "@/components/providers"

export default function FeedHeader() {
  const { openCreatePost } = useCreatePost()

  return (
    <div className="flex h-14 items-center justify-between border-b border-zinc-800 px-4 shrink-0 bg-black sticky top-0 z-10">
      <h1 className="text-xl font-semibold italic text-white" style={{ fontFamily: 'Georgia, serif' }}>
        TalkMe
      </h1>
      <div className="flex items-center space-x-4">
        <button 
          onClick={openCreatePost}
          className="text-zinc-100 hover:text-zinc-400 transition-all duration-200 active:scale-95"
          title="Create Post"
        >
          <PlusSquare className="h-6 w-6" />
        </button>
        <button className="text-zinc-100 hover:text-zinc-400 transition-all duration-200 active:scale-95">
          <Heart className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}
