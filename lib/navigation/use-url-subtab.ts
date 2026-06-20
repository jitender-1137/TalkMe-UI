"use client"

import { useCallback, useEffect, useState } from "react"
import { parseHash, buildHash, replaceHash } from "./url-hash"

/**
 * Sync a tab's active subtab with the URL hash (#tab/subtab) using replaceState,
 * so subtabs are deep-linkable but Back never cycles through them (consistent
 * with how the main tabs behave).
 *
 * Returns [subtab, setSubtab]. The initial value is read from the URL (deep
 * link) and falls back to `defaultSubtab`.
 */
export function useUrlSubtab<T extends string>(
  tab: string,
  validSubtabs: readonly T[],
  defaultSubtab: T,
): [T, (next: T) => void] {
  const read = (): T => {
    if (typeof window === "undefined") return defaultSubtab
    const { tab: t, segments } = parseHash(window.location.hash)
    const seg = segments[0] as T | undefined
    if (t === tab && seg && validSubtabs.includes(seg)) return seg
    return defaultSubtab
  }

  const [subtab, setSubtabState] = useState<T>(read)

  // On mount (the tab just became active and rendered): make sure the subtab
  // segment is present — WITHOUT clobbering any deeper modal segments, so a
  // deep-linked #tab/subtab/modal URL survives.
  useEffect(() => {
    const { segments } = parseHash(window.location.hash)
    if (segments[0] !== subtab) {
      replaceHash(buildHash(tab, [subtab, ...segments.slice(1)]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setSubtab = useCallback(
    (next: T) => {
      setSubtabState(next)
      // Explicit subtab navigation drops any open-modal segments (overlays go away).
      replaceHash(buildHash(tab, [next]))
    },
    [tab],
  )

  // Re-sync from the URL on external changes (Back/forward, manual edit).
  useEffect(() => {
    const sync = () => {
      const { tab: t, segments } = parseHash(window.location.hash)
      if (t !== tab) return
      const seg = segments[0] as T | undefined
      const resolved = seg && validSubtabs.includes(seg) ? seg : defaultSubtab
      setSubtabState((prev) => (prev === resolved ? prev : resolved))
    }
    window.addEventListener("popstate", sync)
    window.addEventListener("hashchange", sync)
    return () => {
      window.removeEventListener("popstate", sync)
      window.removeEventListener("hashchange", sync)
    }
  }, [tab, validSubtabs, defaultSubtab])

  return [subtab, setSubtab]
}
