"use client";

import { useState, useEffect, useRef } from "react";
import {
  Camera,
  Save,
  Lock,
  KeyRound,
  X,
  Palette,
  Image as ImageIcon,
  Trash2,
  ChevronDown,
  MessageCircle,
  Bell,
  QrCode,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  FileText,
  ShieldCheck,
  Cookie,
  Info,
  MessageSquareText,
  Settings,
  User,
  Users,
  RefreshCw,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CameraModal } from "@/components/chat/camera-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AppearanceSettings } from "./appearance-settings";
import { cn } from "@/lib/utils";
import { useProfile, useUpdateProfile, useUploadAvatar } from "@/src/api/hooks/useProfile";
import { useContactRequests } from "@/src/api/hooks/useContacts";
import { FriendsOverlay } from "@/components/friends";
import { useScrollRestore } from "@/lib/navigation/scroll-restore";
import { AvatarCropperModal } from "@/components/settings/avatar-cropper-modal";
import { showSuccessToast } from "@/src/api/error-handler";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TermsModal } from "./terms-modal";
import { PrivacyModal } from "./privacy-modal";
import { CookieModal } from "./cookie-modal";
import { AboutModal } from "./about-modal";
import { ContactUsModal } from "./contact-us-modal";
import { CopyrightFooter } from "./copyright-footer";
import { useUrlModal } from "@/lib/navigation/use-url-modal";
import type { InfoPage } from "./info-pages";
import { AccountPage } from "@/components/settings/account-page";
import { PrivacyPage } from "@/components/settings/privacy-page";
import { ChatsPage } from "@/components/settings/chats-page";
import { NotificationsPage } from "@/components/settings/notifications-page";
import { HelpPage } from "@/components/settings/help-page";

const ALLOWED_INTERESTS = [
  "ART",
  "MUSIC",
  "FITNESS",
  "CODING",
  "TECHNOLOGY",
  "GAMING",
  "ANIME",
  "OUTDOORS",
  "FASHION",
  "TRAVEL",
  "PHOTOGRAPHY",
  "FOOD",
  "SPORTS",
  "MOVIES",
  "READING",
];

interface UserProfile {
  name: string;
  age: number;
  country: string;
  city: string;
  bio: string;
  interests: string[];
  profileImage: string;
  username: string;
}

type SubView =
  | "menu"
  | "edit-profile"
  | "account"
  | "privacy"
  | "chats"
  | "notifications"
  | "appearance"
  | "help";

// Each drill-down sub-view maps to a nested hash segment (#profile/<segment>).
const SUBVIEW_SEGMENT: Record<Exclude<SubView, "menu">, string> = {
  "edit-profile": "edit-profile",
  account: "account",
  privacy: "privacy",
  chats: "chats",
  notifications: "notification",
  appearance: "appearance",
  help: "help-and-feedback",
};

function MetaLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 14c-1.66 0-3-1.34-3-3s1.34-3 3-3c1.23 0 2.28.74 2.73 1.8l4.54 6.4c.45 1.06 1.5 1.8 2.73 1.8 1.66 0 3-1.34 3-3s-1.34-3-3-3c-1.23 0-2.28.74-2.73 1.8l-4.54 6.4C9.28 17.26 8.23 18 7 18" />
    </svg>
  );
}

