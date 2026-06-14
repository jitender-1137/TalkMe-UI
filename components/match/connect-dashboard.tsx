"use client";

import { useState } from "react";
import { LobbyDashboard } from "@/components/lobby";
import { MatchDashboard } from "./match-dashboard";
import { Radio, Zap, Settings, LogOut, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/app-shell/auth-context";
import { useLobbyStore } from "@/components/lobby/lobby-store";

export function ConnectDashboard() {
  const [activeSubTab, setActiveSubTab] = useState<"lobby" | "match">("lobby");
  const { isGuestMatch, isAuthenticated, logout, openLoginModal } = useAuth();
  const setShowSettings = useLobbyStore((state) => state.setShowSettings);

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* Subtab Bar */}
      <div className="flex items-center justify-between bg-card border-b border-border py-2 px-4 shrink-0">
        {/* Left: Tab Switcher */}
        <div className="flex items-center bg-muted p-1 rounded-xl border border-border shadow-inner">
          <button
            onClick={() => setActiveSubTab("lobby")}
            className={cn(
              "flex items-center gap-1.5 px-3 md:px-5 py-1.5 rounded-lg text-sm font-semibold transition-all select-none active:scale-95",
              activeSubTab === "lobby"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/15"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Radio className="h-4 w-4" />
            Lobby
          </button>
          <button
            onClick={() => setActiveSubTab("match")}
            className={cn(
              "flex items-center gap-1.5 px-3 md:px-5 py-1.5 rounded-lg text-sm font-semibold transition-all select-none active:scale-95",
              activeSubTab === "match"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/15"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Zap className="h-4 w-4" />
            Matchmaker
          </button>
        </div>

        {/* Right: Auth + Settings */}
        <div className="flex items-center gap-2">
          {isGuestMatch ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={openLoginModal}
                className="text-xs text-primary hover:text-primary-foreground hover:bg-primary/20 border-primary/30 h-8 w-8 sm:w-auto px-0 sm:px-3 rounded-xl transition-all font-semibold flex items-center justify-center"
              >
                <LogIn className="w-3.5 h-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Login</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={logout}
                className="text-xs text-destructive hover:text-destructive-foreground hover:bg-destructive/20 border-destructive/30 h-8 w-8 sm:w-auto px-0 sm:px-3 rounded-xl transition-all font-semibold flex items-center justify-center"
              >
                <LogOut className="w-3.5 h-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          ) : isAuthenticated ? (
            <Button
              size="sm"
              variant="outline"
              onClick={logout}
              className="text-xs text-destructive hover:text-destructive-foreground hover:bg-destructive/20 border-destructive/30 h-8 w-8 sm:w-auto px-0 sm:px-3 rounded-xl transition-all font-semibold flex items-center justify-center"
            >
              <LogOut className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={openLoginModal}
              className="text-xs text-primary hover:text-primary-foreground hover:bg-primary/20 border-primary/30 h-8 w-8 sm:w-auto px-0 sm:px-3 rounded-xl transition-all font-semibold flex items-center justify-center"
            >
              <LogIn className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Login</span>
            </Button>
          )}

          <Button
            size="icon"
            variant="secondary"
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 bg-muted hover:bg-primary text-foreground hover:text-primary-foreground rounded-xl transition-all"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Subtab Content */}
      <div className="flex-1 overflow-hidden">
        {activeSubTab === "lobby" ? <LobbyDashboard /> : <MatchDashboard />}
      </div>
    </div>
  );
}
