"use client";

import { useEffect } from "react";
import { Eye, Image as ImageIcon, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/utils";
import { useProfileViews, useMarkProfileViewsSeen } from "@/src/api/hooks/useProfileViews";
import { useProfileViewer } from "@/components/profile/use-profile-viewer";
import type { ProfileView } from "@/src/api/services/profile-views.service";

/** Short relative time, e.g. "just now", "5m", "3h", "2d". */
function relativeTime(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(then).toLocaleDateString();
}

export function ProfileViewsPage() {
  const { data: views = [], isLoading } = useProfileViews();
  const markSeen = useMarkProfileViewsSeen();
  const { openProfile } = useProfileViewer();

  // Opening this list clears the "new viewers" badge.
  useEffect(() => {
    markSeen.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (views.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 px-8 text-center">
        <span className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Eye className="h-6 w-6 text-muted-foreground" />
        </span>
        <p className="text-base font-medium text-foreground">No profile views yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          When someone opens your profile, you&apos;ll see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 max-w-2xl mx-auto py-3">
      <p className="px-1 mb-2.5 text-sm text-muted-foreground">
        {views.length} {views.length === 1 ? "person" : "people"} viewed your profile
      </p>
      <div className="bg-card rounded-2xl divide-y divide-border/50 overflow-hidden border border-border">
        {views.map((v: ProfileView) => {
          const isPhoto = v.viewType === "PROFILE_IMAGE";
          return (
            <button
              key={v.viewer.id}
              onClick={() => openProfile({ userId: v.viewer.id })}
              className="w-full px-3.5 py-3 flex items-center gap-3 hover:bg-muted/20 active:bg-muted/40 transition-colors text-left"
            >
              <Avatar className="h-11 w-11 shrink-0">
                <AvatarImage src={getAvatarUrl(v.viewer.avatar, v.viewer.gender)} alt={v.viewer.name} />
                <AvatarFallback>{(v.viewer.name || v.viewer.username || "?").charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-medium text-foreground truncate">
                  {v.viewer.name || v.viewer.username}
                  {!v.seen && (
                    <span className="ml-2 inline-block h-2 w-2 rounded-full bg-primary align-middle" />
                  )}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                  {isPhoto ? <ImageIcon className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {isPhoto ? "Viewed your photo" : "Viewed your profile"}
                  {v.viewCount > 1 && <span>· {v.viewCount}×</span>}
                </span>
              </span>
              <span className="text-xs text-muted-foreground shrink-0">{relativeTime(v.lastViewedAt)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