function NeonSkullAvatar({ className }: { className?: string }) {
  return (
    <div className={cn("w-full h-full flex items-center justify-center bg-card", className)}>
      <svg
        className="w-16 h-16 text-primary drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path
          d="M12 2C7.03 2 3 6.03 3 11c0 2.21.8 4.21 2.11 5.76L5 22h4v-3h6v3h4l-.11-5.24C20.2 15.21 21 13.21 21 11c0-4.97-4.03-9-9-9z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9" cy="10" r="1.5" fill="currentColor" />
        <circle cx="15" cy="10" r="1.5" fill="currentColor" />
        <path d="M10 14h4M9 16h6" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/** Octagon gear badge for the Settings header (project green/teal). */
function SettingsBadge() {
  return (
    <div className="relative h-12 w-12 shrink-0 drop-shadow-[0_0_12px_rgba(16,185,129,0.45)]">
      <svg viewBox="0 0 56 56" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="set-badge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.75 0.15 180)" />
            <stop offset="100%" stopColor="oklch(0.7 0.18 155)" />
          </linearGradient>
        </defs>
        <path
          d="M28 3 L46 11 L54 28 L46 45 L28 53 L10 45 L2 28 L10 11 Z"
          fill="url(#set-badge)"
          fillOpacity="0.16"
          stroke="url(#set-badge)"
          strokeWidth="2"
        />
      </svg>
      <Settings className="absolute inset-0 m-auto h-6 w-6 text-primary" />
    </div>
  );
}

/** Flowing green/teal wave backdrop for the Settings header. */
function AuroraWaves() {
  return (
    <svg
      viewBox="0 0 900 200"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full opacity-80"
    >
      <defs>
        <linearGradient id="set-wave" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="oklch(0.78 0.18 160)" stopOpacity="0" />
          <stop offset="55%" stopColor="oklch(0.8 0.18 165)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="oklch(0.7 0.17 180)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="set-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.8 0.2 165)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="oklch(0.8 0.2 165)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="650" cy="80" rx="220" ry="90" fill="url(#set-glow)">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="6s" repeatCount="indefinite" />
      </ellipse>
      <g fill="none" stroke="url(#set-wave)" strokeLinecap="round">
        <path d="M340 150 C 520 60, 640 70, 880 120" strokeWidth="2.5" strokeOpacity="0.9">
          <animateTransform attributeName="transform" type="translate" values="0 0; 0 -8; 0 0" dur="7s" repeatCount="indefinite" />
        </path>
        <path d="M380 170 C 560 90, 680 95, 900 140" strokeWidth="1.5" strokeOpacity="0.6">
          <animateTransform attributeName="transform" type="translate" values="0 0; 0 6; 0 0" dur="8s" repeatCount="indefinite" />
        </path>
        <path d="M420 130 C 560 70, 700 60, 880 100" strokeWidth="1" strokeOpacity="0.5">
          <animateTransform attributeName="transform" type="translate" values="0 0; 0 -5; 0 0" dur="6.5s" repeatCount="indefinite" />
        </path>
      </g>
    </svg>
  );
}

/** Settings header banner: gear badge + title + subtitle over the wave backdrop. */
function SettingsHeaderBanner() {
  return (
    <div
      className="relative overflow-hidden px-4 md:px-6 border-b border-border/40"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
    >
      <AuroraWaves />
      <div className="relative z-10 flex items-center gap-3.5 h-[84px]">
        <SettingsBadge />
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage your experience</p>
        </div>
      </div>
    </div>
  );
}

/** A single settings row with a colorful gradient icon tile. */
function SettingRow({
  icon: Icon,
  label,
  tile,
  value,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tile: string;
  value?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full px-3.5 py-3 flex items-center gap-3.5 hover:bg-muted/20 active:bg-muted/40 transition-colors cursor-pointer text-left"
    >
      <span
        className={cn(
          "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br shadow-sm",
          tile,
        )}
      >
        <Icon className="h-[18px] w-[18px] text-white" />
      </span>
      <span className="flex-1 text-[15px] font-medium text-foreground truncate">{label}</span>
      {value && (
        <span className="text-sm text-muted-foreground rounded-full bg-muted/60 px-2.5 py-0.5">
          {value}
        </span>
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}

export function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Preserve scroll across tab switches. No background-lock: sub-views (Account,
  // Privacy, …) render INSIDE this same scroller and register URL overlays, so
  // locking on overlay-open would freeze the sub-view the user is reading.
  useScrollRestore(scrollRef, "tab:settings");
  const { theme } = useTheme();
  const themeLabel = theme === "light" ? "Light" : theme === "system" ? "System" : "Dark";

  // API hooks
  const { data: userProfile, isLoading: isProfileLoading } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const uploadAvatarMutation = useUploadAvatar();
  const { data: contactRequests = [] } = useContactRequests();
  const pendingRequestsCount = contactRequests.length;
  const [friendsOpen, setFriendsOpen] = useState(false);

  const [currentSubView, setCurrentSubView] = useState<SubView>("menu");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Info pages (Terms / Privacy / Cookie / About / Contact) — each gets its own
  // nested hash URL (#profile/<page>) and Back closes it.
  const [legalPage, setLegalPage] = useState<InfoPage | null>(null);
  const closeLegal = () => setLegalPage(null);
  useUrlModal(legalPage === "terms-of-use", closeLegal, "terms-of-use");
  useUrlModal(legalPage === "privacy-policy", closeLegal, "privacy-policy");
  useUrlModal(legalPage === "cookie-policy", closeLegal, "cookie-policy");
  useUrlModal(legalPage === "about", closeLegal, "about");
  useUrlModal(legalPage === "contact-us", closeLegal, "contact-us");

  // Drill-down sub-views are hash-addressable too; Back returns to the menu.
  const goToMenu = () => setCurrentSubView("menu");
  useUrlModal(currentSubView === "edit-profile", goToMenu, SUBVIEW_SEGMENT["edit-profile"]);
  useUrlModal(currentSubView === "account", goToMenu, SUBVIEW_SEGMENT.account);
  useUrlModal(currentSubView === "privacy", goToMenu, SUBVIEW_SEGMENT.privacy);
  useUrlModal(currentSubView === "chats", goToMenu, SUBVIEW_SEGMENT.chats);
  useUrlModal(currentSubView === "notifications", goToMenu, SUBVIEW_SEGMENT.notifications);
  useUrlModal(currentSubView === "appearance", goToMenu, SUBVIEW_SEGMENT.appearance);
  useUrlModal(currentSubView === "help", goToMenu, SUBVIEW_SEGMENT.help);

  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    age: 0,
    country: "",
    city: "",
    bio: "",
    interests: [],
    profileImage: "",
    username: "",
  });

  const [editForm, setEditForm] = useState<UserProfile>(profile);

  const availableInterests = ALLOWED_INTERESTS.filter(
    (interest) =>
      !(editForm.interests || []).some((i) => i.toUpperCase() === interest.toUpperCase()),
  );

  useEffect(() => {
    if (userProfile) {
      const mapped = {
        name: userProfile.name || "",
        age: userProfile.age || 0,
        country: userProfile.country || "",
        city: userProfile.city || "",
        bio: userProfile.bio || "",
        interests: userProfile.interests || [],
        profileImage: userProfile.avatar || "",
        username: userProfile.username || "",
      };
      setProfile(mapped);
      setEditForm(mapped);
    }
  }, [userProfile]);

  const formatInterest = (interest: string) => {
    if (!interest) return "";
    return interest.charAt(0).toUpperCase() + interest.slice(1).toLowerCase();
  };

  const handleEditStart = () => {
    setCurrentSubView("edit-profile");
    setEditForm(profile);
  };

  const handleSave = () => {
    updateProfileMutation.mutate(
      {
        name: editForm.name,
        bio: editForm.bio,
        age: editForm.age,
        country: editForm.country,
        city: editForm.city,
        interests: editForm.interests.map((i) => i.toUpperCase()),
        profileImage: editForm.profileImage,
      },
      {
        onSuccess: (updatedUser) => {
          const mapped = {
            name: updatedUser.name || "",
            age: updatedUser.age || 0,
            country: updatedUser.country || "",
            city: updatedUser.city || "",
            bio: updatedUser.bio || "",
            interests: updatedUser.interests || [],
            profileImage: updatedUser.avatar || "",
            username: updatedUser.username || "",
          };
          setProfile(mapped);
          setCurrentSubView("menu");
          showSuccessToast("Profile updated successfully");
        },
      },
    );
  };

  const handleCancel = () => {
    setCurrentSubView("menu");
    setEditForm(profile);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
    }
  };

  const handleCropComplete = (croppedFile: File) => {
    uploadAvatarMutation.mutate(croppedFile, {
      onSuccess: (result) => {
        setEditForm({
          ...editForm,
          profileImage: result.url,
        });
        showSuccessToast("Avatar updated successfully");
      },
    });
    setSelectedImageFile(null);
  };

  const handleRemoveAvatar = () => {
    setEditForm({
      ...editForm,
      profileImage: "",
    });
  };

  const removeInterest = (interest: string) => {
    setEditForm({
      ...editForm,
      interests: editForm.interests.filter((i) => i !== interest),
    });
  };

  const getSubViewTitle = () => {
    switch (currentSubView) {
      case "edit-profile":
        return "Edit Profile";
      case "account":
        return "Account";
      case "privacy":
        return "Privacy";
      case "chats":
        return "Chats";
      case "notifications":
        return "Notifications";
      case "appearance":
        return "Appearance";
      case "help":
        return "Help & Feedback";
      default:
        return "";
    }
  };

  // Return to the main settings menu from any sub-view, discarding unsaved edits.
  const handleBack = () => {
    setCurrentSubView("menu");
    setEditForm(profile);
  };

  return (
    <div className="h-full w-full bg-background">
      <div
        ref={scrollRef}
        className={cn("relative h-full w-full flex flex-col overflow-auto bg-background md:pb-0")}
      >
        <div className="flex-1 w-full mx-auto pb-24">
          {/* Sub-view header with back button (shown for any non-menu view) */}
          {currentSubView !== "menu" && !isProfileLoading && (
            <div className="sticky top-0 z-20 flex items-center gap-1 px-2 py-2.5 bg-background/85 backdrop-blur-md border-b border-border">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                aria-label="Back"
                className="h-10 w-10 rounded-full text-foreground hover:bg-muted active:scale-95"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-lg font-semibold text-foreground">{getSubViewTitle()}</h2>
            </div>
          )}
          {isProfileLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : currentSubView === "menu" ? (
            /* ── SETTINGS MENU (colorful, sectioned) ── */
            <>
              <SettingsHeaderBanner />

              <div className="px-4 max-w-2xl mx-auto">
                {/* Account */}
                <section>
                  <h3 className="px-1 mb-2.5 text-lg font-bold text-foreground">Account</h3>
                  <div className="bg-card rounded-2xl divide-y divide-border/50 overflow-hidden border border-border">
                    <SettingRow
                      icon={User}
                      label="Edit Profile"
                      tile="from-violet-500 to-purple-600"
                      onClick={handleEditStart}
                    />
                    <SettingRow
                      icon={Users}
                      label="Friends"
                      tile="from-blue-500 to-indigo-600"
                      value={pendingRequestsCount > 0 ? String(pendingRequestsCount) : undefined}
                      onClick={() => setFriendsOpen(true)}
                    />
                    <SettingRow
                      icon={Lock}
                      label="Privacy & Safety"
                      tile="from-teal-500 to-cyan-600"
                      onClick={() => setCurrentSubView("privacy")}
                    />
                    <SettingRow
                      icon={Bell}
                      label="Notifications"
                      tile="from-emerald-500 to-green-600"
                      onClick={() => setCurrentSubView("notifications")}
                    />
                    <SettingRow
                      icon={KeyRound}
                      label="Account Settings"
                      tile="from-amber-500 to-orange-600"
                      onClick={() => setCurrentSubView("account")}
                    />
                  </div>
                </section>

                {/* General */}
                <section>
                  <h3 className="px-1 mb-2.5 text-lg font-bold text-foreground">General</h3>
                  <div className="bg-card rounded-2xl divide-y divide-border/50 overflow-hidden border border-border">
                    <SettingRow
                      icon={Palette}
                      label="Appearance"
                      tile="from-fuchsia-500 to-purple-600"
                      value={themeLabel}
                      onClick={() => setCurrentSubView("appearance")}
                    />
                    <SettingRow
                      icon={MessageCircle}
                      label="Chats"
                      tile="from-sky-500 to-blue-600"
                      onClick={() => setCurrentSubView("chats")}
                    />
                    <SettingRow
                      icon={HelpCircle}
                      label="Help & Feedback"
                      tile="from-indigo-500 to-violet-600"
                      onClick={() => setCurrentSubView("help")}
                    />
                    <SettingRow
                      icon={QrCode}
                      label="My QR Code"
                      tile="from-pink-500 to-rose-600"
                      onClick={() => setShowQrModal(true)}
                    />
                    <SettingRow
                      icon={RefreshCw}
                      label="Refresh App"
                      tile="from-emerald-500 to-teal-600"
                      onClick={() => window.location.reload()}
                    />
                  </div>
                </section>

                {/* About */}
                <section>
                  <h3 className="px-1 mb-2.5 text-lg font-bold text-foreground">About</h3>
                  <div className="bg-card rounded-2xl divide-y divide-border/50 overflow-hidden border border-border">
                    <SettingRow
                      icon={FileText}
                      label="Terms of Use"
                      tile="from-slate-500 to-slate-700"
                      onClick={() => setLegalPage("terms-of-use")}
                    />
                    <SettingRow
                      icon={ShieldCheck}
                      label="Privacy Policy"
                      tile="from-slate-500 to-slate-700"
                      onClick={() => setLegalPage("privacy-policy")}
                    />
                    <SettingRow
                      icon={Cookie}
                      label="Cookie Policy"
                      tile="from-slate-500 to-slate-700"
                      onClick={() => setLegalPage("cookie-policy")}
                    />
                    <SettingRow
                      icon={Info}
                      label="About"
                      tile="from-slate-500 to-slate-700"
                      onClick={() => setLegalPage("about")}
                    />
                    <SettingRow
                      icon={MessageSquareText}
                      label="Contact Us"
                      tile="from-slate-500 to-slate-700"
                      onClick={() => setLegalPage("contact-us")}
                    />
                  </div>
                </section>

                <CopyrightFooter className="pt-1 pb-2" />
              </div>
            </>
          ) : currentSubView === "edit-profile" ? (
            /* ── PROFILE EDIT MODE (Original profile tab UI styled cleanly) ── */
            <div className="p-4 space-y-6 max-w-2xl mx-auto text-left">
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <div className="relative h-24 w-24 rounded-full overflow-hidden border border-border flex items-center justify-center">
                    {editForm.profileImage ? (
                      <img
                        src={editForm.profileImage}
                        alt="Crop preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <NeonSkullAvatar />
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute bottom-0 right-0 h-8 w-8 rounded-full border border-background shadow-xs hover:scale-105 transition-transform"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Choose from Gallery
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowCameraModal(true)}>
                        <Camera className="h-4 w-4 mr-2" />
                        Take Photo
                      </DropdownMenuItem>
                      {editForm.profileImage && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={handleRemoveAvatar}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove Photo
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <span className="text-xs text-muted-foreground">
                  Tap camera icon to update avatar
                </span>
              </div>

              {/* Info fields */}
              <div className="bg-card/40 p-4 rounded-xl border border-border/50 space-y-4">
                <div className="relative mt-2">
                  <Input
                    id="settings-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="h-10"
                    placeholder="Name"
                  />
                  <Label
                    htmlFor="settings-name"
                    className="absolute left-3 -top-2 z-10 px-1 bg-background text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                  >
                    Display Name
                  </Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="relative mt-2">
                      <select
                        id="settings-age"
                        value={editForm.age}
                        onChange={(e) =>
                          setEditForm({ ...editForm, age: parseInt(e.target.value) || 0 })
                        }
                        className={cn(
                          "pl-3 pr-8 bg-background border-border h-10 w-full min-w-0 rounded-md border py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm cursor-pointer appearance-none text-foreground",
                          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                          editForm.age === 0 ? "text-muted-foreground" : "text-foreground",
                        )}
                      >
                        <option value={0} disabled className="bg-background text-muted-foreground">
                          Select Age
                        </option>
                        {Array.from({ length: 82 }, (_, i) => i + 18).map((num) => (
                          <option key={num} value={num} className="bg-background text-foreground">
                            {num}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                      <Label
                        htmlFor="settings-age"
                        className="absolute left-3 -top-2 z-10 px-1 bg-background text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                      >
                        Age
                      </Label>
                    </div>
                  </div>

                  <div>
                    <div className="relative mt-2">
                      <Input
                        id="settings-city"
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        className="h-10"
                        placeholder="City"
                      />
                      <Label
                        htmlFor="settings-city"
                        className="absolute left-3 -top-2 z-10 px-1 bg-background text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                      >
                        City
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="bg-card/40 p-4 rounded-xl border border-border/50">
                <div className="relative mt-2">
                  <textarea
                    id="settings-bio"
                    value={editForm.bio}
                    onChange={(e) => {
                      if (e.target.value.length <= 500) {
                        setEditForm({ ...editForm, bio: e.target.value });
                      }
                    }}
                    maxLength={500}
                    className="w-full p-2.5 rounded-md border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    rows={4}
                    placeholder="Tell us about yourself..."
                  />
                  <Label
                    htmlFor="settings-bio"
                    className="absolute left-3 -top-2 z-10 px-1 bg-background text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                  >
                    Bio Status
                  </Label>
                  <div
                    className={cn(
                      "text-right text-xs mt-1 transition-colors",
                      (editForm.bio || "").length >= 500
                        ? "text-destructive font-semibold"
                        : "text-muted-foreground",
                    )}
                  >
                    {(editForm.bio || "").length}/500
                  </div>
                </div>
              </div>

              {/* Interests */}
              <div className="bg-card/40 p-4 rounded-xl border border-border/50 space-y-3">
                <span className="text-xs font-semibold text-muted-foreground">Interests</span>
                <div className="flex flex-wrap gap-2">
                  {editForm.interests.map((interest) => (
                    <Badge
                      key={interest}
                      variant="secondary"
                      className="pr-1 bg-muted hover:bg-muted text-foreground"
                    >
                      {formatInterest(interest)}
                      <button
                        onClick={() => removeInterest(interest)}
                        className="ml-1 hover:text-destructive cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                {availableInterests.length > 0 && (
                  <div className="relative mt-4">
                    <Select
                      onValueChange={(val) => {
                        if (val) {
                          setEditForm({
                            ...editForm,
                            interests: [...editForm.interests, val],
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="w-full h-10 border-border bg-background text-foreground">
                        <SelectValue placeholder="Add an interest..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableInterests.map((interest) => (
                          <SelectItem key={interest} value={interest}>
                            {formatInterest(interest)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Label className="absolute left-3 -top-2 z-10 px-1 bg-background text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all">
                      Add Interest
                    </Label>
                  </div>
                )}
              </div>

              {/* Save/Cancel Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-primary hover:bg-primary/90 cursor-pointer"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="flex-1 border-border hover:bg-card cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : currentSubView === "privacy" ? (
            <PrivacyPage />
          ) : currentSubView === "chats" ? (
            <ChatsPage onOpenAppearance={() => setCurrentSubView("appearance")} />
          ) : currentSubView === "notifications" ? (
            <NotificationsPage />
          ) : currentSubView === "account" ? (
            <AccountPage />
          ) : currentSubView === "help" ? (
            <HelpPage onOpenLegal={setLegalPage} />
          ) : (
            /* ── APPEARANCE VIEW (Original Theme Selection) ── */
            <div className="p-4 space-y-6 max-w-2xl mx-auto text-left">
              <AppearanceSettings />
            </div>
          )}
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageSelect}
        onClick={(e) => {
          (e.target as HTMLInputElement).value = "";
        }}
        className="hidden"
      />
      <AvatarCropperModal
        isOpen={!!selectedImageFile}
        onClose={() => setSelectedImageFile(null)}
        imageFile={selectedImageFile}
        onCropComplete={handleCropComplete}
      />
      <CameraModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={(file) => {
          setSelectedImageFile(file);
          setShowCameraModal(false);
        }}
      />

      {/* ── MOCK SCAN-TO-CHAT QR CODE DIALOG ── */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-xs w-full text-center relative shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-bold text-foreground mb-4">My QR Code</h3>
            <div className="bg-white p-4 rounded-[20px] inline-block mb-4 shadow-inner">
              <svg className="w-44 h-44 text-black" viewBox="0 0 100 100" fill="currentColor">
                <path d="M5 5h30v30H5V5zm3 3v24h24V8H8z" />
                <path d="M12 12h12v12H12V12z" />
                <path d="M65 5h30v30H65V5zm3 3v24h24V8H68zm4 4h12v12H72V12z" />
                <path d="M5 65h30v30H5V65zm3 3v24h24V68H8zm4 4h12v12H12V72z" />
                <path d="M45 10h10v10H45zm0 20h10v10H45zm10 25h10v15H55zm20 10h15v5H75zm-30 5h10v15H45zm25 15h15v10H70zm-15-5h5v10h-5zm30-20h5v10h-5zm-15-20h10v10H70z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-foreground">@{profile.name || "user"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Scan this code to start a chat with me on TalkMe
            </p>
          </div>
        </div>
      )}

      {/* Friends — nested overlay (#profile/friends), Back returns to Settings */}
      <FriendsOverlay open={friendsOpen} onClose={() => setFriendsOpen(false)} />

      {/* Info pages — hash-addressable (#profile/<page>), Back closes */}
      <TermsModal isOpen={legalPage === "terms-of-use"} onClose={closeLegal} />
      <PrivacyModal isOpen={legalPage === "privacy-policy"} onClose={closeLegal} />
      <CookieModal isOpen={legalPage === "cookie-policy"} onClose={closeLegal} />
      <AboutModal isOpen={legalPage === "about"} onClose={closeLegal} />
      <ContactUsModal isOpen={legalPage === "contact-us"} onClose={closeLegal} />
    </div>
  );
}
