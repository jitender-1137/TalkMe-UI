"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Share, Plus, Download, MoreVertical, Sparkles } from "lucide-react"
import { isInstalled } from "@/lib/pwa/install-detection"
import { useHaptics } from "@/hooks/use-haptics"
import { getAccessToken } from "@/src/api/token-store"

/**
 * Install popup — surfaced to *browser* users so they move to the installed
 * (standalone) PWA, which runs full-screen with no browser chrome.
 *
 * Behaviour by platform:
 *   - Android / Chromium: captures `beforeinstallprompt` and offers a one-tap
 *     Install button. On accept we wait for `appinstalled`, then reload the
 *     start URL so the experience continues seamlessly in the freshly-installed
 *     app (Chrome auto-opens the standalone window on most devices; there is no
 *     web API to launch it programmatically, so the reload is the seamless
 *     fallback). If the event hasn't arrived yet we fall back to menu steps.
 *   - iOS Safari: never fires `beforeinstallprompt`, so we show the manual
 *     Share → Add to Home Screen instructions.
 *
 * Visibility rule:
 *   - Logged-OUT browser users: shown on every visit (no persistence).
 *   - Logged-IN users: shown at least once per 12h — throttled by a stored
 *     last-shown timestamp so it resurfaces across visits and within a single
 *     long-lived session, without nagging.
 *   - Never shown once the app is installed.
 */

// Logged-in throttle: re-show the popup at most once per 12h for a user who
// holds a session. Logged-out users ignore this gate (shown every visit).
const SHOWN_KEY = "tm_install_prompt_shown_at"
const SHOW_INTERVAL_MS = 12 * 60 * 60 * 1000
// Small delay so the popup doesn't slam in on first paint, so Android has a
// beat to deliver `beforeinstallprompt`, and so session-restore (/auth/refresh)
// can resolve before we read the login state.
const SHOW_DELAY_MS = 2500
// How often a long-lived session re-checks whether 12h has elapsed.
const RECHECK_INTERVAL_MS = 10 * 60 * 1000

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

/** Logged in == we currently hold a (non-expired) access token in memory. */
function isLoggedIn(): boolean {
  return !!getAccessToken()
}

function shownWithin12h(): boolean {
  try {
    const ts = Number(localStorage.getItem(SHOWN_KEY) || 0)
    return ts > 0 && Date.now() - ts < SHOW_INTERVAL_MS
  } catch {
    return false
  }
}

