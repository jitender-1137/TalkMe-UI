"use client"

import { useQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"

// Mock hook since stories aren't fully integrated yet
function useStories() {
  return useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      // Return some dummy stories to match UI requirements
      return [
        { id: "1", username: "alex_designs", hasUnseen: true, avatar: "https://i.pravatar.cc/150?u=alex" },
        { id: "2", username: "sarah.codes", hasUnseen: true, avatar: "https://i.pravatar.cc/150?u=sarah" },
        { id: "3", username: "mike_smith", hasUnseen: true, avatar: "https://i.pravatar.cc/150?u=mike" },
        { id: "4", username: "emma.watson", hasUnseen: false, avatar: "https://i.pravatar.cc/150?u=emma" },
        { id: "5", username: "chris.p.bacon", hasUnseen: false, avatar: "https://i.pravatar.cc/150?u=chris" },
        { id: "6", username: "jessica.k", hasUnseen: false, avatar: "https://i.pravatar.cc/150?u=jessica" },
      ]
    }
  })
}

export default function StoriesTray() {
  const { data: stories = [] } = useStories()

  return (
    <div className="flex w-full space-x-4 overflow-x-auto py-4 scrollbar-hide">
      {/* Current User "Add Story" */}
      <div className="flex flex-col items-center flex-shrink-0 cursor-pointer">
        <div className="relative">
          <div className="h-16 w-16 overflow-hidden rounded-full border border-zinc-800 bg-zinc-900 p-[2px]">
            <div className="h-full w-full overflow-hidden rounded-full bg-zinc-800">
              <img src="https://i.pravatar.cc/150?u=me" alt="Your story" className="h-full w-full object-cover" />
            </div>
          </div>
          <div className="absolute bottom-0 right-0 rounded-full border-2 border-black bg-blue-500 p-0.5">
            <Plus className="h-3 w-3 text-white" strokeWidth={3} />
          </div>
        </div>
        <span className="mt-1 text-xs text-zinc-400">Your story</span>
      </div>

      {/* Friends Stories */}
      {stories.map((story) => (
        <div key={story.id} className="flex flex-col items-center flex-shrink-0 cursor-pointer">
          <div className={`h-16 w-16 rounded-full p-[2px] ${story.hasUnseen ? 'bg-gradient-to-tr from-yellow-400 via-orange-500 to-fuchsia-600' : 'bg-zinc-800'}`}>
            <div className="h-full w-full overflow-hidden rounded-full border-2 border-black bg-zinc-900">
              <img src={story.avatar} alt={story.username} className="h-full w-full object-cover" />
            </div>
          </div>
          <span className="mt-1 text-xs text-zinc-100 max-w-[74px] truncate">{story.username}</span>
        </div>
      ))}
    </div>
  )
}
