import type { User } from "./user.types"

// ── Status / Stories ────────────────────────────────────────────────────────
export interface Story {
  id: string
  userId: string
  userName: string
  userAvatar: string | null
  mediaUrl: string
  mediaType: "image" | "video"
  caption?: string
  viewsCount: number
  viewed: boolean
  createdAt: string
  expiresAt: string
}

export interface StoryGroup {
  userId: string
  userName: string
  userAvatar: string | null
  stories: Story[]
  hasUnviewed: boolean
}

export interface StoryViewer {
  user: User
  viewedAt: string
  reaction?: string
}

// ── Feed / Posts ────────────────────────────────────────────────────────────
export interface Post {
  id: string
  userId: string
  userName: string
  userAvatar: string | null
  content: string
  media: string[]
  likesCount: number
  commentsCount: number
  isLiked: boolean
  isBookmarked: boolean
  createdAt: string
}

export interface Comment {
  id: string
  postId: string
  userId: string
  userName: string
  userAvatar: string | null
  content: string
  createdAt: string
}

export interface CreatePostPayload {
  content: string
  media?: string[]
}

// ── Discover ────────────────────────────────────────────────────────────────
export interface DiscoverProfile {
  id: string
  name: string
  username: string
  bio?: string | null
  location?: string | null
  city?: string | null
  country?: string | null
  mutualFriends?: number
  sharedInterests?: string[]
  allInterests?: string[]
  reason?: "mutual" | "interest" | "nearby"
  isLiked?: boolean
  avatar?: string | null

  // Backend DTO fields
  age?: number
  gender?: string | null
  distance?: string
  distanceKm?: number
  occupation?: string | null
  education?: string | null
  interests?: string[]
  images?: string[]
  isVerified?: boolean
  isOnline?: boolean
  isFriend?: boolean
  mutualFriendsCount?: number
  isRequestSent?: boolean
  pendingRequestId?: string
}

export interface SuggestedPerson {
  id: string
  name: string
  username: string
  bio?: string | null
  location?: string | null
  mutualFriends?: number
  sharedInterests?: string[]
  allInterests?: string[]
  reason?: "mutual" | "interest" | "nearby"
  avatar?: string | null

  // Backend DTO fields
  age?: number
  gender?: string | null
  distance?: string
  distanceKm?: number
  occupation?: string | null
  education?: string | null
  interests?: string[]
  images?: string[]
  isVerified?: boolean
  isOnline?: boolean
  isLiked?: boolean
  isFriend?: boolean
  mutualFriendsCount?: number
}

// ── Match ───────────────────────────────────────────────────────────────────
export interface MatchFilters {
  ageRange: [number, number]
  gender: "any" | "male" | "female"
  interests: string[]
  region: string
}

export interface MatchSession {
  sessionId: string
  queuePosition?: number
}

export interface Stranger {
  id: string
  name: string
  age: number
  gender: string
  interests: string[]
  region: string
  avatar?: string | null
}

export interface StrangerMessage {
  id: string
  sessionId: string
  senderId: string
  content: string
  media?: {
    type: "image" | "video"
    url: string
    thumbnail?: string
    isBlurred: boolean
  }
  timestamp: string
}
