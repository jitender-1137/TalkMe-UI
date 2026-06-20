"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Share, Plus, Maximize2 } from "lucide-react"
import { isInstalled } from "@/lib/pwa/install-detection"
import { useIsMobile } from "@/hooks/use-mobile"

/**
 * "Install for full screen" nudge.
 *
 * A mobile browser only auto-hides its address/toolbar when the *window*
 * scrolls — which this app's fixed shell intentionally disables. The reliable
 * way to get a genuinely chrome-free, full-screen experience is to install the
 * PWA (standalone display-mode → no browser UI at all). This banner points
 * users there:
 *   - Android/Chromium: one-tap install via the captured `beforeinstallprompt`.
 *   - iOS Safari (no such event): shows the Share → Add to Home Screen steps.
 *
 * Only appears in a real browser tab on mobile, never once installed, and stays
 * dismissed for 7 days.
 */

const DISMISS_KEY = "tm_install_fs_dismissed_at"
const DISMISS_DAYS = 7

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function recentlyDismissed(): boolean {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY) || 0)
    return ts > 0 && Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

export function InstallFullscreenPrompt() {
  const isMobile = useIsMobile()
  const [visible, setVisible] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (!isMobile || isInstalled() || recentlyDismissed()) return

    const ua = window.navigator.userAgent
    const ios =
      /iphone|ipad|ipod/i.test(ua) ||
      (window.navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1)
    setIsIOS(ios)

    // Android/Chromium: capture the install event so we can trigger it on tap.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall)

    // iOS never fires that event — show the manual instructions after a beat so
    // it doesn't slam in on first paint.
    let t: ReturnType<typeof setTimeout> | undefined
    if (ios) t = setTimeout(() => setVisible(true), 1500)

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      if (t) clearTimeout(t)
    }
  }, [isMobile])

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      /* ignore */
    }
  }

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice.catch(() => undefined)
    setDeferred(null)
    dismiss()
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: "120%", opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: { type: "spring", stiffness: 320, damping: 32 } }}
          exit={{ y: "120%", opacity: 0, transition: { duration: 0.2 } }}
          className="fixed inset-x-0 bottom-0 z-[200] px-3 pb-safe-nav md:hidden"
        >
          <div className="glass-card mx-auto mb-2 max-w-md rounded-2xl border border-border/60 p-3 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                <Maximize2 className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-subhead font-semibold text-foreground">Use TalkMe full screen</p>
                {isIOS ? (
                  <p className="mt-0.5 text-footnote text-muted-foreground">
                    Tap <Share className="inline h-3.5 w-3.5 -translate-y-px" /> then{" "}
                    <span className="font-medium text-foreground">
                      Add to Home Screen <Plus className="inline h-3 w-3 -translate-y-px" />
                    </span>{" "}
                    to hide the browser bars.
                  </p>
                ) : (
                  <p className="mt-0.5 text-footnote text-muted-foreground">
                    Install the app to hide the browser bars and run full screen.
                  </p>
                )}
                {!isIOS && deferred && (
                  <button
                    type="button"
                    onClick={install}
                    className="tappable mt-2 rounded-full bg-primary px-4 py-1.5 text-footnote font-semibold text-primary-foreground"
                  >
                    Install
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss"
                className="tappable -mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
