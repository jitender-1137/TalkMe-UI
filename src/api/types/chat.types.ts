import type { User } from "./user.types"

export type ChatType = "direct" | "group"

// ── Conversation / Chat ───────────────────────────────────────────────────────
export interface Chat {
  id: string
  name: string | null
  avatar: string | null
  lastMessage: LastMessage | null
  unreadCount: number
  
  // Optional legacy fields
  type?: ChatType
  participants?: User[]
  isPinned?: boolean
  isArchived?: boolean
  isMuted?: boolean
  mutedUntil?: string | null
  createdAt?: string
  updatedAt?: string

  // Actual Backend DTO fields
  chatType?: "DIRECT" | "GROUP"
  otherUser?: User | null
  typingUsers?: string[]
  archived?: boolean
  muted?: boolean
  pinned?: boolean
  isFriend?: boolean
  isBlockedByMe?: boolean
  hasBlockedMe?: boolean
}

export interface LastMessage {
  id: string
  content: string
  senderId: string
  senderName: string
  type: string
  timestamp: string
  isDeleted: boolean
  /** Delivery status of the last message (sent/delivered/seen) — used to show a
   *  tick in the chat list for messages the current user sent. */
  status?: string
}

// ── Group ─────────────────────────────────────────────────────────────────────
export interface Group {
  id: string
  name: string
  description: string | null
  avatar: string | null
  inviteLink: string | null
  ownerId: string
  members: GroupMember[]
  memberCount: number
  createdAt: string
  updatedAt: string
}

export interface GroupMember {
  userId: string
  name: string
  avatar: string | null
  role: "owner" | "admin" | "member"
  joinedAt: string
}

// ── Payloads ──────────────────────────────────────────────────────────────────
export interface CreateChatPayload {
  participantId: string
}

export interface CreateGroupPayload {
  name: string
  description?: string
  participantIds: string[]
}

export interface UpdateGroupPayload {
  name?: string
  description?: string
  avatar?: string
}

export interface MuteChatPayload {
  duration: number | null // null = mute forever, seconds otherwise
}

export interface AddGroupMemberPayload {
  userId: string
}

// ── Contact ───────────────────────────────────────────────────────────────────
export interface Contact {
  id: string
  userId: string
  name: string
  username?: string
  avatar: string | null
  phone: string | null
  email?: string | null
  isBlocked: boolean
  addedAt: string
  presence?: import("./user.types").PresenceStatus
  lastSeen?: string | null
  gender?: string | null
}

export interface FriendRequestSender {
  id: string
  name: string
  email?: string | null
  username: string
  avatar: string | null
  age?: number | null
  gender?: string | null
  createdAt?: string | null
  country?: string | null
  city?: string | null
  mobileNumber?: string | null
  interests?: string[] | null
  guest?: boolean | null
  verified?: boolean | null
}

export interface FriendRequest {
  id: string
  sender: FriendRequestSender
  status: string
  createdAt?: string
}

