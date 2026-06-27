/**
 * Browser-level notifications via the Web Notifications API.
 *
 * Distinct from Web Push (lib/push): push delivers when the app/tab is fully closed
 * via the server + service worker. THIS fires from the live page when a WebSocket
 * message arrives while the tab is merely backgrounded / switched / the window is
 * minimized — the page is still running, so we can surface an OS-level banner
 * ourselves. On desktop this works even when the window is minimized; on mobile it
 * works while the page hasn't been frozen/killed by the OS.
 *
 * Gated by the "Desktop Notifications" setting (notificationSettings.desktop) AND the
 * OS permission. We render through the service worker registration when present
 * (required on Android, where the `new Notification()` constructor is forbidden) and
 * fall back to the constructor on desktop browsers without an active SW. Clicks reuse
 * the SW's existing `notificationclick` handler (focuses the window + posts OPEN_CHAT).
 */

import { useLobbyStore } from "@/components/lobby/lobby-store"

const NOTIFY_DEBUG =
  typeof window !== "undefined" && window.localStorage?.getItem("tm_notify_debug") === "1"

/**
 * True while the app isn't the user's active surface — tab switched away, window
 * minimized, OR another window/app focused on top (the tab can stay "visible" yet
 * lose focus when you alt-tab to another app). Matches when Google Chat notifies:
 * anytime you're not actually looking at the conversation.
 */
export function isPageInactive(): boolean {
  if (typeof document === "undefined") return false
  if (document.visibilityState === "hidden") return true
  // hasFocus() is false when another window/app is in front, even if not minimized.
  return typeof document.hasFocus === "function" ? !document.hasFocus() : false
}

/** Settings toggle + OS permission + secure context all allow a banner right now. */
export function canShowBrowserNotification(): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false
  // Notifications require a secure context (https or localhost). On http over a LAN
  // IP (typical when a phone hits a dev server) this is false → fail closed cleanly.
  if (window.isSecureContext === false) {
    if (NOTIFY_DEBUG) console.debug("[notify] skipped — insecure context (needs https or localhost)")
    return false
  }
  if (Notification.permission !== "granted") return false
  return useLobbyStore.getState().notificationSettings.desktop === true
}

/** Ask for OS notification permission (call from a user gesture — the settings toggle). */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied"
  if (Notification.permission === "granted") return "granted"
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

// Cache only a registration with a genuinely ACTIVE worker. A worker can become
// 'redundant' after an SW update; reusing such a cached reg makes showNotification
// resolve without ever painting a banner. Re-validate on every call.
let swReg: ServiceWorkerRegistration | null = null
function hasActiveWorker(reg: ServiceWorkerRegistration | null): reg is ServiceWorkerRegistration {
  return !!reg && !!reg.active && reg.active.state === "activated"
}
async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null
  if (hasActiveWorker(swReg)) return swReg
  swReg = null
  try {
    // 3s (matches push-manager's swReady) — first-load activation can exceed 1.5s.
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ])
    if (hasActiveWorker(reg)) swReg = reg
    return swReg
  } catch {
    return null
  }
}

interface BrowserNotifyOptions {
  title: string
  body?: string
  /** Banner icon — pass the sender's avatar; defaults to the app icon. */
  icon?: string
  /** Collapses repeated notifications (e.g. per chat) into one. */
  tag?: string
  /** Forwarded to the SW notificationclick handler (e.g. { chatId, url }). */
  data?: Record<string, unknown>
  /** Only fire while the app is not the active/focused surface (default true). */
  whenInactiveOnly?: boolean
}

/**
 * Show a browser notification, honoring the Desktop Notifications setting, OS
 * permission and (by default) whether the app is the active surface. Fire-and-forget;
 * never throws. Set localStorage `tm_notify_debug=1` to log why one was skipped.
 */
export async function showBrowserNotification(opts: BrowserNotifyOptions): Promise<void> {
  const { title, body, icon = "/icon-192.png", tag, data, whenInactiveOnly = true } = opts

  if (whenInactiveOnly && !isPageInactive()) {
    if (NOTIFY_DEBUG) console.debug("[notify] skipped — app is focused/visible")
    return
  }
  if (!canShowBrowserNotification()) {
    if (NOTIFY_DEBUG) {
      const perm = "Notification" in window ? Notification.permission : "unsupported"
      const desktop = useLobbyStore.getState().notificationSettings.desktop
      console.debug(`[notify] skipped — permission=${perm}, desktopSetting=${desktop}`)
    }
    return
  }

  const options: NotificationOptions & { renotify?: boolean } = {
    body,
    icon,
    badge: "/icon-192.png",
    tag,
    renotify: !!tag,
    data,
  }

  // Prefer the service worker (required on Android, reliable while backgrounded);
  // fall back to the page-level constructor if the SW path is unavailable or fails.
  const reg = await getSwRegistration()
  if (reg) {
    try {
      await reg.showNotification(title, options)
      if (NOTIFY_DEBUG) console.debug("[notify] shown via service worker:", title)
      return
    } catch (err) {
      if (NOTIFY_DEBUG) console.debug("[notify] SW showNotification failed, falling back:", err)
    }
  }
  try {
    if (typeof Notification === "function") {
      new Notification(title, options)
      if (NOTIFY_DEBUG) console.debug("[notify] shown via Notification constructor:", title)
    }
  } catch (err) {
    console.warn("[notify] browser notification failed:", err)
  }
}
