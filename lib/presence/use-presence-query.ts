'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePresenceStore } from './store'
import type { PresenceStatus } from './types'

// Simulated API calls - replace with real API endpoints
async function fetchPresence(userId: string): Promise<{ status: PresenceStatus; lastSeen: number }> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100))
  return {
    status: 'online',
    lastSeen: Date.now(),
  }
}

async function updatePresenceAPI(data: { userId: string; status: PresenceStatus }): Promise<void> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100))
  console.log('[v0] Presence synced to server:', data)
}

export function usePresenceQuery(userId: string) {
  return useQuery({
    queryKey: ['presence', userId],
    queryFn: () => fetchPresence(userId),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })
}

export function usePresenceMutation() {
  const queryClient = useQueryClient()
  const status = usePresenceStore((state) => state.status)
  const invisibleMode = usePresenceStore((state) => state.invisibleMode)

  return useMutation({
    mutationFn: (userId: string) =>
      updatePresenceAPI({
        userId,
        status: invisibleMode ? 'offline' : status,
      }),
    onSuccess: (_, userId) => {
      // Invalidate presence queries after update
      queryClient.invalidateQueries({ queryKey: ['presence', userId] })
    },
  })
}

// Hook to sync local presence with server
export function usePresenceSync(userId: string) {
  const mutation = usePresenceMutation()
  const status = usePresenceStore((state) => state.status)
  const invisibleMode = usePresenceStore((state) => state.invisibleMode)

  // Sync presence when status changes
  const syncPresence = () => {
    mutation.mutate(userId)
  }

  return {
    syncPresence,
    isSyncing: mutation.isPending,
    effectiveStatus: invisibleMode ? 'offline' : status,
  }
}
