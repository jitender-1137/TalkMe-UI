/**
 * Discover filters.
 *
 * gender + age range are PERSISTED to localStorage (survive reloads, reused on
 * every fetch). Country is intentionally NOT persisted — it's a *temporary*
 * selection that defaults to the logged-in user's country, and is reset when
 * the user leaves the Discover tab for anything other than the chats tab (a
 * quick trip to message someone keeps it). The temporary country is held in
 * memory only (see get/set/clearDiscoverTempCountry).
 */

export interface DiscoverFilters {
  gender: string // "all" | "male" | "female"
  minAge: number
  maxAge: number
}

export const DEFAULT_DISCOVER_FILTERS: DiscoverFilters = {
  gender: "all",
  minAge: 18,
  maxAge: 99,
}

/** Sentinel for "no country filter" (show everyone). */
export const DEFAULT_COUNTRY = "All"

const KEY = "tm_discover_filters"

/** Read saved filters (partial — only keys that were stored). Null if none/invalid. */
export function loadDiscoverFilters(): Partial<DiscoverFilters> | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    return null
  }
}

export function saveDiscoverFilters(filters: DiscoverFilters): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(KEY, JSON.stringify(filters))
  } catch {
    /* quota / privacy mode — ignore */
  }
}

// ── View mode (card grid vs list) ───────────────────────────────────────────
export type DiscoverView = "grid" | "list"

const VIEW_KEY = "tm_discover_view"

export function loadDiscoverView(): DiscoverView | null {
  if (typeof window === "undefined") return null
  try {
    const v = localStorage.getItem(VIEW_KEY)
    return v === "grid" || v === "list" ? v : null
  } catch {
    return null
  }
}

export function saveDiscoverView(view: DiscoverView): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(VIEW_KEY, view)
  } catch {
    /* ignore */
  }
}

// ── Temporary country filter (in-memory, not persisted) ─────────────────────
// Survives within the SPA session (e.g. a round-trip to the chats tab to
// message someone) but is cleared when leaving Discover for any other tab.
let tempCountry: string | null = null

export function getDiscoverTempCountry(): string | null {
  return tempCountry
}

export function setDiscoverTempCountry(country: string | null): void {
  tempCountry = country
}

export function clearDiscoverTempCountry(): void {
  tempCountry = null
}
