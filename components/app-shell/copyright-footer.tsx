"use client";

import { cn } from "@/lib/utils";

/**
 * Shared copyright line used across the Me tab and the auth screens
 * (login / signup / guest). Brand + year kept in one place.
 */
export function CopyrightFooter({ className }: { className?: string }) {
  return (
    <p className={cn("text-center text-xs text-muted-foreground select-none", className)}>
      © 2026 TalkMe. All rights reserved.
    </p>
  );
}
