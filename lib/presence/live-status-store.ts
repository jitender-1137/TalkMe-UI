"use client"

import { create } from "zustand"
import type { PresenceStatus } from "./types"

export interface LivePresenceEntry {
  status: PresenceStatus // "online" | "idle" | "offline"
  lastSeen: string | null
}

interface LivePresenceState {
  /** Live presence of OTHER users, keyed by their backend user UUID. */
  byUser: Record<string, LivePresenceEntry>
  /** Called from the WebSocket presence handler for every presence event. */
  setStatus: (userId: string, status: string, lastSeen: string | null) => void
}

/** Map the server's status vocabulary (ONLINE/OFFLINE/IDLE/AWAY/INVISIBLE) onto
 *  the 3-value UI vocabulary used by AvatarStatusBadge. */
function normalize(status: string): PresenceStatus {
  switch ((status || "offline").toLowerCase()) {
    case "online":
      return "online"
    case "idle":
    case "away":
      return "idle"
    default:
      return "offline" // offline, invisible, unknown
  }
}

/**
 * Single global source of truth for OTHER users' real-time presence. The
 * WebSocket presence handler writes here once; every view (chat list, chat
 * header, friends, discover, …) reads via {@link useLivePresence} and updates
 * live — no per-component event wiring, no refetch needed.
 */
export const useLivePresenceStore = create<LivePresenceState>((set) => ({
  byUser: {},
  setStatus: (userId, status, lastSeen) => {
    if (!userId) return
    set((s) => ({
      byUser: { ...s.byUser, [userId]: { status: normalize(status), lastSeen } },
    }))
  },
}))

/**
 * Reactive live presence for a single user. Returns undefined until a presence
 * event for that user has arrived — callers should fall back to the entity's own
 * presence field for the initial value.
 */
export function useLivePresence(userId?: string | null): LivePresenceEntry | undefined {
  return useLivePresenceStore((s) => (userId ? s.byUser[userId] : undefined))
}
