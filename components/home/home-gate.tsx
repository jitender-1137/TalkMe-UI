"use client"

import { useEffect, useState, type ReactNode } from "react"
import { AppShell } from "@/components/app-shell"

/**
 * localStorage key marking "this visitor has entered the app before". Persisted
 * so returning users land straight in the app instead of the marketing page.
 * Cleared on logout (see auth-context) so signing out returns you to landing.
 */
export const ENTERED_KEY = "tm_entered"

/**
 * Homepage gate. The server always renders `landing` (the crawlable marketing
 * page) — so Googlebot and first-time visitors get full, indexable content at
 * "/". After hydration we decide whether to swap in the real app:
 *
 *   • ?app=1 in the URL    → a CTA was clicked → enter the app
 *   • tm_entered flag set  → a returning user  → enter the app
 *
 * First client render must match the server (landing) to avoid a hydration
 * mismatch, so the swap happens in an effect. Returning users see at most one
 * frame of landing before the app's own "Restoring session…" loader — no worse
 * than the existing cold-open behaviour.
 */
export function HomeGate({ landing }: { landing: ReactNode }) {
  const [showApp, setShowApp] = useState(false)

  useEffect(() => {
    let enter = false
    try {
      const params = new URLSearchParams(window.location.search)
      // Deep links into the app use a tab hash (#chats, #news, …). The only
      // hash the landing page itself uses is #features, so any other non-empty
      // hash means the visitor is opening an in-app route → enter the app.
      const hash = window.location.hash
      const isAppDeepLink = hash !== "" && hash !== "#features"

      // Shareable post link: /post/{shortCode}. The static export has no such
      // page (Spring's SPA fallback serves index.html here), so we detect it on
      // the client: stash the code for PendingPostOpener, enter the app (login
      // first if needed), and normalize the URL to "/".
      const postMatch = window.location.pathname.match(/^\/post\/([^/?#]+)/)

      if (postMatch) {
        const code = decodeURIComponent(postMatch[1])
        sessionStorage.setItem("tm_pending_post_code", code)
        window.dispatchEvent(new CustomEvent("post:open-code", { detail: { code } }))
        enter = true
        localStorage.setItem(ENTERED_KEY, "1")
        window.history.replaceState(null, "", "/")
      } else if (params.get("app") === "1") {
        enter = true
        // Persist entry and strip the param so the URL stays clean ("/") and
        // the canonical/shareable URL has no query string.
        localStorage.setItem(ENTERED_KEY, "1")
        window.history.replaceState(null, "", "/")
      } else if (isAppDeepLink) {
        enter = true
        localStorage.setItem(ENTERED_KEY, "1")
      } else if (localStorage.getItem(ENTERED_KEY) === "1") {
        enter = true
      }
    } catch {
      // localStorage unavailable (private mode / SSR-like env) — stay on landing.
    }
    if (enter) setShowApp(true)
  }, [])

  // A landing CTA clicked while we're already mounted on "/" can't rely on a
  // remount (soft navigation keeps this component alive), so it asks us to swap
  // in the app directly via this event. See components/landing/enter-app-link.
  useEffect(() => {
    const onEnter = () => setShowApp(true)
    window.addEventListener("tm:enter-app", onEnter)
    return () => window.removeEventListener("tm:enter-app", onEnter)
  }, [])

  return showApp ? <AppShell /> : <>{landing}</>
}
