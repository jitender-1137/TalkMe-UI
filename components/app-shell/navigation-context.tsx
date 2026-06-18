"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { getHashForTab, getTabFromHash, replaceHash } from "@/lib/navigation/url-hash"

interface NavigationContextType {
  activeTab: string
  setActiveTab: (tab: string) => void
}

const NavigationContext = createContext<NavigationContextType | null>(null)

/** Fallback when there is no (recognizable) deep-link hash. */
const DEFAULT_TAB = "chats"

/**
 * Single source of truth for tab ↔ URL-hash synchronization.
 *
 * Every tab change flows through `setActiveTab`, which updates React state and
 * rewrites the hash with `replaceState` (see ./url-hash.ts) so NO new browser
 * history entry is ever created — that is what stops the Back button from
 * cycling through previously visited tabs.
 */
export function NavigationProvider({ children }: { children: ReactNode }) {
  // SSR-safe lazy init: on the very first client render, read the deep-link
  // hash so direct access to `…#discover` / `…#profile` opens the right tab.
  const [activeTab, setActiveTabState] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_TAB
    return getTabFromHash(window.location.hash) ?? DEFAULT_TAB
  })

  const activeTabRef = useRef(activeTab)
  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

  // Centralized setter: state + URL stay in sync, and the URL is updated with
  // replaceState ONLY (never pushState / location.hash assignment / Link), so
  // switching tabs does not push a history entry.
  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState((prev) => (prev === tab ? prev : tab))
    replaceHash(getHashForTab(tab))
  }, [])

  // On every load / refresh / reopen / PWA launch / direct URL access:
  // normalize the URL in place. This rewrites any stale or legacy hash (e.g. a
  // restored "#messages", a bare "#", or an unknown value) to the canonical
  // hash of the resolved tab using replaceState — so no old hash navigation
  // state lingers in the back stack and the URL is always canonical.
  useEffect(() => {
    replaceHash(getHashForTab(activeTabRef.current))
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep state in sync when the hash changes by means OTHER than our setter:
  // a manual URL edit, or the OS/browser restoring a URL. We never write
  // history here. `replaceState` (and therefore our own writes) does NOT emit
  // `hashchange`/`popstate`, so this listener only fires for genuine external
  // changes — no feedback loop.
  useEffect(() => {
    const syncFromUrl = () => {
      const tab = getTabFromHash(window.location.hash)
      if (tab && tab !== activeTabRef.current) {
        setActiveTabState(tab)
      }
    }
    window.addEventListener("hashchange", syncFromUrl)
    window.addEventListener("popstate", syncFromUrl)
    return () => {
      window.removeEventListener("hashchange", syncFromUrl)
      window.removeEventListener("popstate", syncFromUrl)
    }
  }, [])

  return (
    <NavigationContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error("useNavigation must be used within NavigationProvider")
  }
  return context
}
