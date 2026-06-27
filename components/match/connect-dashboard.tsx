"use client";

import { useState, useEffect } from "react";
import { LobbyDashboard } from "@/components/lobby";
import { MatchDashboard } from "./match-dashboard";
import { AppLayout } from "@/components/ui/app-layout";
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
  ArrowLeft,
  ShieldCheck,
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
import { useUrlModal } from "@/lib/navigation/use-url-modal";
import { useDesktopNotifications } from "@/hooks/use-desktop-notifications";
import { SafetyTipsModal } from "./safety-tips-modal";
import { HEADER_ICON_BTN, HEADER_ICON } from "@/components/ui/header-button";

type ConnectView = "connect" | "lobby" | "quick";

/** Energy/pulse backdrop for the Connect header: radiating signal rings. */
function ConnectBackdrop() {
  return (
    <svg
      viewBox="0 0 1100 200"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full opacity-80"
    >
      <defs>
        <radialGradient id="connect-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.8 0.2 165)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="oklch(0.8 0.2 165)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="700" cy="90" rx="200" ry="100" fill="url(#connect-glow)" />
      {/* radiating pulse rings from a node */}
      <g fill="none" stroke="oklch(0.82 0.18 165)" transform="translate(700 90)">
        <circle r="18" strokeWidth="2" strokeOpacity="0.8" />
        <circle r="42" strokeWidth="1.6" strokeOpacity="0.5" />
        <circle r="70" strokeWidth="1.3" strokeOpacity="0.32" />
        <circle r="100" strokeWidth="1" strokeOpacity="0.18" />
        {/* expanding radar pulses */}
        {[0, 1.3].map((begin, i) => (
          <circle key={i} r="18" strokeWidth="2" stroke="oklch(0.88 0.18 165)">
            <animate
              attributeName="r"
              values="18;105"
              dur="2.6s"
              begin={`${begin}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="stroke-opacity"
              values="0.7;0"
              dur="2.6s"
              begin={`${begin}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
        <circle r="0" fill="oklch(0.85 0.18 165)" stroke="none">
          <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
        </circle>
      </g>
      {/* scattered signal sparks */}
      {[
        [520, 60, 1.4],
        [600, 140, 1.2],
        [820, 50, 1.3],
        [860, 130, 1],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="oklch(0.9 0.08 165)" fillOpacity="0.8" />
      ))}
    </svg>
  );
}

/** Glowing circular lightning badge for the Connect header (project green). */
function ConnectLogo() {
  return (
    <div className="relative h-12 w-12 shrink-0">
      <span className="absolute inset-0 rounded-full bg-primary/30 blur-md" />
      <span className="absolute -inset-1 rounded-full border border-primary/30" />
      <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 border border-primary/40">
        <Zap className="h-6 w-6 text-primary fill-primary/30" />
      </div>
    </div>
  );
}

export function ConnectDashboard() {
  // Landing stays on the bare #match hash. Lobby / Quick-Match are pushed as
  // overlay segments (#match/lobby, #match/quick) so Back returns to #match.
  const [view, setView] = useState<ConnectView>("connect");
  const { isGuestMatch, isAuthenticated, logout, openLoginModal } = useAuth();

  // Lobby settings store selectors
  const showSettings = useLobbyStore((state) => state.showSettings);
  const setShowSettings = useLobbyStore((state) => state.setShowSettings);
  const notificationSettings = useLobbyStore((state) => state.notificationSettings);
  const updateNotificationSettings = useLobbyStore((state) => state.updateNotificationSettings);
  // Shared, permission-gated desktop-notification control (same logic as Settings).
  const {
    enabled: desktopNotifEnabled,
    supported: desktopNotifSupported,
    secure: desktopNotifSecure,
    setEnabled: setDesktopNotifEnabled,
  } = useDesktopNotifications();
  const blockedUsers = useLobbyStore((state) => state.blockedUsers);
  const unblockUser = useLobbyStore((state) => state.unblockUser);
  const clearAllData = useLobbyStore((state) => state.clearAllData);
  const lobbySelectedUser = useLobbyStore((state) => state.selectedUser);
  const setLobbySelectedUser = useLobbyStore((state) => state.setSelectedUser);
  const lobbyTab = useLobbyStore((state) => state.activeTab);
  const { theme, setTheme } = useTheme();
  const { status } = useMatchStore();
  const isMatchActive = status !== "idle";

  // "Before You Connect" safety tips modal (opened from the header shield).
  const [showSafety, setShowSafety] = useState(false);
  useUrlModal(showSafety, () => setShowSafety(false), "safety-tips");

  // Lobby & Quick-Match push their own history entry so Back returns to #match.
  // hideNav:false — these are tab-like views, not modals, so keep the bottom nav.
  useUrlModal(view === "lobby", () => setView("connect"), "lobby", { hideNav: false });
  useUrlModal(view === "quick", () => setView("connect"), "quick", { hideNav: false });

  // Opening a lobby chat pushes a third segment (#match/lobby → #match/lobby/chat)
  // so Back returns to the lobby list — which stays mounted, so its scroll
  // position is preserved. hideNav:false keeps it consistent with the lobby view.
  useUrlModal(
    view === "lobby" && !!lobbySelectedUser,
    () => setLobbySelectedUser(null),
    "chat",
    { hideNav: false },
  );

  // Keep the URL in step with an active match: starting from the lobby jumps to
  // the quick-match flow (#match/quick); ending it returns to the landing.
  useEffect(() => {
    if (isMatchActive && view === "lobby") setView("quick");
    else if (!isMatchActive && view === "quick") setView("connect");
  }, [isMatchActive, view]);

  const inLobby = view === "lobby" && !isMatchActive;

  return (
    <div className="h-full w-full">
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
                    {desktopNotifSupported
                      ? "Banner alerts when a message arrives and the app isn't focused"
                      : desktopNotifSecure
                        ? "Your browser doesn't support notifications"
                        : "Requires https — open the site over a secure connection to enable"}
                  </p>
                </div>
                <Switch
                  disabled={!desktopNotifSupported}
                  checked={desktopNotifEnabled}
                  onCheckedChange={setDesktopNotifEnabled}
                />
              </div>
            </div>

            {/* Theme Selector */}
            <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-4 shadow-inner">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                Interface Customization
              </h3>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    {theme === "dark" ? (
                      <Moon className="w-4 h-4 text-primary animate-pulse" />
                    ) : (
                      <Sun className="w-4 h-4 text-primary animate-spin-slow" />
                    )}
                    Select Theme Mode
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Adjust the visual styling of your interface
                  </p>
                </div>
              </div>

              <div className="flex bg-muted p-1 rounded-xl border border-border shadow-inner mt-1">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={cn(
                    "flex-1 h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all select-none active:scale-95 cursor-pointer",
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
                    "flex-1 h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all select-none active:scale-95 cursor-pointer",
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
                    "flex-1 h-9 rounded-lg text-xs font-semibold flex items-center justify-center transition-all select-none active:scale-95 cursor-pointer",
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
                className="w-full h-11 bg-destructive/10 hover:bg-destructive text-destructive hover:text-destructive-foreground border border-destructive/20 hover:border-transparent rounded-xl transition-all font-semibold flex items-center justify-center gap-2 active:scale-95 shadow-sm cursor-pointer"
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

      <AppLayout
        title="Connect"
        icon={Zap}
        logoNode={<ConnectLogo />}
        headerBackdrop={<ConnectBackdrop />}
        subtitle="Talk to someone new"
        disableCollapse
        scrollKey={inLobby ? `tab:connect:lobby:${lobbyTab}` : "tab:connect"}
        disableBottomPadding={(view === "lobby" && !!lobbySelectedUser) || isMatchActive}
        headerRight={
          <div className="flex items-center gap-2">
            {inLobby ? (
              // In the lobby, the right slot becomes a "back to Connect" control.
              <button
                onClick={() => setView("connect")}
                aria-label="Back to Connect"
                className={cn(HEADER_ICON_BTN, "w-auto gap-1.5 px-3 text-sm font-semibold")}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Connect</span>
              </button>
            ) : (
              <button
                onClick={() => setShowSafety(true)}
                title="Safety tips"
                aria-label="Safety tips"
                className={HEADER_ICON_BTN}
              >
                <ShieldCheck className={HEADER_ICON} />
              </button>
            )}

            {(!isAuthenticated || isGuestMatch) && (
              <button
                onClick={openLoginModal}
                aria-label="Login"
                className={cn(
                  HEADER_ICON_BTN,
                  "sm:w-auto sm:gap-1.5 sm:px-3 sm:text-sm sm:font-semibold",
                )}
              >
                <LogIn className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Login</span>
              </button>
            )}

            <button
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
              className={HEADER_ICON_BTN}
            >
              <Settings className={HEADER_ICON} />
            </button>

            {isGuestMatch && (
              <button onClick={logout} aria-label="Log out" className={HEADER_ICON_BTN}>
                <LogOut className={HEADER_ICON} />
              </button>
            )}
          </div>
        }
      >
        {/* Bounded, flexible height so the lobby/match chat areas scroll internally */}
        <div className="flex-1 min-h-0 flex flex-col w-full">
          {inLobby ? (
            <LobbyDashboard />
          ) : (
            <MatchDashboard onGoToLobby={() => setView("lobby")} onStart={() => setView("quick")} />
          )}
        </div>
      </AppLayout>

      <SafetyTipsModal isOpen={showSafety} onClose={() => setShowSafety(false)} />
    </div>
  );
}
