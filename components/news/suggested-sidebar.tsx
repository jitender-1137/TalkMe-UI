"use client"

import { PlusSquare } from "lucide-react"
import { useProfile } from "@/src/api/hooks/useProfile"

export default function SuggestedSidebar() {
  const { data: profile } = useProfile()
  
  const suggestedUsers = [
    { id: "1", username: "tech_guru", name: "Tech Guru", reason: "Followed by mike_smith", avatar: "https://i.pravatar.cc/150?u=tech" },
    { id: "2", username: "design_inspo", name: "Design Inspiration", reason: "Suggested for you", avatar: "https://i.pravatar.cc/150?u=design" },
    { id: "3", username: "travel.diaries", name: "Travel Explorer", reason: "New to TalkMe", avatar: "https://i.pravatar.cc/150?u=travel" },
  ]

  return (
    <div className="w-full pt-8">
      {/* Current User */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3 cursor-pointer">
          <div className="h-11 w-11 overflow-hidden rounded-full bg-zinc-800">
            {profile?.avatar ? (
              <img src={profile.avatar} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-orange-500/20 text-orange-500 font-medium">
                {profile?.name?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">{profile?.username || "loading..."}</h3>
            <p className="text-sm text-zinc-500">{profile?.name || ""}</p>
          </div>
        </div>
        <button className="text-xs font-semibold text-blue-500 hover:text-blue-400 transition-colors">
          Switch
        </button>
      </div>

      {/* Suggested Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-zinc-400">Suggested for you</span>
        <button className="text-xs font-semibold text-zinc-100 hover:text-zinc-300 transition-colors">
          See All
        </button>
      </div>

      {/* Suggested List */}
      <div className="space-y-4">
        {suggestedUsers.map((user) => (
          <div key={user.id} className="flex items-center justify-between">
            <div className="flex items-center space-x-3 cursor-pointer">
              <div className="h-8 w-8 overflow-hidden rounded-full bg-zinc-800">
                <img src={user.avatar} alt={user.username} className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-zinc-100 hover:underline">{user.username}</span>
                <span className="text-xs text-zinc-500 max-w-[140px] truncate">{user.reason}</span>
              </div>
            </div>
            <button className="text-xs font-semibold text-blue-500 hover:text-blue-400 transition-colors">
              Follow
            </button>
          </div>
        ))}
      </div>
      
      {/* Footer Links */}
      <div className="mt-8">
        <p className="text-xs text-zinc-600 leading-relaxed">
          About • Help • Press • API • Jobs • Privacy • Terms • Locations • Language
        </p>
        <p className="mt-4 text-xs text-zinc-600">
          © 2026 TALKME FROM AI
        </p>
      </div>
    </div>
  )
}
