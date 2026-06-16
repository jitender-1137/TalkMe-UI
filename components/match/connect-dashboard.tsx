"use client";

import { useState, useEffect } from "react";
import { LobbyDashboard } from "@/components/lobby";
import { MatchDashboard } from "./match-dashboard";
import {
  Radio,
  Zap,
  Settings,
  LogOut,
  LogIn,
  Volume2,
  Bell,
  Sun,
  Moon,
  Trash2,
  Lock,
  UserMinus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/app-shell/auth-context";
import { useLobbyStore } from "@/components/lobby/lobby-store";
import { useMatchStore } from "./match-store";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";

export function ConnectDashboard() {
  const [activeSubTab, setActiveSubTab] = useState<"lobby" | "match">("lobby");
  const { isGuestMatch, isAuthenticated, logout, openLoginModal } = useAuth();
  
  // Lobby settings store selectors
  const showSettings = useLobbyStore((state) => state.showSettings);
  const setShowSettings = useLobbyStore((state) => state.setShowSettings);
  const notificationSettings = useLobbyStore((state) => state.notificationSettings);
  const updateNotificationSettings = useLobbyStore((state) => state.updateNotificationSettings);
  const blockedUsers = useLobbyStore((state) => state.blockedUsers);
  const unblockUser = useLobbyStore((state) => state.unblockUser);
  const clearAllData = useLobbyStore((state) => state.clearAllData);
  const { theme, setTheme } = useTheme();
  const { status } = useMatchStore();
  const isMatchActive = status !== "idle";

  // Prevent user from switching to the Lobby subtab if match is active (searching, matched, or disconnected)
  useEffect(() => {
    if (isMatchActive) {
      setActiveSubTab("match");
    }
  }, [isMatchActive]);

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* Settings Drawer */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent className="bg-card border-border text-foreground w-full sm:max-w-md">
          <SheetHeader className="border-b border-border pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 text-primary rounded-2xl border border-primary/10">
                <Settings className="w-5 h-5 transition-transform duration-700 hover:rotate-90" />
              </div>
              <div>
                <SheetTitle className="text-foreground font-bold text-lg leading-tight">
                  Lobby Settings
                </SheetTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Customise your transient lobby & chat profile preferences
                </p>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-6 pt-6 pb-8 px-1 overflow-y-auto max-h-[calc(100vh-120px)] custom-scrollbar">
            {/* Preferences Group */}
            <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-4 shadow-inner">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                App Preferences
              </h3>

              {/* Notification sound switch */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-primary" />
                    Sound Effects
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Play notification sound on new messages
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.sound}
                  onCheckedChange={(val) => updateNotificationSettings({ sound: val })}
                />
              </div>

              <div className="h-px bg-border/40" />

              {/* Notification desktop switch */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    Desktop Notifications
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Show desktop alert cards for new activity
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.desktop}
                  onCheckedChange={(val) => updateNotificationSettings({ desktop: val })}
                />
              </div>
            </div>

            {/* Theme switcher */}
            <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-3 shadow-inner">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                Theme & Appearance
              </h3>
              <div className="flex gap-2 bg-muted/60 p-1.5 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={cn(
                    "flex-1 h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all select-none active:scale-95",
                    theme === "light"
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Sun className="w-4 h-4" />
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "flex-1 h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all select-none active:scale-95",
                    theme === "dark"
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Moon className="w-4 h-4" />
                  Dark
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("system")}
                  className={cn(
                    "flex-1 h-9 rounded-lg text-xs font-semibold flex items-center justify-center transition-all select-none active:scale-95",
                    theme === "system"
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  System
                </button>
              </div>
            </div>

            {/* Blocked Users Section */}
            <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-3 shadow-inner">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-primary" />
                Privacy & Blocks ({blockedUsers.length})
              </h3>
              {blockedUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground/80 italic py-1 select-none">
                  No blocked users in this session
                </p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {blockedUsers.map((username, idx) => (
                    <div
                      key={username || `block-${idx}`}
                      className="flex items-center justify-between p-2 rounded-xl bg-card border border-border"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold flex items-center justify-center border border-destructive/20 select-none shrink-0">
                          {(username || "G").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-foreground/90 truncate max-w-[120px]">
                          @{username}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[11px] text-destructive hover:text-destructive-foreground hover:bg-destructive h-7 px-2.5 rounded-lg transition-all flex items-center gap-1 active:scale-95 shrink-0"
                        onClick={() => unblockUser(username)}
                      >
                        <UserMinus className="w-3 h-3" />
                        Unblock
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="bg-destructive/5 border border-destructive/10 rounded-2xl p-4 space-y-3">
              <h3 className="text-[10px] font-bold text-destructive uppercase tracking-wider select-none">
                Danger Zone
              </h3>
              <Button
                variant="destructive"
                className="w-full h-11 bg-destructive/10 hover:bg-destructive text-destructive hover:text-destructive-foreground border border-destructive/20 hover:border-transparent rounded-xl transition-all font-semibold flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                onClick={() => {
                  if (confirm("Are you sure you want to clear all transient chat history?")) {
                    clearAllData();
                    setShowSettings(false);
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
                Clear Local Chat History
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Subtab Bar */}
      <div className="flex items-center justify-between bg-card border-b border-border py-2 px-4 shrink-0">
        {/* Left: Tab Switcher */}
        <div className="flex items-center bg-muted p-1 rounded-xl border border-border shadow-inner">
          <button
            onClick={() => !isMatchActive && setActiveSubTab("lobby")}
            disabled={isMatchActive}
            className={cn(
              "flex items-center gap-1.5 px-3 md:px-5 py-1.5 rounded-lg text-sm font-semibold transition-all select-none active:scale-95",
              isMatchActive && "opacity-50 cursor-not-allowed",
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
          {(!isAuthenticated || isGuestMatch) && (
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

          {isGuestMatch && (
            <Button
              size="icon"
              variant="outline"
              onClick={logout}
              className="w-8 h-8 text-destructive hover:text-destructive-foreground hover:bg-destructive/20 border-destructive/30 rounded-xl transition-all flex items-center justify-center shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Subtab Content */}
      <div className="flex-1 overflow-hidden">
        {activeSubTab === "lobby" ? <LobbyDashboard /> : <MatchDashboard />}
      </div>
    </div>
  );
}

