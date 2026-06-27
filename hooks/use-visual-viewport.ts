import { useEffect, useState } from "react"

/**
 * Track the *visual* viewport — the slice of the screen NOT covered by the on-screen
 * keyboard. Returns a CSS `height` (px string) and `offsetTop` so a fixed container
 * can be glued to it, WhatsApp-style: when the keyboard opens the visual viewport
 * shrinks (height) and, on iOS, shifts down (offsetTop). Driving a fixed element's
 * `height` + `top` from these keeps the header pinned on top, shrinks the scrollable
 * body, and rides the composer just above the keyboard instead of hiding it behind.
 *
 * SSR-safe: falls back to `100dvh` / `0` until the visualViewport API reports.
 */
export function useVisualViewport(): { height: string; offsetTop: number } {
  const [height, setHeight] = useState<string>("100dvh")
  const [offsetTop, setOffsetTop] = useState<number>(0)

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return

    const vv = window.visualViewport
    const update = () => {
      setHeight(`${vv.height}px`)
      setOffsetTop(vv.offsetTop)
    }

    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    update()

    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
    }
  }, [])

  return { height, offsetTop }
}
