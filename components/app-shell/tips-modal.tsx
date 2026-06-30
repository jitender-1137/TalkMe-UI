"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Lightbulb,
  MessageCircle,
  Mic,
  Reply,
  Sparkles,
  Zap,
  Radio,
  Compass,
  Newspaper,
  CirclePlay,
  ShieldAlert,
  ScanEye,
  Eye,
  Lock,
  Bell,
  UserPlus,
  QrCode,
  Palette,
  UserCog,
  KeyRound,
  Mail,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TipsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Tip {
  icon: LucideIcon;
  title: string;
  /** What the feature is. */
  what: string;
  /** Where to find it in the app. */
  where: string;
  /** Step-by-step flow / how it works. */
  how: string[];
}

interface TipGroup {
  group: string;
  tips: Tip[];
}

const TIP_GROUPS: TipGroup[] = [
  {
    group: "Messaging",
    tips: [
      {
        icon: MessageCircle,
        title: "Private & Group Chats",
        what: "Real-time one-to-one and group conversations with people you know, complete with typing indicators, delivery and read receipts.",
        where: "Chats tab → tap a conversation (or start a new one).",
        how: [
          "Open the Chats tab to see all your conversations.",
          "Tap a conversation to open the thread, or start a new chat from a profile.",
          "Type in the composer and send; messages deliver instantly over a live connection.",
          "Ticks show when a message is delivered and when it is read.",
        ],
      },
      {
        icon: Mic,
        title: "Media & Voice Notes",
        what: "Share photos, videos, voice notes, audio, documents, GIFs and stickers inside any conversation.",
        where: "Inside a chat → attachment (+) and microphone buttons in the composer.",
        how: [
          "Tap the attachment button to pick a photo, video, or document, or to open the camera.",
          "Hold the microphone button to record a voice note, then release to send.",
          "Images are compressed automatically; large files are rejected with a clear limit.",
          "Uploads send in the background, so the chat stays responsive.",
        ],
      },
      {
        icon: Reply,
        title: "Replies",
        what: "Reply directly to a specific message so context is never lost, for any message type.",
        where: "Inside a chat → swipe or long-press a message, then choose Reply.",
        how: [
          "Swipe a bubble (or long-press → Reply) to quote it.",
          "A preview of the original appears above the composer.",
          "Send your reply; tapping the quoted preview jumps back to the original message.",
        ],
      },
      {
        icon: Sparkles,
        title: "Smart Replies",
        what: "Quick, context-aware reply suggestions generated privately, on your device — no server sees the text.",
        where: "Inside a chat → suggestion chips appear above the composer.",
        how: [
          "When you receive a message, suggestion chips appear above the keyboard.",
          "Instant suggestions show first; smarter ranked suggestions follow once the on-device model loads.",
          "Tap a chip to drop it into the composer — you can edit before sending.",
          "All processing happens in your browser; the message text is never sent to us for this.",
        ],
      },
    ],
  },
  {
    group: "Meet New People",
    tips: [
      {
        icon: Zap,
        title: "Quick Match (Anonymous)",
        what: "Instantly pair with a stranger for a one-on-one chat. Both identities stay completely hidden.",
        where: "Connect tab → Quick Match.",
        how: [
          "Open the Connect tab and tap Quick Match to enter the queue.",
          "You are paired with someone anonymously — no name, photo, or profile is shared either way.",
          "Chat, send GIFs, or request to share images (image sharing needs mutual permission).",
          "Either person can leave; conversations are ephemeral and not stored after the session ends.",
        ],
      },
      {
        icon: Radio,
        title: "Live Lobby",
        what: "A public room to see who's online right now and jump into open conversation.",
        where: "Connect tab → Lobby.",
        how: [
          "Open the Connect tab and tap Lobby.",
          "See who is currently active and start chatting in the shared space.",
          "Share voice notes, images, and stickers with the room.",
          "Tip: a drop in connection has a short grace window, so a brief disconnect won't drop you.",
        ],
      },
      {
        icon: Compass,
        title: "Discover People",
        what: "Browse and find new people to connect with based on profiles and interests.",
        where: "Discover tab.",
        how: [
          "Open the Discover tab to browse suggested profiles.",
          "Use filters to narrow by what matters to you.",
          "Open a profile to view details and start a chat or send a friend request.",
        ],
      },
    ],
  },
  {
    group: "Share & Explore",
    tips: [
      {
        icon: Newspaper,
        title: "Community Feed",
        what: "A public feed where you can post, like, and comment — and see who liked a post.",
        where: "News tab.",
        how: [
          "Open the News tab to view the community feed.",
          "Create a post with text and media; it becomes visible to the community.",
          "Like and comment on posts; tap the like count to see who liked it.",
          "Remember: feed content is public, so share accordingly.",
        ],
      },
      {
        icon: CirclePlay,
        title: "Stories",
        what: "Share ephemeral photo and video moments that appear at the top of the feed.",
        where: "News tab → Stories tray at the top.",
        how: [
          "Tap your story ring (or the + ) to add a photo or video with an optional caption.",
          "Tap any story in the tray to watch it full-screen.",
          "Stories are meant to be temporary — but assume anything shared online can be seen by others.",
        ],
      },
    ],
  },
  {
    group: "Safety & Privacy",
    tips: [
      {
        icon: ShieldAlert,
        title: "Mature (18+) Content & Consent",
        what: "Mature content is allowed only between consenting adults in a private 1:1 or Quick Match — never in groups, the lobby, the feed, Stories, or profiles.",
        where: "Inside a 1:1 chat or Quick Match → 18+ consent prompt.",
        how: [
          "If flagged content is sent, it is held — not delivered — until consent is granted.",
          "The recipient receives a request and can Accept, Decline, or respond Later.",
          "Once both consent, future explicit content flows between just the two of you.",
          "Either party can revoke consent at any time; repeated requests are limited.",
        ],
      },
      {
        icon: ScanEye,
        title: "Automated Moderation",
        what: "Text, images, and videos are screened automatically to keep the platform safe.",
        where: "Works everywhere, automatically — no setup needed.",
        how: [
          "Uploads and messages are checked for explicit or prohibited material.",
          "Violations in public surfaces (feed, groups, profiles, names) are blocked outright.",
          "Reports you file are reviewed alongside automated analysis.",
          "Trying to evade moderation is itself a rules violation.",
        ],
      },
      {
        icon: Eye,
        title: "Profile Views",
        what: "See who recently viewed your profile or photo, with a live unseen-count badge.",
        where: "Chats tab → eye icon in the header.",
        how: [
          "Tap the eye icon in the Chats header to open your Profile Views list.",
          "A badge shows how many new views you haven't seen yet.",
          "Opening the list clears the badge. Anonymous matches are never tracked here.",
        ],
      },
      {
        icon: Lock,
        title: "Presence & Visibility",
        what: "Control your online status, last-seen, and whether you appear active at all.",
        where: "Settings → Privacy & Safety.",
        how: [
          "Open Settings → Privacy & Safety.",
          "Toggle Invisible mode to always appear offline, or hide your last-seen time.",
          "Status shows as online, away, or offline based on your activity.",
        ],
      },
      {
        icon: Bell,
        title: "Notifications",
        what: "Get notified of new messages via in-app, desktop/browser, and push notifications.",
        where: "Settings → Notifications.",
        how: [
          "Open Settings → Notifications.",
          "Enable Desktop Notifications to get alerts when the tab is in the background (grant the browser permission when asked).",
          "Enable Push Notifications to be alerted even when the app is fully closed.",
          "Notifications require a secure (https) connection on mobile.",
        ],
      },
    ],
  },
  {
    group: "Your Account",
    tips: [
      {
        icon: UserCog,
        title: "Edit Profile & Avatar",
        what: "Update your display name, photo, age, city, bio, and interests.",
        where: "Settings → Edit Profile.",
        how: [
          "Open Settings → Edit Profile.",
          "Tap the camera icon to choose or capture a new avatar, then crop it.",
          "Edit your details and tap Save Changes. (Display name and avatar are moderated.)",
        ],
      },
      {
        icon: UserPlus,
        title: "Friends & Requests",
        what: "Manage your friends and incoming contact requests.",
        where: "Settings → Friends.",
        how: [
          "Open Settings → Friends to see your friends and pending requests.",
          "A badge on the Friends row shows how many requests are waiting.",
          "Accept or decline requests, and start chats with friends.",
        ],
      },
      {
        icon: QrCode,
        title: "My QR Code",
        what: "Share a personal QR code so others can start a chat with you quickly.",
        where: "Settings → My QR Code.",
        how: [
          "Open Settings → My QR Code.",
          "Show the code to someone so they can scan it to connect with you.",
        ],
      },
      {
        icon: Palette,
        title: "Appearance",
        what: "Personalize the look with light/dark themes, accent colors, and chat backgrounds.",
        where: "Settings → Appearance.",
        how: [
          "Open Settings → Appearance.",
          "Pick light, dark, or system theme and choose your accent colors.",
          "Set a custom chat background; your choices are remembered on your device.",
        ],
      },
      {
        icon: KeyRound,
        title: "Account & Deletion",
        what: "Manage account settings and delete your account with a 30-day recovery window.",
        where: "Settings → Account Settings.",
        how: [
          "Open Settings → Account Settings.",
          "Delete your account to deactivate it immediately.",
          "Log back in within 30 days to fully restore it; after that, data is permanently removed or anonymized.",
        ],
      },
      {
        icon: Mail,
        title: "Password Reset",
        what: "Recover access if you forget your password, via a secure emailed link.",
        where: "Login screen → Forgot password.",
        how: [
          "On the login screen, tap Forgot password and enter your email.",
          "We email a secure, one-time link (valid for a limited time).",
          "Open the link to set a new password; the link can only be used once.",
        ],
      },
    ],
  },
];

