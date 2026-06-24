'use client'

import { useEffect, useRef } from 'react'
import { usePresenceTracker, usePresenceStore } from '@/lib/presence'
import { useProfile } from '@/src/api/hooks/useProfile'
import { PresenceService } from '@/src/api/services/presence.service'

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  // Initialize presence tracking
  usePresenceTracker()

  // Hydrate the privacy toggles from the backend (source of truth) on login, so the
  // switches are correct even on a fresh browser/device where localStorage is empty —
  // and so the local UI never disagrees with what others actually see.
  const { data: profile } = useProfile()
  const username = (profile as any)?.username as string | undefined
  const hydratedFor = useRef<string | null>(null)
  const setGhostMode = usePresenceStore((s) => s.setGhostMode)
  const setInvisibleMode = usePresenceStore((s) => s.setInvisibleMode)
  const setHideLastSeen = usePresenceStore((s) => s.setHideLastSeen)

  useEffect(() => {
    if (!username || hydratedFor.current === username) return
    hydratedFor.current = username
    PresenceService.getMySettings(username)
      .then((s) => {
        setGhostMode(s.ghostMode)
        setInvisibleMode(s.invisibleMode)
        setHideLastSeen(s.hideLastSeen)
      })
      .catch(() => {
        // Allow a retry on the next render if the hydration call failed.
        hydratedFor.current = null
      })
  }, [username, setGhostMode, setInvisibleMode, setHideLastSeen])

  return <>{children}</>
}
