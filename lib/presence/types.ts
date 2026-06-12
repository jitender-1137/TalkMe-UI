export type PresenceStatus = 'online' | 'idle' | 'offline'

export interface PresenceState {
  status: PresenceStatus
  isDocumentVisible: boolean
  isWindowFocused: boolean
  isOnline: boolean
  lastActiveAt: number
  ghostMode: boolean
  hideLastSeen: boolean
  invisibleMode: boolean
}

export interface PresenceActions {
  setStatus: (status: PresenceStatus) => void
  setDocumentVisible: (visible: boolean) => void
  setWindowFocused: (focused: boolean) => void
  setOnline: (online: boolean) => void
  updateLastActive: () => void
  setGhostMode: (enabled: boolean) => void
  setHideLastSeen: (enabled: boolean) => void
  setInvisibleMode: (enabled: boolean) => void
  computePresence: () => PresenceStatus
}

export type PresenceStore = PresenceState & PresenceActions
