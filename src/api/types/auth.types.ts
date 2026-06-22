// ── Credentials ───────────────────────────────────────────────────────────────
export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
  captchaToken?: string
  /** Honeypot — left empty by real users. */
  website?: string
}

export interface SignupCredentials {
  name: string
  email: string
  password: string
  confirmPassword?: string
  username: string
  age: number
  gender: string
  captchaToken?: string
  website?: string
}

export interface ForgotPasswordPayload {
  email: string
}

export interface ResetPasswordPayload {
  token: string
  password: string
  confirmPassword: string
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

// ── Token data ────────────────────────────────────────────────────────────────
/**
 * Access token returned in response body.
 * Refresh token and CSRF token are set via Set-Cookie headers (not in body).
 */
export interface AuthTokens {
  /** JWT access token - short-lived (15 minutes), stored in memory only */
  accessToken: string
  /** Expiry time in seconds */
  expiresIn: number
}

// ── Responses ─────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string
  name: string
  username: string
  email?: string
  avatar: string | null
  isVerified: boolean
  isGuest: boolean
  createdAt: string
  age?: number
  gender?: string
  country?: string
  city?: string
  interests?: string[]
}

/**
 * Login response.
 * - accessToken comes in response body (stored in memory)
 * - refreshToken is set via HttpOnly cookie (browser handles automatically)
 * - csrfToken is set via non-HttpOnly cookie (readable by JS via document.cookie)
 */
export interface LoginResponse {
  user: AuthUser
  tokens: AuthTokens
}

export interface SignupResponse {
  user: AuthUser
  tokens: AuthTokens
}

/**
 * Refresh token response.
 * - New accessToken comes in response body
 * - New refreshToken is set via HttpOnly cookie (rotation)
 * - New csrfToken is set via non-HttpOnly cookie
 */
export interface RefreshTokenResponse {
  accessToken: string
  expiresIn: number
}

// ── Guest ─────────────────────────────────────────────────────────────────────
export interface GuestLoginPayload {
  name: string
  age: number
  gender: string
  captchaToken?: string
  website?: string
}

export interface GuestLoginResponse {
  user: AuthUser
  tokens: AuthTokens
}

// ── Session ───────────────────────────────────────────────────────────────────
export interface Session {
  id: string
  userId: string
  userAgent: string
  ipAddress: string
  lastActiveAt: string
  createdAt: string
  isCurrent: boolean
}

export interface SessionsResponse {
  sessions: Session[]
}
