// Builds and copies shareable post URLs (Instagram-style /post/{shortCode}).

/** Absolute shareable URL for a post, or null if no short code is available yet. */
export function buildPostUrl(shortCode?: string | null): string | null {
  if (typeof window === "undefined" || !shortCode) return null
  return `${window.location.origin}/post/${shortCode}`
}

/** Copies the post link to the clipboard. Returns true on success. */
export async function copyPostLink(shortCode?: string | null): Promise<boolean> {
  const url = buildPostUrl(shortCode)
  if (!url) return false
  try {
    await navigator.clipboard.writeText(url)
    return true
  } catch {
    return false
  }
}
