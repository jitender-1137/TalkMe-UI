"use client"

import type { PresenceStatus } from "@/lib/presence"

export interface Story {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  mediaUrl: string
  mediaType: "image" | "video"
  timestamp: Date
  viewed: boolean
  duration?: number // in seconds, default 5
}

export interface StoryGroup {
  userId: string
  userName: string
  userAvatar?: string
  stories: Story[]
  hasUnviewed: boolean
}

export interface PostAuthor {
  id: string
  name: string
  username: string
  avatar?: string
  verified?: boolean
  status: PresenceStatus
}

export interface PostMedia {
  id: string
  url: string
  type: "image" | "video"
  aspectRatio?: number
  thumbnail?: string
}

export interface PostComment {
  id: string
  author: PostAuthor
  content: string
  timestamp: Date
  likes: number
  liked: boolean
}

export interface Post {
  id: string
  author: PostAuthor
  content: string
  media: PostMedia[]
  likes: number
  comments: PostComment[]
  shares: number
  liked: boolean
  bookmarked: boolean
  timestamp: Date
}

export interface UserProfile {
  id: string
  name: string
  username: string
  avatar?: string
  coverImage?: string
  bio: string
  location?: string
  website?: string
  joinedDate: Date
  followers: number
  following: number
  posts: number
  interests: string[]
  photos: string[]
  status: PresenceStatus
  isOwnProfile?: boolean
}
