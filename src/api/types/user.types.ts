export type PresenceStatus = "online" | "idle" | "offline"

// ── Core user shape ───────────────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  email?: string
  username: string
  avatar: string | null
  bio: string | null
  phone: string | null
  isVerified: boolean
  isGuest: boolean
  isBlocked: boolean
  presence: PresenceStatus
  lastSeen: string | null
  createdAt: string
  updatedAt: string
  age?: number | null
  country?: string | null
  city?: string | null
  interests?: string[] | null
  occupation?: string | null
  education?: string | null
  gender?: string | null
}

// ── Profile update ────────────────────────────────────────────────────────────
export interface UpdateProfilePayload {
  name?: string
  bio?: string
  phone?: string
  avatar?: string
  profileImage?: string
  age?: number
  country?: string
  city?: string
  interests?: string[]
}

// ── Privacy settings ──────────────────────────────────────────────────────────
export interface PrivacySettings {
  showLastSeen: "everyone" | "contacts" | "nobody"
  showOnlineStatus: "everyone" | "contacts" | "nobody"
  showProfilePhoto: "everyone" | "contacts" | "nobody"
  readReceipts: boolean
  ghostMode: boolean
  invisibleMode: boolean
}

// ── App settings ──────────────────────────────────────────────────────────────
export interface AppSettings {
  theme: "light" | "dark" | "system"
  language: string
  notifications: boolean
  soundEnabled: boolean
  fontSize: "small" | "medium" | "large"
}

// ── Blocked user ──────────────────────────────────────────────────────────────
export interface BlockedUser {
  id: string
  name: string
  avatar: string | null
  blockedAt: string
}
