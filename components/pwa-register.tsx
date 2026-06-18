"use client"

import { useEffect } from "react"

export function PwaRegister() {
  useEffect(() => {
    const canRegister =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      (window.location.protocol === "https:" ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1")

    if (!canRegister) return

    let refreshing = false
    // When a new service worker takes control, reload once so the page is
    // controlled by the latest SW (with the push handler), not a stale one.
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })

    const onLoad = () => {
      navigator.serviceWorker
        // updateViaCache: "none" → always fetch the latest /sw.js (don't serve a
        // stale, cached worker that lacks the push handler).
        .register("/sw.js", { updateViaCache: "none" })
        .then((registration) => {
          console.log("[PWA] Service Worker registered with scope:", registration.scope)
          // Force an immediate update check on every load.
          registration.update().catch(() => {})
          registration.addEventListener("updatefound", () => {
            const sw = registration.installing
            if (!sw) return
            sw.addEventListener("statechange", () => {
              if (sw.state === "installed") {
                console.log("[PWA] New service worker installed")
              }
            })
          })
        })
        .catch((error) => {
          console.error("[PWA] Service Worker registration failed:", error)
        })
    }

    window.addEventListener("load", onLoad)
    return () => window.removeEventListener("load", onLoad)
  }, [])

  return null
}
