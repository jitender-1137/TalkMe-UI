'use client'

import { useEffect } from 'react'
import { usePresenceTracker } from '@/lib/presence'

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  // Initialize presence tracking
  usePresenceTracker()

  return <>{children}</>
}
