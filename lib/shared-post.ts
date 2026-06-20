/**
 * Instagram-style post sharing over chat.
 *
 * The backend message model has no metadata field and a fixed messageType enum
 * (TEXT/IMAGE/…), so a shared post is carried inside the message `content` as a
 * sentinel-prefixed JSON blob. Every place that *displays* message content must
 * route through here so the raw blob never leaks into the UI:
 *   - chat bubble      → renders <SharedPostCard> (see chat-bubble.tsx)
 *   - chat-list preview → sharedPostPreview() (see secondary-panel.tsx)
 *   - message toast     → sharedPostPreview() (see websocket-provider.tsx)
 *
 * The sentinel is a control character that never occurs in user-typed text, so
 * normal messages are untouched and detection is unambiguous.
 */

import { parseStoryReply, storyReplyPreview } from './story-reply'

export interface SharedPostRef {
  postId: string
  authorName: string
  authorUsername?: string
  authorAvatar?: string
  /** Original post caption (may be empty). */
  caption?: string
  /** First media item, resolved to a full URL. */
  thumbnail?: string
  mediaType?: 'image' | 'video'
}

const SENTINEL = 'tmpost'

/** Encode a post reference into a chat message `content` string. */
export function serializeSharedPost(ref: SharedPostRef): string {
  return SENTINEL + JSON.stringify(ref)
}

/** Decode a shared-post reference from message content, or null if it isn't one. */
export function parseSharedPost(content?: string | null): SharedPostRef | null {
  if (!content || !content.startsWith(SENTINEL)) return null
  try {
    const ref = JSON.parse(content.slice(SENTINEL.length))
    return ref && typeof ref.postId === 'string' ? (ref as SharedPostRef) : null
  } catch {
    return null
  }
}

/** Human-readable one-liner for list previews / notifications. */
export function sharedPostPreview(ref: SharedPostRef): string {
  const icon = ref.mediaType === 'video' ? '🎬' : '📷'
  return ref.caption ? `${icon} Shared a post: ${ref.caption}` : `${icon} Shared a post`
}

/**
 * Convenience for call sites that only have the raw content string: returns a
 * clean preview for any rich message (shared post OR story reply), otherwise the
 * original content unchanged. Every content-display path routes through here so
 * encoded blobs never leak into the UI.
 */
export function displayContent(content?: string | null): string {
  const post = parseSharedPost(content)
  if (post) return sharedPostPreview(post)
  const story = parseStoryReply(content)
  if (story) return storyReplyPreview(story)
  return content ?? ''
}
