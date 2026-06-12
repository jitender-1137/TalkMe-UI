'use client'

import { motion } from 'framer-motion'
import { Wifi, WifiOff, Eye, EyeOff, Clock } from 'lucide-react'
import { usePresenceStore } from '@/lib/presence'
import { cn } from '@/lib/utils'

export function PresenceDebugPanel() {
  const status = usePresenceStore((state) => state.status)
  const isDocumentVisible = usePresenceStore((state) => state.isDocumentVisible)
  const isWindowFocused = usePresenceStore((state) => state.isWindowFocused)
  const isOnline = usePresenceStore((state) => state.isOnline)
  const lastActiveAt = usePresenceStore((state) => state.lastActiveAt)
  const invisibleMode = usePresenceStore((state) => state.invisibleMode)

  const statusColors = {
    online: 'bg-emerald-500',
    idle: 'bg-amber-500',
    offline: 'bg-gray-400',
  }

  const timeSinceActive = Math.round((Date.now() - lastActiveAt) / 1000)

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Presence Debug</h3>
        <div className="flex items-center gap-2">
          <motion.div
            key={status}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn('h-3 w-3 rounded-full', statusColors[status])}
          />
          <span className="text-sm font-medium capitalize">{status}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2 rounded-md bg-muted p-2">
          {isDocumentVisible ? (
            <Eye className="h-4 w-4 text-emerald-500" />
          ) : (
            <EyeOff className="h-4 w-4 text-gray-400" />
          )}
          <span className="text-muted-foreground">
            Document: <span className="text-foreground">{isDocumentVisible ? 'Visible' : 'Hidden'}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-md bg-muted p-2">
          <div
            className={cn(
              'h-2 w-2 rounded-full',
              isWindowFocused ? 'bg-emerald-500' : 'bg-gray-400'
            )}
          />
          <span className="text-muted-foreground">
            Window: <span className="text-foreground">{isWindowFocused ? 'Focused' : 'Blurred'}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-md bg-muted p-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-emerald-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <span className="text-muted-foreground">
            Network: <span className="text-foreground">{isOnline ? 'Online' : 'Offline'}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-md bg-muted p-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            Active: <span className="text-foreground">{timeSinceActive}s ago</span>
          </span>
        </div>
      </div>

      {invisibleMode && (
        <div className="text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 rounded-md p-2 text-center">
          Invisible Mode Active - Appearing as Offline
        </div>
      )}
    </div>
  )
}
