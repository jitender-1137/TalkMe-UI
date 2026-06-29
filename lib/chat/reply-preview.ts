/**
 * Shared helpers for rendering a reply quote (WhatsApp-style) consistently in BOTH
 * the composer's reply preview and the quoted block inside a sent bubble — for ANY
 * parent message type.
 */

/** Media parents whose quote shows a small thumbnail on the right. */
export function replyHasThumbnail(reply: { type?: string | null; mediaUrl?: string | null }): boolean {
  const t = (reply.type || "").toLowerCase()
  return !!reply.mediaUrl && (t === "image" || t === "video" || t === "sticker")
}

/**
 * Label text for a reply quote: the caption if the parent has real text, otherwise a
 * type label ("Photo"/"Video"/"Voice message"/"Document"/"Sticker"). GIFs come through
 * as images, which read fine as "Photo".
 */
export function replyPreviewLabel(reply: { type?: string | null; content?: string | null }): string {
  const type = (reply.type || "text").toLowerCase()
  const content = (reply.content || "").trim()
  switch (type) {
    case "image":
      return content || "Photo"
    case "video":
      return content || "Video"
    case "audio":
      return content || "Voice message"
    case "document":
      return content || "Document"
    case "sticker":
      return "Sticker"
    default:
      return content
  }
}
