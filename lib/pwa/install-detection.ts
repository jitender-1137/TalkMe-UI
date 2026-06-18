"use client"

import type { InstallationType } from "@/src/api/services/push.service"

/**
 * Detect how the app is currently running:
 *  - IOS_HOME : iOS Safari "Add to Home Screen" (navigator.standalone)
 *  - PWA      : installed PWA / standalone display-mode (Android, desktop)
 *  - BROWSER  : a regular browser tab
 */
export function detectInstallationType(): InstallationType {
  if (typeof window === "undefined") return "BROWSER"

  const isIos =
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
    // iPadOS reports as Mac; detect via touch
    (window.navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1)

  // iOS Home Screen PWA
  if (isIos && (window.navigator as any).standalone === true) {
    return "IOS_HOME"
  }

  // Standalone display-mode (installed PWA on Android / desktop)
  const standalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.matchMedia?.("(display-mode: fullscreen)")?.matches ||
    window.matchMedia?.("(display-mode: minimal-ui)")?.matches ||
    false

  if (standalone) {
    return isIos ? "IOS_HOME" : "PWA"
  }

  return "BROWSER"
}

/** True when the app is installed (not a plain browser tab). */
export function isInstalled(): boolean {
  return detectInstallationType() !== "BROWSER"
}
