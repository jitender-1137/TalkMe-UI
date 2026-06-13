"use client"

export type MatchStatus = "idle" | "searching" | "matched" | "disconnected"

export type Gender = "any" | "male" | "female" | "other"

export interface MatchFilters {
  ageRange: [number, number]
  gender: Gender
  interests: string[]
  region: string
}

export interface Stranger {
  id: string
  anonymousName: string
  interests: string[]
  region?: string
  isTyping?: boolean
  isRecording?: boolean
}

export interface StrangerMessage {
  id: string
  content: string
  timestamp: number
  time: string
  isFromStranger: boolean
  isRevealed?: boolean
  media?: {
    type: "image" | "video"
    url: string
    thumbnail?: string
    isBlurred: boolean
  }
}
