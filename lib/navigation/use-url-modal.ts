"use client"

import { useEffect, useRef } from "react"
import { pushHash } from "./url-hash"

/**
 * Centralized overlay (modal) back-stack.
 *
 * ── Why centralized ──────────────────────────────────────────────────────────
 * Each open modal pushes ONE history entry (so Back closes it). If every modal
 * registered its OWN popstate listener, a single Back press would fire all of
 * them and close every modal at once. Instead we keep ONE listener and a LIFO
 * stack here: Back pops and closes only the TOP overlay. This also makes nested
 * modals (feed → profile → post detail) behave like a native nav stack.
 *
 * Generalizes hooks/use-back-dismiss.ts (which the chat screen still uses) but
 * additionally reflects the overlay in the URL hash as a path segment.
 */

interface Overlay {
  id: number
  onClose: () => void
}

const stack: Overlay[] = []
let nextId = 1
// Set when WE call history.back() programmatically (UI close), so the resulting
// popstate isn't double-handled.
let skipNextPop = false
let listening = false

function ensureListener() {
  if (listening || typeof window === "undefined") return
  listening = true
  window.addEventListener("popstate", () => {
    if (skipNextPop) {
      skipNextPop = false
      return
    }
    // Back/forward by the user → close the topmost overlay only.
    const top = stack.pop()
    if (top) top.onClose()
  })
}

/** Push an overlay: append its segment to the current hash + record its closer. */
function pushOverlay(segment: string, onClose: () => void): number {
  ensureListener()
  const id = nextId++
  stack.push({ id, onClose })
  const base = (window.location.hash || "").replace(/\/+$/, "")
  pushHash(base ? `${base}/${segment}` : `#${segment}`)
  return id
}

/**
 * Forget all tracked overlays WITHOUT touching history. Called by the tab
 * switcher (which uses replaceState to move to the new tab): the overlays'
 * components are about to unmount, and their cleanup must NOT call history.back()
 * — that would bounce the user back to the tab they just left. Any history entry
 * the modals pushed is simply left below the new tab entry (Back returns there).
 */
export function clearOverlays() {
  stack.length = 0
}

/** Remove an overlay closed via the UI; consume its history entry with back(). */
function removeOverlay(id: number) {
  const idx = stack.findIndex((o) => o.id === id)
  if (idx === -1) return
  stack.splice(idx, 1)
  skipNextPop = true
  if (typeof window !== "undefined") window.history.back()
}

/**
 * Give a modal/overlay its own URL segment and make Back close it.
 *
 * @param open    whether the modal is currently shown
 * @param onClose called when the user presses Back (close the modal in state)
 * @param segment URL path segment for this modal, e.g. `post/123` or `profile/abc`
 */
export function useUrlModal(open: boolean, onClose: () => void, segment: string) {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const idRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (open && idRef.current == null) {
      idRef.current = pushOverlay(segment, () => {
        idRef.current = null // Back already consumed our entry
        onCloseRef.current()
      })
    } else if (!open && idRef.current != null) {
      const id = idRef.current
      idRef.current = null
      removeOverlay(id)
    }
  }, [open, segment])

  // Unmount safety: drop a dangling entry if we still own one.
  useEffect(() => {
    return () => {
      if (idRef.current != null) {
        const id = idRef.current
        idRef.current = null
        removeOverlay(id)
      }
    }
  }, [])
}
