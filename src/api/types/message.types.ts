export type MessageStatus = "uploading" | "sending" | "sent" | "delivered" | "seen" | "failed" | "blocked"
export type ModerationStatus = "CLEAN" | "BLOCKED_PENDING_CONSENT" | "RELEASED"
export type MessageType = "text" | "image" | "video" | "audio" | "document" | "sticker" | "system"

// ── Media attachment ──────────────────────────────────────────────────────────
export interface MediaAttachment {
  type: "image" | "video" | "document" | "audio"
  url: string
  thumbnail?: string
  fileName?: string
  fileSize?: string
  mimeType?: string
  duration?: number
  width?: number
  height?: number
}

// ── Reaction ──────────────────────────────────────────────────────────────────
export interface Reaction {
  emoji: string
  count: number
  users: string[]
  hasReacted: boolean
}

// ── Reply reference ───────────────────────────────────────────────────────────
export interface ReplyTo {
  id: string
  senderName: string
  content: string
  type: MessageType
  /** Thumbnail/preview URL when the parent is media (image/video/sticker). */
  mediaUrl?: string
}

// ── Read receipt ──────────────────────────────────────────────────────────────
export interface ReadReceipt {
  userId: string
  name: string
  readAt: string
}

// ── Core message ──────────────────────────────────────────────────────────────
export interface Message {
  id: string
  /** Client idempotency key, echoed by the server so the sender's own
   *  WebSocket broadcast dedups against the optimistic row. */
  clientId?: string
  chatId: string
  senderId: string
  senderName: string
  senderAvatar: string | null
  content: string
  type: MessageType
  status: MessageStatus
  reactions: Reaction[]
  replyTo: ReplyTo | null
  media: MediaAttachment | null
  readReceipts: ReadReceipt[]
  isDeleted: boolean
  isEdited: boolean
  isPinned: boolean
  isForwarded: boolean
  timestamp: string
  editedAt: string | null
  deletedAt: string | null
  moderationStatus?: ModerationStatus
}

// ── Send / Edit payloads ──────────────────────────────────────────────────────
export interface SendMessagePayload {
  content: string
  /** Client-generated idempotency key (UUID). Set in onMutate so a retried
   *  send is deduped server-side instead of creating a duplicate. */
  clientId?: string
  type?: MessageType
  replyToId?: string
  media?: {
    url: string
    type: MediaAttachment["type"]
    fileName?: string
    fileSize?: string
    mimeType?: string
    duration?: number
    width?: number
    height?: number
  }
  /**
   * Optimistic-first media send: when set, onMutate renders the bubble IMMEDIATELY
   * using `localPreviewUrl` (a blob URL) with an "uploading" status, and the mutation
   * uploads `localFile` in the background before posting. The composer is cleared up
   * front, independent of the upload/network response. Stripped before the API call.
   */
  localFile?: File
  localPreviewUrl?: string
}

export interface EditMessagePayload {
  content: string
}

export interface ReactToMessagePayload {
  emoji: string
}

export interface ForwardMessagePayload {
  targetChatIds: string[]
}

// ── Typing indicator ──────────────────────────────────────────────────────────
export interface TypingIndicator {
  userId: string
  name: string
  chatId: string
  isTyping: boolean
}

// ── Notification ──────────────────────────────────────────────────────────────
export interface Notification {
  id: string
  type: "message" | "reaction" | "mention" | "group_invite" | "contact_request"
  title: string
  body: string
  data: Record<string, string>
  isRead: boolean
  createdAt: string
}

export interface NotificationSettings {
  push: boolean
  email: boolean
  sms: boolean
  messagePreview: boolean
  groupNotifications: boolean
  mentionNotifications: boolean
  reactionNotifications: boolean
  sound: boolean
  vibration: boolean
}
