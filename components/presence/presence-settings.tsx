'use client'

import { motion } from 'framer-motion'
import { Ghost, Eye, EyeOff } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePresenceStore } from '@/lib/presence'
import { cn } from '@/lib/utils'

interface SettingRowProps {
  icon: React.ReactNode
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

function SettingRow({
  icon,
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
}: SettingRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center justify-between gap-4 rounded-lg border border-border p-4 transition-colors',
        checked ? 'bg-primary/5 border-primary/20' : 'bg-card',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
            checked ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          )}
        >
          {icon}
        </div>
        <div className="space-y-0.5">
          <Label
            htmlFor={title}
            className={cn(
              'text-sm font-medium cursor-pointer',
              disabled && 'cursor-not-allowed'
            )}
          >
            {title}
          </Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        id={title}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="data-[state=checked]:bg-primary"
      />
    </motion.div>
  )
}

export function PresenceSettings() {
  const ghostMode = usePresenceStore((state) => state.ghostMode)
  const hideLastSeen = usePresenceStore((state) => state.hideLastSeen)
  const invisibleMode = usePresenceStore((state) => state.invisibleMode)
  const setGhostMode = usePresenceStore((state) => state.setGhostMode)
  const setHideLastSeen = usePresenceStore((state) => state.setHideLastSeen)
  const setInvisibleMode = usePresenceStore((state) => state.setInvisibleMode)

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Privacy Settings</CardTitle>
        <CardDescription>
          Control how others see your online status and activity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <SettingRow
          icon={<Ghost className="h-5 w-5" />}
          title="Ghost Mode"
          description="Browse without triggering read receipts or typing indicators"
          checked={ghostMode}
          onCheckedChange={setGhostMode}
        />

        <SettingRow
          icon={<Eye className="h-5 w-5" />}
          title="Hide Last Seen"
          description="Others won't see when you were last active"
          checked={hideLastSeen}
          onCheckedChange={setHideLastSeen}
        />

        <SettingRow
          icon={<EyeOff className="h-5 w-5" />}
          title="Invisible Mode"
          description="Appear offline to everyone while still using the app"
          checked={invisibleMode}
          onCheckedChange={setInvisibleMode}
        />

        {invisibleMode && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 rounded-md p-3"
          >
            You are currently invisible. Others will see you as offline even when you&apos;re active.
          </motion.p>
        )}
      </CardContent>
    </Card>
  )
}
