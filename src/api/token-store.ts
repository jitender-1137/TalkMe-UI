/**
 * Centralized token management for JWT authentication.
 *
 * Security design:
 * - Access token: stored in memory only (never localStorage) to prevent XSS theft
 * - Refresh token: stored in HTTP-only, Secure, SameSite=Strict cookie by the server
 * - CSRF token: stored in non-HttpOnly cookie (readable by JS), sent as X-CSRF-Token header
 *
 * On page refresh the access token is lost; the app must call /auth/refresh to obtain
 * a new one using the refresh token cookie.
 */

let accessToken: string | null = null
let tokenExpiresAt: number | null = null

// ── Cookie helpers ───────────────────────────────────────────────────────────

/**
 * Read a cookie value by name.
 * Works for non-HttpOnly cookies (like CSRF token).
 */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
  return match ? decodeURIComponent(match[2]) : null
}

// ── Access Token ─────────────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  // Check if token is expired
  if (tokenExpiresAt && Date.now() >= tokenExpiresAt) {
    accessToken = null
    tokenExpiresAt = null
    return null
  }
  return accessToken
}

export function setAccessToken(token: string, expiresIn?: number): void {
  accessToken = token
  if (expiresIn) {
    // Set expiry with 30-second buffer to refresh before actual expiry
    tokenExpiresAt = Date.now() + (expiresIn - 30) * 1000
  } else {
    tokenExpiresAt = null
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth:token-changed", { detail: token }))
  }
}

export function clearAccessToken(): void {
  accessToken = null
  tokenExpiresAt = null
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth:token-changed", { detail: null }))
  }
}

export function isAccessTokenExpired(): boolean {
  if (!tokenExpiresAt) return !accessToken
  return Date.now() >= tokenExpiresAt
}

/** Decode a JWT payload client-side (NO signature check — a UI hint only). */
function decodeJwtPayload(token: string | null): Record<string, any> | null {
  if (!token) return null
  try {
    const part = token.split(".")[1]
    if (!part) return null
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"))
    return JSON.parse(json)
  } catch {
    return null
  }
}

/**
 * True when the CURRENT access token is a guest-session token (its `isGuest` claim).
 *
 * Read straight from the token so callers don't race the /auth/me query that
 * populates the guest flag in the React Query cache: the moment we have a token we
 * already know if it's a guest, so guest sessions never momentarily look like full
 * users and fire full-user-only requests (chats, friends, /users/me, …).
 */
export function isGuestToken(): boolean {
  return decodeJwtPayload(getAccessToken())?.isGuest === true
}

export function getTokenExpiresAt(): number | null {
  return tokenExpiresAt
}

// ── CSRF Token (from cookie) ─────────────────────────────────────────────────

const CSRF_COOKIE_NAME = "csrf_token"

/**
 * Get CSRF token from the non-HttpOnly cookie set by the server.
 * This is read on every request to ensure we always have the latest token.
 */
export function getCsrfToken(): string | null {
  return getCookie(CSRF_COOKIE_NAME)
}

// ── Clear All ────────────────────────────────────────────────────────────────

export function clearAllTokens(): void {
  clearAccessToken()
  // Note: CSRF and refresh token cookies are cleared by the server on logout
}

// ── Token Refresh State ──────────────────────────────────────────────────────

let isRefreshing = false
let refreshSubscribers: ((token: string | null) => void)[] = []

export function getIsRefreshing(): boolean {
  return isRefreshing
}

export function setIsRefreshing(value: boolean): void {
  isRefreshing = value
}

export function subscribeToRefresh(callback: (token: string | null) => void): void {
  refreshSubscribers.push(callback)
}

export function notifyRefreshSubscribers(token: string | null): void {
  refreshSubscribers.forEach((callback) => callback(token))
  refreshSubscribers = []
}
