"use client";

import { AvatarStatusBadge, PresenceSettings, PresenceDebugPanel } from "@/components/presence";
import { usePresenceStore } from "@/lib/presence";
import { useProfile } from "@/src/api/hooks/useProfile";

/** #profile/privacy — presence/visibility controls and developer tools. */
export function PrivacyPage() {
  const { data: userProfile } = useProfile();
  const status = usePresenceStore((state) => state.status);
  const invisibleMode = usePresenceStore((state) => state.invisibleMode);
  const displayStatus = invisibleMode ? "offline" : status;
  const name = userProfile?.name || "";

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto text-left">
      {/* Profile / status preview */}
      <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card/40">
        <AvatarStatusBadge
          fallback={(name || "U").slice(0, 2).toUpperCase()}
          status={displayStatus}
          size="xl"
        />
        <div>
          <h3 className="font-semibold text-foreground">{name}</h3>
          <p className="text-sm text-muted-foreground">
            Status: <span className="capitalize font-medium text-foreground">{displayStatus}</span>
          </p>
        </div>
      </div>

      {/* Presence & visibility controls (ghost mode, last seen, invisible) */}
      <PresenceSettings />

      {/* Developer tools */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground px-1">Developer Tools</h3>
        <PresenceDebugPanel />
      </div>
    </div>
  );
}
