"use client"

import { useEffect, useRef } from "react"

// Cloudflare Turnstile site key. Defaults to Cloudflare's "always passes" TEST
// key so dev works out of the box — set NEXT_PUBLIC_TURNSTILE_SITE_KEY in prod.
const SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

declare global {
  interface Window {
    turnstile?: any
  }
}

let scriptPromise: Promise<void> | null = null
function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script")
    s.src = SCRIPT_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error("Turnstile failed to load"))
    document.head.appendChild(s)
  })
  return scriptPromise
}

interface TurnstileProps {
  /** Called with the verification token when the challenge is solved. */
  onVerify: (token: string) => void
  /** Called when the token expires or errors (clear it in the parent). */
  onExpire?: () => void
  className?: string
}

export function Turnstile({ onVerify, onExpire, className }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const onVerifyRef = useRef(onVerify)
  const onExpireRef = useRef(onExpire)
  onVerifyRef.current = onVerify
  onExpireRef.current = onExpire

  useEffect(() => {
    let mounted = true
    loadTurnstileScript()
      .then(() => {
        if (!mounted || !containerRef.current || !window.turnstile) return
        if (widgetId.current) return
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme: "auto",
          callback: (token: string) => onVerifyRef.current?.(token),
          "expired-callback": () => onExpireRef.current?.(),
          "error-callback": () => onExpireRef.current?.(),
        })
      })
      .catch(() => {
        /* network/script failure — submit will fail captcha server-side */
      })

    return () => {
      mounted = false
      try {
        if (widgetId.current && window.turnstile) {
          window.turnstile.remove(widgetId.current)
        }
      } catch {
        /* ignore */
      }
      widgetId.current = null
    }
  }, [])

  return <div ref={containerRef} className={className} />
}
