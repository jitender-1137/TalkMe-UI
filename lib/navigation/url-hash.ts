/**
 * Centralized URL-hash ↔ tab manager.
 *
 * ── Why this exists / why replaceState ──────────────────────────────────────
 * Tabs are identified by the URL hash (Home = "/", Discover = "#discover",
 * Chats = "#chats", Profile = "#profile", …).
 *
 * The old implementation switched tabs with `window.location.hash = "#x"` and
 * closed views with `window.history.back()`. Assigning `location.hash` (and
 * `history.pushState`) appends a NEW entry to the browser back stack for every
 * tab change. After Home → Discover → Chats → Profile the back stack becomes
 * […, Discover, Chats, Profile], so pressing Back walks *backwards through the
 * tabs* instead of leaving the app — the bug we are fixing.
 *
 * `history.replaceState()` rewrites the URL of the CURRENT history entry in
 * place and adds NO new entry. Therefore:
 *   • Tab switches never grow the back stack.
 *   • Back goes straight to whatever page preceded the app (or exits the PWA).
 *   • Deep links still work because we READ the hash on load.
 *
 * `replaceState` is supported on every target (Chrome/Safari/Firefox/Edge,
 * Android/iOS browsers, installed PWAs on Android & iOS) and, crucially, does
 * NOT emit `hashchange`/`popstate`, so our own writes can't create feedback
 * loops with the listeners that sync state from the URL.
 */

export type TabId = "chats" | "discover" | "match" | "news" | "friends" | "settings"

/** Canonical hash for each tab. "settings" is the Profile tab. */
const TAB_TO_HASH: Record<TabId, string> = {
  chats: "#chats",
  discover: "#discover",
  match: "#match",
  news: "#news",
  friends: "#friends",
  settings: "#profile",
}

/**
 * Reverse lookup + legacy aliases. The legacy hashes (`#messages`,
 * `#discover-message`) were sub-view markers in the old implementation; a PWA
 * relaunch or a bookmarked URL may still carry them, so we normalize them to a
 * real tab on load instead of leaving an unknown hash behind.
 */
const HASH_TO_TAB: Record<string, TabId> = {
  "#chats": "chats",
  "#discover": "discover",
  "#match": "match",
  "#news": "news",
  "#friends": "friends",
  "#profile": "settings",
  // legacy aliases
  "#messages": "chats",
  "#discover-message": "chats",
}

/** Canonical hash for a tab id ("" for unknown/home). */
export function getHashForTab(tab: string): string {
  return TAB_TO_HASH[tab as TabId] ?? ""
}

/** Resolve a raw hash (with or without leading "#") to a tab id, or null. */
export function getTabFromHash(hash: string | null | undefined): TabId | null {
  if (!hash) return null
  const normalized = hash.startsWith("#") ? hash : `#${hash}`
  return HASH_TO_TAB[normalized] ?? null
}

export function isKnownTab(tab: string): tab is TabId {
  return tab in TAB_TO_HASH
}

/**
 * Replace the current history entry's hash WITHOUT creating a new entry.
 *
 * SSR-safe (no-ops on the server). Preserves pathname + query string so deep
 * links like `?chat=<id>` survive. Passing "" strips the hash entirely (Home).
 */
export function replaceHash(hash: string): void {
  if (typeof window === "undefined") return

  const { pathname, search } = window.location
  const normalized = hash && !hash.startsWith("#") ? `#${hash}` : hash
  const nextUrl = `${pathname}${search}${normalized || ""}`

  // Skip redundant writes (avoids churn, keeps existing history.state intact).
  const currentUrl = `${pathname}${search}${window.location.hash || ""}`
  if (nextUrl === currentUrl) return

  // replaceState rewrites the CURRENT entry → the back stack length is
  // unchanged → Back never cycles tabs. We preserve history.state so anything
  // else stored on the entry is not lost.
  window.history.replaceState(window.history.state, "", nextUrl)
}
