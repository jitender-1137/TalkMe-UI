"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { pushHash } from "./url-hash"

/** Base z-index for overlays; each nesting level stacks above the previous. */
const Z_BASE = 250
const Z_STEP = 5

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
  /** Whether this overlay should hide the bottom nav while open. */
  blocking: boolean
  /** URL segment — for debugging the back-stack only. */
  segment: string
}

const stack: Overlay[] = []
let nextId = 1
// Set when WE call history.back() programmatically (UI close), so the resulting
// popstate isn't double-handled.
let skipNextPop = false

/** Opt-in back-stack tracing: localStorage.setItem("tm_nav_debug","1"). */
function navDebug(...args: unknown[]) {
  try {
    if (typeof window !== "undefined" && window.localStorage?.getItem("tm_nav_debug") === "1") {
      console.debug("[nav]", ...args)
    }
  } catch {
    /* ignore */
  }
}
const segs = () => stack.map((o) => o.segment)

// ── Subscription: lets the bottom nav (and others) react to overlay changes ──
const listeners = new Set<() => void>()
function notify() {
  listeners.forEach((l) => l())
}
function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
/** True while at least one nav-blocking overlay (modal) is open. */
function hasBlockingOverlay() {
  return stack.some((o) => o.blocking)
}

function ensureListener() {
  if (typeof window === "undefined") return
  // Window-level guard so the listener is registered exactly ONCE even if this
  // module is evaluated more than once (HMR, split chunks). Two listeners would each
  // pop the stack on a single Back press → close two overlays at once (e.g. a single
  // swipe-back collapsing chat AND lobby straight to #match).
  if ((window as any).__tmOverlayListening) return
  ;(window as any).__tmOverlayListening = true
  window.addEventListener("popstate", () => {
    if (skipNextPop) {
      skipNextPop = false
      navDebug("popstate (skipped — our own back)")
      return
    }
    // Back/forward by the user → close the topmost overlay only.
    const top = stack.pop()
    notify()
    navDebug("popstate → closed", top?.segment, "| remaining:", segs())
    if (top) top.onClose()
  })
}

/** Push an overlay: append its segment to the current hash + record its closer. */
function pushOverlay(
  segment: string,
  onClose: () => void,
  blocking: boolean,
): { id: number; depth: number } {
  ensureListener()
  const id = nextId++
  const depth = stack.length // nesting level (0 = first overlay)
  stack.push({ id, onClose, blocking, segment })
  notify()
  const base = (window.location.hash || "").replace(/\/+$/, "")
  pushHash(base ? `${base}/${segment}` : `#${segment}`)
  navDebug("push", segment, "| stack:", segs())
  return { id, depth }
}

/**
 * Forget all tracked overlays WITHOUT touching history. Called by the tab
 * switcher (which uses replaceState to move to the new tab): the overlays'
 * components are about to unmount, and their cleanup must NOT call history.back()
 * — that would bounce the user back to the tab they just left. Any history entry
 * the modals pushed is simply left below the new tab entry (Back returns there).
 */
export function clearOverlays() {
  navDebug("clearOverlays | was:", segs())
  stack.length = 0
  notify()
}

/** Remove an overlay closed via the UI; consume its history entry with back(). */
function removeOverlay(id: number) {
  const idx = stack.findIndex((o) => o.id === id)
  if (idx === -1) return
  const [removed] = stack.splice(idx, 1)
  notify()
  navDebug("removeOverlay (UI close) →", removed?.segment, "| remaining:", segs())
  skipNextPop = true
  if (typeof window !== "undefined") window.history.back()
}

/**
 * Subscribe to whether a nav-blocking modal/overlay is currently open. The
 * bottom nav uses this to hide itself whenever any extra modal is on top.
 */
export function useHasBlockingOverlay(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => hasBlockingOverlay(),
    () => false,
  )
}

/**
 * Give a modal/overlay its own URL segment and make Back close it.
 *
 * @param open    whether the modal is currently shown
 * @param onClose called when the user presses Back (close the modal in state)
 * @param segment URL path segment for this modal, e.g. `post/123` or `profile/abc`
 * @param options.hideNav  whether to hide the bottom nav while open (default true;
 *                          set false for tab-like views such as Connect's lobby).
 * @returns a z-index for the overlay so each nesting level stacks above the one
 *          beneath it (used by full-screen modals that can open one another).
 */
export function useUrlModal(
  open: boolean,
  onClose: () => void,
  segment: string,
  options?: { hideNav?: boolean },
): number {
  const blocking = options?.hideNav ?? true
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const idRef = useRef<number | null>(null)
  const [zIndex, setZIndex] = useState(Z_BASE)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (open && idRef.current == null) {
      const { id, depth } = pushOverlay(
        segment,
        () => {
          idRef.current = null // Back already consumed our entry
          onCloseRef.current()
        },
        blocking,
      )
      idRef.current = id
      setZIndex(Z_BASE + depth * Z_STEP)
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

  return zIndex
}
