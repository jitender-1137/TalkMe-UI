import Dexie, { type Table } from "dexie";
import type { Chat, Message } from "./types";

export interface LocalChat {
  chatId: string; // primary key
  id: string; // UI compatibility alias
  chatType: "DIRECT" | "GROUP";
  name: string | null;
  avatar: string | null;
  lastMessageId?: string;
  lastMessagePreview?: string;
  unreadCount: number;
  updatedAt: string;

  // Extra fields for UI compatibility
  otherUser?: any;
  participants?: any[];
  pinned?: boolean;
  archived?: boolean;
  muted?: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
  isFriend?: boolean;
  isBlockedByMe?: boolean;
  hasBlockedMe?: boolean;
  lastMessage?: any;
}

export interface LocalMessage {
  messageId: string; // primary key
  id: string; // UI compatibility alias
  /**
   * Stable client-generated id that survives the optimistic→confirmed swap.
   * The optimistic row and the real (server) row share the same clientId so the
   * UI can use it as a stable React key — the bubble is reused (not remounted)
   * when the temp message is replaced, so its slide-in animation plays once.
   */
  clientId?: string;
  chatId: string;
  senderId: string;
  sequenceNumber: number;
  content: string;
  messageType: string;
  status: string; // SENDING, SENT, DELIVERED, READ
  createdAt: string;
  editedAt?: string;
  deleted: number; // 0 or 1
  mediaId?: string;

  // Extra fields for UI compatibility
  senderName?: string;
  senderAvatar?: string;
  reactions?: any[];
  attachments?: any[];
  parentMessage?: any;
  replyTo?: any;
  isDeleted?: boolean;
}

export interface LocalMedia {
  mediaId: string; // primary key
  messageId: string;
  chatId: string;
  mediaType: string;
  mimeType: string;
  size: number;
  fileName: string;
  blob: Blob;
  thumbnailBlob?: Blob;
  downloadedAt: string;
}

export interface LocalSyncState {
  chatId: string; // primary key
  lastSequenceNumber: number;
  lastSyncTimestamp: number;
}

export interface LocalUser {
  userId: string; // primary key
  username: string;
  avatar?: string;
  lastSeen?: string;
}

class TalkMeDatabase extends Dexie {
  chats!: Table<LocalChat, string>;
  messages!: Table<LocalMessage, string>;
  media!: Table<LocalMedia, string>;
  sync_state!: Table<LocalSyncState, string>;
  users!: Table<LocalUser, string>;
  lobby_store!: Table<{ key: string; value: string }, string>;

  constructor() {
    super("TalkMeDatabase");
    this.version(1).stores({
      chats: "chatId, updatedAt",
      messages: "messageId, chatId, sequenceNumber, createdAt, [chatId+sequenceNumber]",
      media: "mediaId, chatId, messageId",
      sync_state: "chatId",
      users: "userId, username"
    });
    this.version(2).stores({
      chats: "chatId, updatedAt",
      messages: "messageId, chatId, sequenceNumber, createdAt, [chatId+sequenceNumber]",
      media: "mediaId, chatId, messageId",
      sync_state: "chatId",
      users: "userId, username",
      lobby_store: "key"
    });
  }
}

export const db = new TalkMeDatabase();

export function normalizeMessageStatus(status: string): string {
  if (!status) return "sent";
  const s = status.toLowerCase();
  if (s === "read" || s === "seen") return "seen";
  if (s === "delivered") return "delivered";
  if (s === "sent") return "sent";
  if (s === "sending") return "sending";
  return s;
}

/**
 * Maps a message API response object to our local message database schema
 */
export function mapResponseToLocalMessage(chatId: string, m: any): LocalMessage {
  const isDeleted = m.isDeleted || m.content === "This message was deleted" || false;
  
  // Resolve mediaId if message has attachments
  let mediaId: string | undefined;
  if (m.attachments && m.attachments.length > 0) {
    mediaId = m.attachments[0].id || m.attachments[0].uuid;
  }

  return {
    messageId: m.id,
    id: m.id, // alias
    clientId: m.clientId, // preserved so optimistic↔real share a stable UI key
    chatId: chatId,
    senderId: m.senderId,
    sequenceNumber: m.sequenceNumber || 0,
    content: m.content || "",
    messageType: m.messageType || m.type || "TEXT",
    status: normalizeMessageStatus(m.status),
    createdAt: m.createdAt || m.timestamp || new Date().toISOString(),
    editedAt: m.isEdited ? new Date().toISOString() : undefined,
    deleted: isDeleted ? 1 : 0,
    mediaId: mediaId,

    // Extra fields for UI compatibility
    senderName: m.senderName,
    senderAvatar: m.senderAvatar,
    reactions: m.reactions || [],
    attachments: m.attachments || [],
    parentMessage: m.parentMessage || null,
    replyTo: m.replyTo || null,
    isDeleted: isDeleted
  };
}

/**
 * Maps a chat API response object to our local chat database schema
 */
export function mapResponseToLocalChat(c: any): LocalChat {
  const lastMsg = c.lastMessage;
  return {
    chatId: c.id,
    id: c.id, // alias
    chatType: c.chatType || c.type || "DIRECT",
    name: c.name,
    avatar: c.avatar,
    lastMessageId: lastMsg?.id,
    lastMessagePreview: lastMsg?.content,
    unreadCount: c.unreadCount || 0,
    updatedAt: c.updatedAt || lastMsg?.timestamp || lastMsg?.createdAt || new Date().toISOString(),

    // Extra fields for UI compatibility
    otherUser: c.otherUser || null,
    participants: c.participants || [],
    pinned: c.pinned || c.isPinned || false,
    archived: c.archived || c.isArchived || false,
    muted: c.muted || c.isMuted || false,
    isPinned: c.pinned || c.isPinned || false,
    isArchived: c.archived || c.isArchived || false,
    isMuted: c.muted || c.isMuted || false,
    isFriend: c.isFriend || false,
    isBlockedByMe: c.isBlockedByMe || false,
    hasBlockedMe: c.hasBlockedMe || false,
    lastMessage: lastMsg ? {
      id: lastMsg.id,
      content: lastMsg.content || "",
      senderId: lastMsg.senderId,
      senderName: lastMsg.senderName || "",
      type: lastMsg.type || lastMsg.messageType || "TEXT",
      timestamp: lastMsg.timestamp || lastMsg.createdAt || new Date().toISOString(),
      isDeleted: lastMsg.isDeleted || false
    } : null
  };
}

export async function putChatSafely(c: any): Promise<void> {
  const mapped = mapResponseToLocalChat(c);
  const existing = await db.chats.get(mapped.chatId);
  if (existing) {
    if (mapped.unreadCount === 0 && existing.unreadCount > 0) {
      mapped.unreadCount = existing.unreadCount;
    }
    if (!mapped.lastMessage && existing.lastMessage) {
      mapped.lastMessageId = existing.lastMessageId;
      mapped.lastMessagePreview = existing.lastMessagePreview;
      mapped.lastMessage = existing.lastMessage;
      if (new Date(existing.updatedAt).getTime() > new Date(mapped.updatedAt).getTime()) {
        mapped.updatedAt = existing.updatedAt;
      }
    }
  }
  await db.chats.put(mapped);
}
