"use client"

import { useEffect, useRef } from "react"
import { useAuth } from "@/components/app-shell/auth-context"
import { detectInstallationType } from "@/lib/pwa/install-detection"
import {
  ensurePushSubscription,
  refreshPushSubscription,
  isPushOptedOut,
} from "@/lib/push/push-manager"
import { PushService } from "@/src/api/services/push.service"
import { setBadge } from "@/lib/badge/badge"
import { useWebSocket } from "@/components/providers"

/**
 * Orchestrates the per-user notification setup (renders nothing):
 *  - detects installation type and reports it to the backend
 *  - ensures a Web Push subscription on installed PWAs
 *  - seeds the app badge from the authoritative unread count
 *  - re-reports when install state changes; refreshes a rotated subscription
 */
export function NotificationSetup() {
  const { isAuthenticated, isGuest } = useAuth()
  const { isConnected } = useWebSocket()
  const didSetup = useRef(false)
  const wasConnected = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || isGuest) {
      didSetup.current = false
      return
    }
    if (didSetup.current) return
    didSetup.current = true

    let cancelled = false
    ;(async () => {
      const type = detectInstallationType()
      try {
        await PushService.updateInstallation(type)
      } catch {
        /* non-fatal */
      }
      // Silently (re)subscribe ONLY if the user already granted permission AND has
      // not explicitly turned push off on this device. Without the opt-out check we'd
      // re-enable push on the next app open right after the user disabled it (the
      // browser permission stays "granted"). First-time permission must still come
      // from a user gesture (the Settings toggle).
      try {
        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "granted" &&
          !isPushOptedOut()
        ) {
          await ensurePushSubscription(type, false)
        }
      } catch {
        /* non-fatal */
      }
      try {
        const count = await PushService.getUnreadCount()
        if (!cancelled) setBadge(count)
      } catch {
        /* non-fatal */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isGuest])

  // Re-sync the authoritative unread → badge whenever the socket (re)connects,
  // covering reconnects and recovery after an offline period.
  useEffect(() => {
    if (!isAuthenticated || isGuest) {
      wasConnected.current = isConnected
      return
    }
    if (isConnected && !wasConnected.current) {
      PushService.getUnreadCount()
        .then(setBadge)
        .catch(() => {})
    }
    wasConnected.current = isConnected
  }, [isConnected, isAuthenticated, isGuest])

  // Re-report if the app is installed / display-mode changes mid-session.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mq = window.matchMedia("(display-mode: standalone)")
    const onChange = () => {
      if (!isAuthenticated || isGuest) return
      const type = detectInstallationType()
      PushService.updateInstallation(type).catch(() => {})
      if (type !== "BROWSER" && !isPushOptedOut()) ensurePushSubscription(type, false).catch(() => {})
    }
    mq.addEventListener?.("change", onChange)
    return () => mq.removeEventListener?.("change", onChange)
  }, [isAuthenticated, isGuest])

  // Messages from the service worker: re-subscribe on rotation, open a chat on tap.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return
    const onMsg = (e: MessageEvent) => {
      const data = e.data
      if (!data) return
      if (data.type === "PUSH_SUBSCRIPTION_CHANGED") {
        // Don't recreate a subscription the user deliberately turned off.
        if (!isPushOptedOut()) refreshPushSubscription(detectInstallationType()).catch(() => {})
      } else if (data.type === "OPEN_CHAT" && data.chatId) {
        // Reuse AppShell's existing chat:open handler to navigate to the conversation.
        window.dispatchEvent(new CustomEvent("chat:open", { detail: { chatId: data.chatId } }))
      }
    }
    navigator.serviceWorker.addEventListener("message", onMsg)
    return () => navigator.serviceWorker.removeEventListener("message", onMsg)
  }, [])

  // Deep-link: when opened cold from a notification (/?chat=<id>), open that chat.
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const chatId = params.get("chat")
    if (chatId) {
      window.dispatchEvent(new CustomEvent("chat:open", { detail: { chatId } }))
      // Clean the query param so refreshes don't re-trigger.
      params.delete("chat")
      const url =
        window.location.pathname +
        (params.toString() ? `?${params.toString()}` : "") +
        window.location.hash
      window.history.replaceState({}, "", url)
    }
  }, [])

  return null
}
