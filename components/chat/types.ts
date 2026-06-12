export type MessageStatus = "sending" | "sent" | "delivered" | "seen"

export type MessageType = "text" | "image" | "video" | "audio" | "document" | "sticker"

export type PresenceActivity = "online" | "typing" | "recording" | "offline"

export interface Reaction {
  emoji: string
  count: number
  users: string[]
  hasReacted: boolean
}

export interface ReplyTo {
  id: string
  senderName: string
  content: string
  type: MessageType
}

export interface MediaAttachment {
  type: "image" | "video" | "document" | "audio" | "sticker"

  url: string
  thumbnail?: string
  fileName?: string
  fileSize?: string
  duration?: number
  width?: number
  height?: number
}

export interface PendingAttachment {
  file: File
  type: "image" | "video" | "document" | "audio"
  previewUrl?: string
}

export interface Message {
  id: string
  content: string
  time: string
  timestamp: number
  isSent: boolean
  senderName?: string
  senderAvatar?: string
  status: MessageStatus
  type: MessageType
  reactions?: Reaction[]
  replyTo?: ReplyTo
  media?: MediaAttachment
  isDeleted?: boolean
}

export interface ChatContact {
  id: string
  name: string
  avatar?: string
  gender?: string | null
  activity: PresenceActivity
  lastSeen?: string
  isFriend?: boolean
  isBlockedByMe?: boolean
  hasBlockedMe?: boolean
}
