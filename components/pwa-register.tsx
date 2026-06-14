"use client"

import { useEffect } from "react"

export function PwaRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      window.location.protocol === "https:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("[PWA] Service Worker registered with scope:", registration.scope)
          })
          .catch((error) => {
            console.error("[PWA] Service Worker registration failed:", error)
          })
      })
    }
  }, [])

  return null
}
