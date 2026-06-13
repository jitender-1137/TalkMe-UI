"use client"

import { useEffect } from "react"

/**
 * Prevents desktop Ctrl+Wheel / Ctrl+± zoom and iOS double-tap zoom.
 * Rendered once at the root; has no visible output.
 */
export function ZoomPreventer() {
  useEffect(() => {
    // Prevent Ctrl + mouse-wheel zoom (desktop)
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
      }
    }

    // Prevent Ctrl + +/–/0 keyboard shortcuts (desktop)
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.ctrlKey &&
        (e.key === "+" || e.key === "-" || e.key === "=" || e.key === "0")
      ) {
        e.preventDefault()
      }
    }

    // Prevent pinch-zoom gesture (mobile / trackpad)
    const onGestureStart = (e: Event) => e.preventDefault()

    document.addEventListener("wheel", onWheel, { passive: false })
    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("gesturestart", onGestureStart)
    document.addEventListener("gesturechange", onGestureStart)

    return () => {
      document.removeEventListener("wheel", onWheel)
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("gesturestart", onGestureStart)
      document.removeEventListener("gesturechange", onGestureStart)
    }
  }, [])

  return null
}