export function TipsModal({ isOpen, onClose }: TipsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-screen overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Tips &amp; How-To</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-muted"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-7 text-sm text-muted-foreground leading-relaxed scrollbar-thin">
              <p>
                A quick tour of everything TalkMe can do — what each feature is, where to find it,
                and how it works.
              </p>

              {TIP_GROUPS.map((group) => (
                <section key={group.group} className="space-y-3">
                  <h3 className="text-base font-semibold text-foreground">{group.group}</h3>
                  <div className="space-y-3">
                    {group.tips.map((tip) => {
                      const Icon = tip.icon;
                      return (
                        <div
                          key={tip.title}
                          className="rounded-xl border border-border bg-background/40 p-4 space-y-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
                              <Icon className="h-[18px] w-[18px] text-primary" />
                            </span>
                            <h4 className="text-sm font-semibold text-foreground">{tip.title}</h4>
                          </div>

                          <p className="text-xs">{tip.what}</p>

                          <div className="flex items-start gap-1.5 text-xs">
                            <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                            <span>
                              <span className="font-medium text-foreground">Where: </span>
                              {tip.where}
                            </span>
                          </div>

                          <div className="text-xs space-y-1">
                            <p className="font-medium text-foreground">How it works</p>
                            <ol className="list-decimal pl-5 space-y-1">
                              {tip.how.map((step, i) => (
                                <li key={i}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex justify-end">
              <Button onClick={onClose} className="px-6">
                Got it
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
