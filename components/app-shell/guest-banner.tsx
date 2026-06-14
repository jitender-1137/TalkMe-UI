"use client";

import { X, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "./auth-context";

export function GuestBanner() {
  const { isAuthenticated, openSignupModal } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);

  if (isAuthenticated || isDismissed) return null;

  return (
    <div className="bg-warning text-warning-foreground px-2 md:px-20 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Sparkles className="h-4 w-4 shrink-0" />
        <p className="text-sm font-medium truncate">
          {"You're browsing in Guest Mode. Sign up to unlock all features!"}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="secondary"
          onClick={openSignupModal}
          className="bg-warning-foreground text-warning hover:bg-warning-foreground/90 h-7 px-3 text-xs font-semibold"
        >
          Sign Up
        </Button>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 hover:bg-warning-foreground/10 rounded transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
