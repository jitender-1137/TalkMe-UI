/**
 * Instagram/WhatsApp-style story replies over chat.
 *
 * Same carrier strategy as shared posts ([[shared-post]]): the backend message
 * model has no metadata field, so a story reply is encoded inside the message
 * `content` as a sentinel-prefixed JSON blob. Unlike a shared post, it ALSO
 * carries the user's reply text — the chat bubble shows the story as a quoted
 * preview with the reply text below it (WhatsApp style).
 *
 * `displayContent()` in lib/shared-post.ts decodes BOTH formats, so every
 * existing content-display path (list preview, notification toast, reply banner)
 * stays preview-safe without extra wiring.
 */

export interface StoryReplyRef {
  storyId: string
  ownerName: string
  ownerUsername?: string
  /** Story media, resolved to a full URL (used as the quoted thumbnail). */
  thumbnail?: string
  mediaType?: 'image' | 'video'
  /** The user's actual reply text (or a reaction emoji). */
  text: string
}

// Leading control char → users can't forge this by typing.
const SENTINEL = 'tmstory'

export function serializeStoryReply(ref: StoryReplyRef): string {
  return SENTINEL + JSON.stringify(ref)
}

export function parseStoryReply(content?: string | null): StoryReplyRef | null {
  if (!content || !content.startsWith(SENTINEL)) return null
  try {
    const ref = JSON.parse(content.slice(SENTINEL.length))
    return ref && typeof ref.storyId === 'string' ? (ref as StoryReplyRef) : null
  } catch {
    return null
  }
}

/** Human-readable one-liner for list previews / notifications. */
export function storyReplyPreview(ref: StoryReplyRef): string {
  return ref.text ? `↩️ Replied to story: ${ref.text}` : '↩️ Replied to story'
}
