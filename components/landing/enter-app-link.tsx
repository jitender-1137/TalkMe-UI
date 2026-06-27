"use client"

import Link from "next/link"
import type { ReactNode, MouseEvent } from "react"
import { ENTERED_KEY } from "@/components/home/home-gate"

/**
 * Landing CTA that opens the app. Keeps a real `href="/?app=1"` (crawlable, and
 * new-tab / no-JS still work), but fixes the soft-navigation dead-spot: when the
 * visitor is already on "/", a Next <Link> to the same route does NOT remount
 * HomeGate, so its mount-only `app=1` check never re-runs and nothing happens.
 *
 * Here we instead persist the entry flag and tell the already-mounted HomeGate
 * to swap in the app immediately (no reload). On "/welcome" (no gate) we let the
 * Link navigate to "/", where the persisted flag opens the app on mount.
 */
export function EnterAppLink({
  href = "/?app=1",
  className,
  children,
}: {
  href?: string
  className?: string
  children: ReactNode
}) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Let modified clicks (open in new tab/window) fall back to real navigation.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    try {
      localStorage.setItem(ENTERED_KEY, "1")
    } catch {
      /* private mode — HomeGate's ?app=1 read still covers the navigation case */
    }
    // Already on the gated homepage → open the app in place, no reload.
    if (window.location.pathname === "/") {
      e.preventDefault()
      window.history.replaceState(null, "", "/")
      window.dispatchEvent(new Event("tm:enter-app"))
    }
  }

  return (
    <Link href={href} prefetch={false} className={className} onClick={handleClick}>
      {children}
    </Link>
  )
}
