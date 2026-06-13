'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PresenceStore, PresenceStatus } from './types'

const IDLE_TIMEOUT = 5 * 60 * 1000 // 5 minutes

export const usePresenceStore = create<PresenceStore>()(
  persist(
    (set, get) => ({
      // State
      status: 'online',
      isDocumentVisible: true,
      isWindowFocused: true,
      isOnline: true,
      lastActiveAt: Date.now(),
      ghostMode: false,
      hideLastSeen: false,
      invisibleMode: false,

      // Actions
      setStatus: (status: PresenceStatus) => {
        set({ status })
      },

      setDocumentVisible: (visible: boolean) => {
        set({ isDocumentVisible: visible })
        if (visible) {
          get().updateLastActive()
        }
        get().computePresence()
      },

      setWindowFocused: (focused: boolean) => {
        set({ isWindowFocused: focused })
        if (focused) {
          get().updateLastActive()
        }
        get().computePresence()
      },

      setOnline: (online: boolean) => {
        set({ isOnline: online })
        get().computePresence()
      },

      updateLastActive: () => {
        set({ lastActiveAt: Date.now() })
      },

      setGhostMode: (enabled: boolean) => {
        set({ ghostMode: enabled })
      },

      setHideLastSeen: (enabled: boolean) => {
        set({ hideLastSeen: enabled })
      },

      setInvisibleMode: (enabled: boolean) => {
        set({ invisibleMode: enabled })
        get().computePresence()
      },

      computePresence: () => {
        const state = get()
        
        // If invisible mode is on, always appear offline
        if (state.invisibleMode) {
          set({ status: 'offline' })
          return 'offline'
        }

        // If offline, status is offline
        if (!state.isOnline) {
          set({ status: 'offline' })
          return 'offline'
        }

        // Check if idle (not active for IDLE_TIMEOUT)
        const timeSinceLastActive = Date.now() - state.lastActiveAt
        const isIdle = timeSinceLastActive > IDLE_TIMEOUT

        // If document hidden or window not focused, or idle timeout reached
        if (!state.isDocumentVisible || !state.isWindowFocused || isIdle) {
          set({ status: 'idle' })
          return 'idle'
        }

        // Otherwise, online
        set({ status: 'online' })
        return 'online'
      },
    }),
    {
      name: 'presence-settings',
      partialize: (state) => ({
        ghostMode: state.ghostMode,
        hideLastSeen: state.hideLastSeen,
        invisibleMode: state.invisibleMode,
      }),
    }
  )
)
