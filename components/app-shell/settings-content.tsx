"use client"

import { Settings, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PresenceSettings, PresenceDebugPanel, AvatarStatusBadge } from "@/components/presence"
import { usePresenceStore } from "@/lib/presence"

export function SettingsContent() {
  const status = usePresenceStore((state) => state.status)
  const invisibleMode = usePresenceStore((state) => state.invisibleMode)

  const displayStatus = invisibleMode ? "offline" : status

  return (
    <div className="flex flex-col h-[100dvh]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Settings</h2>
            <p className="text-xs text-muted-foreground">Manage your preferences</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto pb-24 md:pb-8">
        <div className="p-4 space-y-6 max-w-2xl">
          {/* Profile Preview */}
          <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
            <AvatarStatusBadge
              fallback="YO"
              status={displayStatus}
              size="xl"
            />
            <div>
              <h3 className="font-semibold text-foreground">Your Profile</h3>
              <p className="text-sm text-muted-foreground">
                Status: <span className="capitalize font-medium text-foreground">{displayStatus}</span>
              </p>
            </div>
          </div>

          {/* Presence Settings */}
          <PresenceSettings />

          {/* Debug Panel */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground px-1">
              Developer Tools
            </h3>
            <PresenceDebugPanel />
          </div>

          {/* Avatar Status Demo */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground px-1">
              Status Badge Preview
            </h3>
            <div className="flex items-center gap-6 p-4 rounded-lg border border-border bg-card">
              <div className="flex flex-col items-center gap-2">
                <AvatarStatusBadge fallback="ON" status="online" size="lg" />
                <span className="text-xs text-muted-foreground">Online</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <AvatarStatusBadge fallback="ID" status="idle" size="lg" />
                <span className="text-xs text-muted-foreground">Idle</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <AvatarStatusBadge fallback="OF" status="offline" size="lg" />
                <span className="text-xs text-muted-foreground">Offline</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
