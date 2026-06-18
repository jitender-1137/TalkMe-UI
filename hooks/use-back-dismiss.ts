"use client"

import { useEffect, useRef } from "react"
import { useIsMobile } from "@/hooks/use-mobile"

/**
 * Make a single transient mobile "screen" (the open chat-area) dismissible with
 * the browser/OS Back button — like a screen pushed onto a native nav stack.
 *
 * ── Why this is allowed even though tabs use replaceState ────────────────────
 * Tab switches deliberately use `replaceState` so Back never cycles tabs (see
 * lib/navigation/url-hash.ts). But a chat opened on top of a tab IS a real
 * navigation step the user expects Back to undo. So when the chat screen opens
 * we push EXACTLY ONE history entry (no URL change — state marker only). Back
 * pops that single entry → `popstate` → we close the chat and restore the
 * previous tab. Closing via an in-app button consumes the same entry, so the
 * back stack always stays balanced (one entry per open chat, never more).
 *
 * This hook is intended to be used for ONE overlay at a time (the chat screen),
 * which avoids any race between sibling overlays touching the history stack.
 *
 * SSR-safe (effects only run on the client) and only active on mobile, where
 * the chat-area replaces the list; on desktop both panels are visible so there
 * is nothing to "go back" from.
 */
export function useBackDismiss(isOpen: boolean, onClose: () => void) {
  const isMobile = useIsMobile()
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // True while we own a pushed history entry for the currently open screen.
  const pushedRef = useRef(false)
  // Set when WE call history.back() programmatically, so the resulting popstate
  // is ignored (the close already happened in the UI — don't double-handle it).
  const skipNextPopRef = useRef(false)

  // Back button: a popstate while we own the top entry means "close the screen".
  useEffect(() => {
    const onPop = () => {
      if (skipNextPopRef.current) {
        skipNextPopRef.current = false
        return
      }
      if (pushedRef.current) {
        pushedRef.current = false
        onCloseRef.current()
      }
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  // Open → push one entry. Close-via-UI → consume our entry with history.back().
  useEffect(() => {
    if (!isMobile) return

    if (isOpen && !pushedRef.current) {
      pushedRef.current = true
      // pushState with no url arg keeps the current URL/hash, only adding an
      // entry — so the centralized tab↔hash sync is unaffected.
      window.history.pushState({ __backDismiss: true }, "")
    } else if (!isOpen && pushedRef.current) {
      // Closed from within the app (back button in the UI). Pop our own entry so
      // the user doesn't have to press the OS Back button to clear it.
      pushedRef.current = false
      skipNextPopRef.current = true
      window.history.back()
    }
  }, [isOpen, isMobile])

  // Unmount safety: drop a dangling entry if we still own one.
  useEffect(() => {
    return () => {
      if (pushedRef.current) {
        pushedRef.current = false
        skipNextPopRef.current = true
        window.history.back()
      }
    }
  }, [])
}
