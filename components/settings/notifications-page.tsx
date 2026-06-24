"use client";

import { useState, useEffect } from "react";
import { ChevronDown, MessageSquare, Users, Phone } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLobbyStore } from "@/components/lobby/lobby-store";
import { showSuccessToast, showErrorToast } from "@/src/api/error-handler";
import {
  ensurePushSubscription,
  removePushSubscription,
  isPushSupported,
  setPushOptOut,
} from "@/lib/push/push-manager";
import { detectInstallationType } from "@/lib/pwa/install-detection";

/** #profile/notification — sound, vibration, push and per-category alert preferences. */
export function NotificationsPage() {
  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto text-left">
      <NotificationSettingsSection />
    </div>
  );
}

export function NotificationSettingsSection() {
  const { notificationSettings, updateNotificationSettings } = useLobbyStore();

  // OS-level Web Push opt-in (must be triggered by a user gesture — this toggle).
  const [pushSupported] = useState(() => isPushSupported());
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported) return;
    (async () => {
      try {
        const granted =
          typeof Notification !== "undefined" && Notification.permission === "granted";
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setPushOn(granted && !!sub);
      } catch {
        /* ignore */
      }
    })();
  }, [pushSupported]);

  const handlePushToggle = async (val: boolean) => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      if (val) {
        const ok = await ensurePushSubscription(detectInstallationType(), true);
        setPushOn(ok);
        if (ok) {
          // User explicitly enabled → clear the opt-out so auto-resubscribe is allowed.
          setPushOptOut(false);
          showSuccessToast("Push notifications enabled");
        } else if (typeof Notification !== "undefined" && Notification.permission === "denied") {
          showErrorToast(
            new Error(
              "Notifications are blocked. Allow them in your browser/site settings, then try again.",
            ),
          );
        } else {
          // permission is still "default" → the prompt was dismissed without choosing.
          showErrorToast(new Error("Notification permission was dismissed. Tap the toggle and choose Allow."));
        }
      } else {
        // User explicitly disabled → remember it so we don't silently re-subscribe
        // on the next app open (browser permission stays "granted").
        setPushOptOut(true);
        await removePushSubscription();
        setPushOn(false);
        showSuccessToast("Push notifications disabled");
      }
    } catch (e) {
      showErrorToast(e as Error);
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* OS push opt-in — the control that actually enables background notifications */}
      {pushSupported && (
        <div className="bg-card text-card-foreground flex items-center justify-between gap-4 rounded-xl border border-border/80 p-6 shadow-sm">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Push Notifications</Label>
            <p className="text-xs text-muted-foreground">
              Get message alerts even when TalkMe is closed. Add the app to your home screen for the
              most reliable delivery.
            </p>
          </div>
          <Switch
            id="push-switch"
            checked={pushOn}
            disabled={pushBusy}
            onCheckedChange={handlePushToggle}
          />
        </div>
      )}

      <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border border-border/80 py-6 shadow-sm">
        <div className="px-6 pb-2">
          <h3 className="text-lg font-semibold text-foreground">Notification Settings</h3>
          <p className="text-sm text-muted-foreground">
            Manage your sound, vibration, and alert preferences
          </p>
        </div>

        {/* Global Sound Switch */}
        <div className="px-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Notification Sounds</Label>
              <p className="text-xs text-muted-foreground">
                Play sounds for incoming messages and alerts globally
              </p>
            </div>
            <Switch
              id="global-sound-switch"
              checked={notificationSettings.sound}
              onCheckedChange={(val) => updateNotificationSettings({ sound: val })}
            />
          </div>

          <div className="flex items-center justify-between border-t border-border/50 pt-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Conversation Tones</Label>
              <p className="text-xs text-muted-foreground">
                Play sounds for incoming and outgoing messages
              </p>
            </div>
            <Switch
              id="conv-tones-switch"
              checked={notificationSettings.conversationTones}
              onCheckedChange={(val) => updateNotificationSettings({ conversationTones: val })}
            />
          </div>

          <div className="flex items-center justify-between border-t border-border/50 pt-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Desktop Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Show previews and banner alerts on your desktop
              </p>
            </div>
            <Switch
              id="desktop-notifications-switch"
              checked={notificationSettings.desktop}
              onCheckedChange={(val) => updateNotificationSettings({ desktop: val })}
            />
          </div>
        </div>
      </div>

      {/* Messages Notifications Card */}
      <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border border-border/80 py-6 shadow-sm">
        <div className="px-6 pb-2 border-b border-border/50 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Messages</h3>
        </div>

        <div className="px-6 space-y-5">
          {/* Message Notification Tone */}
          <div className="space-y-1.5">
            <Label htmlFor="message-tone" className="text-xs font-semibold text-muted-foreground/80">
              Notification Tone
            </Label>
            <div className="relative">
              <select
                id="message-tone"
                value={notificationSettings.messageTone}
                onChange={(e) => updateNotificationSettings({ messageTone: e.target.value })}
                className="pl-3 pr-8 dark:bg-input/30 border-input h-10 w-full min-w-0 rounded-md border bg-card py-1 text-sm shadow-xs outline-none cursor-pointer appearance-none focus-visible:border-ring focus-visible:ring-[3px] text-foreground"
              >
                <option value="default" className="bg-card text-foreground">
                  Default (notification.wav)
                </option>
                <option value="chime" className="bg-card text-foreground">
                  Chime
                </option>
                <option value="chord" className="bg-card text-foreground">
                  Chord
                </option>
                <option value="ding" className="bg-card text-foreground">
                  Ding
                </option>
                <option value="none" className="bg-card text-foreground">
                  None (Silent)
                </option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            </div>
          </div>

          {/* Message Vibrate */}
          <div className="space-y-1.5">
            <Label htmlFor="message-vibrate" className="text-xs font-semibold text-muted-foreground/80">
              Vibrate
            </Label>
            <div className="relative">
              <select
                id="message-vibrate"
                value={notificationSettings.messageVibrate}
                onChange={(e) => updateNotificationSettings({ messageVibrate: e.target.value })}
                className="pl-3 pr-8 dark:bg-input/30 border-input h-10 w-full min-w-0 rounded-md border bg-card py-1 text-sm shadow-xs outline-none cursor-pointer appearance-none focus-visible:border-ring focus-visible:ring-[3px] text-foreground"
              >
                <option value="off" className="bg-card text-foreground">
                  Off
                </option>
                <option value="default" className="bg-card text-foreground">
                  Default
                </option>
                <option value="short" className="bg-card text-foreground">
                  Short
                </option>
                <option value="long" className="bg-card text-foreground">
                  Long
                </option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            </div>
          </div>

          {/* Message High Priority */}
          <div className="flex items-center justify-between border-t border-border/50 pt-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Use high priority notifications</Label>
              <p className="text-xs text-muted-foreground">
                Show previews of notifications at the top of the screen
              </p>
            </div>
            <Switch
              id="message-high-priority"
              checked={notificationSettings.messageHighPriority}
              onCheckedChange={(val) => updateNotificationSettings({ messageHighPriority: val })}
            />
          </div>

          {/* Message Reactions */}
          <div className="flex items-center justify-between border-t border-border/50 pt-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Reaction Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Show notifications for reactions to messages you send
              </p>
            </div>
            <Switch
              id="message-reactions"
              checked={notificationSettings.messageReactions}
              onCheckedChange={(val) => updateNotificationSettings({ messageReactions: val })}
            />
          </div>
        </div>
      </div>

      {/* Groups Notifications Card */}
      <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border border-border/80 py-6 shadow-sm">
        <div className="px-6 pb-2 border-b border-border/50 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Groups</h3>
        </div>

        <div className="px-6 space-y-5">
          {/* Group Notification Tone */}
          <div className="space-y-1.5">
            <Label htmlFor="group-tone" className="text-xs font-semibold text-muted-foreground/80">
              Notification Tone
            </Label>
            <div className="relative">
              <select
                id="group-tone"
                value={notificationSettings.groupTone}
                onChange={(e) => updateNotificationSettings({ groupTone: e.target.value })}
                className="pl-3 pr-8 dark:bg-input/30 border-input h-10 w-full min-w-0 rounded-md border bg-card py-1 text-sm shadow-xs outline-none cursor-pointer appearance-none focus-visible:border-ring focus-visible:ring-[3px] text-foreground"
              >
                <option value="default" className="bg-card text-foreground">
                  Default (notification.wav)
                </option>
                <option value="chime" className="bg-card text-foreground">
                  Chime
                </option>
                <option value="chord" className="bg-card text-foreground">
                  Chord
                </option>
                <option value="ding" className="bg-card text-foreground">
                  Ding
                </option>
                <option value="none" className="bg-card text-foreground">
                  None (Silent)
                </option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            </div>
          </div>

          {/* Group Vibrate */}
          <div className="space-y-1.5">
            <Label htmlFor="group-vibrate" className="text-xs font-semibold text-muted-foreground/80">
              Vibrate
            </Label>
            <div className="relative">
              <select
                id="group-vibrate"
                value={notificationSettings.groupVibrate}
                onChange={(e) => updateNotificationSettings({ groupVibrate: e.target.value })}
                className="pl-3 pr-8 dark:bg-input/30 border-input h-10 w-full min-w-0 rounded-md border bg-card py-1 text-sm shadow-xs outline-none cursor-pointer appearance-none focus-visible:border-ring focus-visible:ring-[3px] text-foreground"
              >
                <option value="off" className="bg-card text-foreground">
                  Off
                </option>
                <option value="default" className="bg-card text-foreground">
                  Default
                </option>
                <option value="short" className="bg-card text-foreground">
                  Short
                </option>
                <option value="long" className="bg-card text-foreground">
                  Long
                </option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            </div>
          </div>

          {/* Group High Priority */}
          <div className="flex items-center justify-between border-t border-border/50 pt-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Use high priority notifications</Label>
              <p className="text-xs text-muted-foreground">
                Show previews of notifications at the top of the screen
              </p>
            </div>
            <Switch
              id="group-high-priority"
              checked={notificationSettings.groupHighPriority}
              onCheckedChange={(val) => updateNotificationSettings({ groupHighPriority: val })}
            />
          </div>

          {/* Group Reactions */}
          <div className="flex items-center justify-between border-t border-border/50 pt-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Reaction Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Show notifications for reactions to messages you send
              </p>
            </div>
            <Switch
              id="group-reactions"
              checked={notificationSettings.groupReactions}
              onCheckedChange={(val) => updateNotificationSettings({ groupReactions: val })}
            />
          </div>
        </div>
      </div>

      {/* Calls Notifications Card */}
      <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border border-border/80 py-6 shadow-sm">
        <div className="px-6 pb-2 border-b border-border/50 flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Calls</h3>
        </div>

        <div className="px-6 space-y-5">
          {/* Call Ringtone */}
          <div className="space-y-1.5">
            <Label htmlFor="call-ringtone" className="text-xs font-semibold text-muted-foreground/80">
              Ringtone
            </Label>
            <div className="relative">
              <select
                id="call-ringtone"
                value={notificationSettings.callRingtone}
                onChange={(e) => updateNotificationSettings({ callRingtone: e.target.value })}
                className="pl-3 pr-8 dark:bg-input/30 border-input h-10 w-full min-w-0 rounded-md border bg-card py-1 text-sm shadow-xs outline-none cursor-pointer appearance-none focus-visible:border-ring focus-visible:ring-[3px] text-foreground"
              >
                <option value="default" className="bg-card text-foreground">
                  Default
                </option>
                <option value="ringing" className="bg-card text-foreground">
                  Ringing
                </option>
                <option value="none" className="bg-card text-foreground">
                  None (Silent)
                </option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            </div>
          </div>

          {/* Call Vibrate */}
          <div className="space-y-1.5">
            <Label htmlFor="call-vibrate" className="text-xs font-semibold text-muted-foreground/80">
              Vibrate
            </Label>
            <div className="relative">
              <select
                id="call-vibrate"
                value={notificationSettings.callVibrate}
                onChange={(e) => updateNotificationSettings({ callVibrate: e.target.value })}
                className="pl-3 pr-8 dark:bg-input/30 border-input h-10 w-full min-w-0 rounded-md border bg-card py-1 text-sm shadow-xs outline-none cursor-pointer appearance-none focus-visible:border-ring focus-visible:ring-[3px] text-foreground"
              >
                <option value="off" className="bg-card text-foreground">
                  Off
                </option>
                <option value="default" className="bg-card text-foreground">
                  Default
                </option>
                <option value="short" className="bg-card text-foreground">
                  Short
                </option>
                <option value="long" className="bg-card text-foreground">
                  Long
                </option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