function markShown(): void {
  try {
    localStorage.setItem(SHOWN_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
}

function detectIOS(): boolean {
  const ua = window.navigator.userAgent
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS reports as Mac — detect via touch.
    (window.navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1)
  )
}

export function InstallFullscreenPrompt() {
  const { haptic } = useHaptics()
  const [visible, setVisible] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [installed, setInstalled] = useState(false)
  // True once the user closes the popup; keeps it shut until the next visit (or
  // until the 12h window re-arms it in a long-lived session).
  const [dismissed, setDismissed] = useState(false)
  // `canInstall` mirrors `deferredRef` in state so the one-tap button appears
  // even when `beforeinstallprompt` arrives after the popup is already shown.
  const [canInstall, setCanInstall] = useState(false)
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isInstalled()) return

    const ios = detectIOS()
    setIsIOS(ios)

    // Android/Chromium: capture the install event whenever it arrives so the
    // button can trigger it. It may fire before or after our show timer.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      deferredRef.current = e as BeforeInstallPromptEvent
      setCanInstall(true)
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall)

    // If the app gets installed (via our button or the browser's own UI), hide.
    const onInstalled = () => setInstalled(true)
    window.addEventListener("appinstalled", onInstalled)

    const show = () => {
      if (isInstalled()) return
      markShown()
      setDismissed(false)
      setVisible(true)
      haptic("impactLight")
    }

    // Initial decision after a beat (session-restore has resolved by now):
    //   logged-out → show every visit; logged-in → only if 12h has elapsed.
    const initial = setTimeout(() => {
      if (isInstalled()) return
      if (isLoggedIn() && shownWithin12h()) return
      show()
    }, SHOW_DELAY_MS)

    // Long-lived sessions: resurface at least once per 12h. The 12h gate here
    // applies to everyone, so neither logged-in nor logged-out users are nagged
    // before the window elapses (or while the popup is already up).
    const interval = setInterval(() => {
      if (isInstalled() || shownWithin12h()) return
      show()
    }, RECHECK_INTERVAL_MS)

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
      clearTimeout(initial)
      clearInterval(interval)
    }
  }, [haptic])

  const dismiss = useCallback(() => {
    haptic("selection")
    setDismissed(true)
  }, [haptic])

  const install = useCallback(async () => {
    const deferred = deferredRef.current
    if (!deferred) return
    haptic("impactMedium")
    setInstalling(true)
    try {
      await deferred.prompt()
      const choice = await deferred.userChoice.catch(() => ({ outcome: "dismissed" as const }))
      deferredRef.current = null
      setCanInstall(false)
      if (choice.outcome === "accepted") {
        haptic("success")
        // Seamless hand-off: once the OS reports the app installed, reload the
        // start URL so we continue in the standalone app rather than the tab.
        let entered = false
        const enter = () => {
          if (entered) return
          entered = true
          setInstalled(true)
          window.location.assign("/")
        }
        window.addEventListener("appinstalled", enter, { once: true })
        // Fallback if `appinstalled` is slow/unsupported on this browser.
        setTimeout(enter, 1500)
      } else {
        haptic("warning")
        setInstalling(false)
        dismiss()
      }
    } catch {
      setInstalling(false)
    }
  }, [haptic, dismiss])

  // Android with a captured prompt → one-tap install. Otherwise (event not yet
  // delivered / not eligible) we show menu steps so there's still guidance.
  const canOneTap = !isIOS && canInstall

  return (
    <AnimatePresence>
      {visible && !installed && !dismissed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center"
          aria-modal="true"
          role="dialog"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismiss}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "110%" }}
            animate={{ y: 0, transition: { type: "spring", stiffness: 320, damping: 32 } }}
            exit={{ y: "110%", transition: { duration: 0.2 } }}
            className="glass-card relative mx-3 mb-3 w-full max-w-md rounded-3xl border border-border/60 p-5 shadow-2xl pb-safe-nav"
          >
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="tappable absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center text-center">
              {/* App icon */}
              <span className="relative grid h-16 w-16 place-items-center overflow-hidden rounded-2xl shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon-192.png" alt="TalkMe" className="h-full w-full object-cover" />
              </span>

              <h2 className="mt-4 text-title-3 font-bold text-foreground">Install TalkMe</h2>
              <p className="mt-1 text-subhead text-muted-foreground">
                {isIOS
                  ? "Add TalkMe to your Home Screen for a full-screen, app-like experience — no browser bars."
                  : "Install the app to launch it from your home screen and run full screen — no browser bars."}
              </p>

              {isIOS ? (
                <div className="mt-5 w-full space-y-2.5 text-left">
                  <Step
                    n={1}
                    icon={<Share className="h-4 w-4" />}
                    text={
                      <>
                        Tap the <span className="font-semibold text-foreground">Share</span> button in
                        Safari&apos;s toolbar.
                      </>
                    }
                  />
                  <Step
                    n={2}
                    icon={<Plus className="h-4 w-4" />}
                    text={
                      <>
                        Choose{" "}
                        <span className="font-semibold text-foreground">Add to Home Screen</span>.
                      </>
                    }
                  />
                  <Step
                    n={3}
                    icon={<Sparkles className="h-4 w-4" />}
                    text={
                      <>
                        Open <span className="font-semibold text-foreground">TalkMe</span> from your
                        home screen — that&apos;s it!
                      </>
                    }
                  />
                </div>
              ) : canOneTap ? (
                <button
                  type="button"
                  onClick={install}
                  disabled={installing}
                  className="tappable mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-body font-semibold text-primary-foreground disabled:opacity-70"
                >
                  {installing ? (
                    "Installing…"
                  ) : (
                    <>
                      <Download className="h-5 w-5" />
                      Install app
                    </>
                  )}
                </button>
              ) : (
                <div className="mt-5 w-full space-y-2.5 text-left">
                  <Step
                    n={1}
                    icon={<MoreVertical className="h-4 w-4" />}
                    text={
                      <>
                        Open your browser menu (
                        <span className="font-semibold text-foreground">⋮</span>).
                      </>
                    }
                  />
                  <Step
                    n={2}
                    icon={<Download className="h-4 w-4" />}
                    text={
                      <>
                        Tap <span className="font-semibold text-foreground">Install app</span> (or{" "}
                        <span className="font-semibold text-foreground">Add to Home screen</span>).
                      </>
                    }
                  />
                </div>
              )}

              <button
                type="button"
                onClick={dismiss}
                className="tappable mt-3 text-footnote font-medium text-muted-foreground"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Step({ n, icon, text }: { n: number; icon: React.ReactNode; text: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-muted/40 px-3 py-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
        {n}
      </span>
      <span className="text-primary/80">{icon}</span>
      <p className="text-footnote text-muted-foreground">{text}</p>
    </div>
  )
}
