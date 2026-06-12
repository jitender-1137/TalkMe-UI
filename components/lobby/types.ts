"use client"

export interface ChatUser {
  id: string
  username: string
  name?: string
  age: number
  gender: "MALE" | "FEMALE"
  country: string
  countryFlag: string
  avatar: string
  online: boolean
}

export interface ChatMessage {
  id: string
  senderId: string
  receiverId: string
  content: string
  createdAt: string
  read: boolean
  timestamp: number // helper for sorting local storage chats
}

export interface Conversation {
  id: string
  user: ChatUser
  unreadCount: number
  lastMessage: string
  lastTimestamp: number
}
