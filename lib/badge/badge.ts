"use client"

/**
 * App icon badge (Badging API). Used during active usage; the service worker
 * sets it for background pushes. Falls back gracefully (no-op) where the API
 * is unavailable (e.g. iOS Home Screen currently ignores it — handled silently).
 */
export function setBadge(count: number): void {
  if (typeof navigator === "undefined") return
  try {
    if (count > 0 && "setAppBadge" in navigator) {
      ;(navigator as any).setAppBadge(count).catch(() => {})
    } else if ("clearAppBadge" in navigator) {
      ;(navigator as any).clearAppBadge().catch(() => {})
    }
  } catch {
    /* Badging API not supported — ignore */
  }
}

export function clearBadge(): void {
  if (typeof navigator === "undefined") return
  try {
    if ("clearAppBadge" in navigator) {
      ;(navigator as any).clearAppBadge().catch(() => {})
    }
  } catch {
    /* ignore */
  }
}

export function isBadgeSupported(): boolean {
  return typeof navigator !== "undefined" && "setAppBadge" in navigator
}
