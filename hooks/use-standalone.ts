"use client"

import { useEffect, useState } from "react"
import { isInstalled } from "@/lib/pwa/install-detection"

/**
 * Tracks whether the app is running as an installed/standalone PWA (spec §24)
 * and reflects it as `html.standalone` so CSS can switch to full-screen,
 * native-feeling layout (extra safe-area padding, no overscroll glow).
 *
 * Builds on lib/pwa/install-detection (covers iOS navigator.standalone +
 * display-mode), and re-evaluates if display-mode flips at runtime.
 *
 * Mount once near the root (see NativeEnv). Returns the boolean for components
 * that want to branch (e.g. enable haptics / app-launch animation only when
 * installed).
 */
export function useStandalone(): boolean {
  const [standalone, setStandalone] = useState(false)

  useEffect(() => {
    const update = () => {
      const value = isInstalled()
      setStandalone(value)
      document.documentElement.classList.toggle("standalone", value)
    }

    update()

    // display-mode can change without reload (rare, but cheap to handle).
    const mql = window.matchMedia?.("(display-mode: standalone)")
    mql?.addEventListener?.("change", update)
    return () => mql?.removeEventListener?.("change", update)
  }, [])

  return standalone
}
