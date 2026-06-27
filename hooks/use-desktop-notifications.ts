"use client"

import { useCallback, useEffect, useState } from "react"
import { useLobbyStore } from "@/components/lobby/lobby-store"
import { showSuccessToast, showErrorToast } from "@/src/api/error-handler"
import {
  requestBrowserNotificationPermission,
  showBrowserNotification,
} from "@/lib/notifications/browser-notify"

function currentPermission(): NotificationPermission {
  return typeof window !== "undefined" && "Notification" in window
    ? Notification.permission
    : "denied"
}

function isSecureContextNow(): boolean {
  return typeof window !== "undefined" ? window.isSecureContext !== false : true
}

/**
 * Single source of truth for the "Desktop Notifications" toggle, shared by the
 * Settings page AND the Connect-tab settings drawer so the two surfaces can't
 * diverge (the previous bug: the Connect drawer set `desktop:true` WITHOUT ever
 * requesting OS permission, so the toggle looked on but no banner could fire).
 *
 * The toggle is "on" only when BOTH the user preference AND OS permission agree.
 * Enabling always requests OS permission — the click is the required user gesture —
 * and re-reads permission on focus so revoking it in browser settings flips the UI
 * off. On a non-secure origin (e.g. http over a LAN IP on mobile) it reports
 * unsupported so the UI can explain why notifications are unavailable.
 */
export function useDesktopNotifications() {
  const desktopPref = useLobbyStore((s) => s.notificationSettings.desktop)
  const updateNotificationSettings = useLobbyStore((s) => s.updateNotificationSettings)
  const [permission, setPermission] = useState<NotificationPermission>(currentPermission)
  const [secure, setSecure] = useState<boolean>(isSecureContextNow)

  // Permission can be granted/revoked in browser settings while the page is open;
  // re-read whenever the tab regains focus/visibility so the UI never goes stale.
  useEffect(() => {
    const sync = () => {
      setPermission(currentPermission())
      setSecure(isSecureContextNow())
    }
    sync()
    window.addEventListener("focus", sync)
    document.addEventListener("visibilitychange", sync)
    return () => {
      window.removeEventListener("focus", sync)
      document.removeEventListener("visibilitychange", sync)
    }
  }, [])

  const supported =
    typeof window !== "undefined" && "Notification" in window && secure
  // Effective state — what actually governs whether a banner can appear.
  const enabled = desktopPref && permission === "granted" && supported

  const setEnabled = useCallback(
    async (val: boolean) => {
      if (!val) {
        updateNotificationSettings({ desktop: false })
        return
      }
      if (!supported) {
        showErrorToast(
          new Error(
            !secure
              ? "Notifications need a secure connection (https). Open the site over https to enable them."
              : "This browser doesn't support notifications.",
          ),
        )
        return
      }
      // The click is the user gesture required by Notification.requestPermission().
      const perm = await requestBrowserNotificationPermission()
      setPermission(perm)
      if (perm === "granted") {
        updateNotificationSettings({ desktop: true })
        showSuccessToast("Desktop notifications enabled")
        // Immediate confirmation banner (bypasses the "inactive" gate) so the user
        // sees the pipeline works right away — like Google Chat does on enable.
        void showBrowserNotification({
          title: "TalkMe notifications on",
          body: "You'll get a banner here when a new message arrives.",
          tag: "tm-test",
          whenInactiveOnly: false,
        })
      } else {
        updateNotificationSettings({ desktop: false })
        showErrorToast(
          new Error(
            perm === "denied"
              ? "Notifications are blocked. Allow them in your browser/site settings, then try again."
              : "Notification permission was dismissed. Tap the toggle and choose Allow.",
          ),
        )
      }
    },
    [updateNotificationSettings, supported, secure],
  )

  return { enabled, permission, supported, secure, setEnabled }
}
