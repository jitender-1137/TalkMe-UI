"use client";

import { useState, useEffect, useRef } from "react";
import {
  Camera,
  Save,
  Lock,
  KeyRound,
  X,
  Palette,
  LogOut,
  Image as ImageIcon,
  Trash2,
  ChevronDown,
  MessageSquare,
  MessageCircle,
  Users,
  Phone,
  Bell,
  QrCode,
  Pencil,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
} from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { AvatarStatusBadge, PresenceSettings, PresenceDebugPanel } from "@/components/presence";
import { usePresenceStore } from "@/lib/presence";
import { AppearanceSettings } from "./appearance-settings";
import { useAuth } from "./auth-context";
import { cn } from "@/lib/utils";
import { useProfile, useUpdateProfile, useUploadAvatar } from "@/src/api/hooks/useProfile";
import { AvatarCropperModal } from "@/components/settings/avatar-cropper-modal";
import { useLobbyStore } from "@/components/lobby/lobby-store";
import { showSuccessToast, showErrorToast } from "@/src/api/error-handler";
import {
  ensurePushSubscription,
  removePushSubscription,
  isPushSupported,
} from "@/lib/push/push-manager";
import { detectInstallationType } from "@/lib/pwa/install-detection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

type SubView = "menu" | "edit-profile" | "preferences" | "appearance" | "account";

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

export function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const status = usePresenceStore((state) => state.status);
  const invisibleMode = usePresenceStore((state) => state.invisibleMode);
  const displayStatus = invisibleMode ? "offline" : status;
  const { logout } = useAuth();

  // API hooks
  const { data: userProfile, isLoading: isProfileLoading } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const uploadAvatarMutation = useUploadAvatar();

  const [currentSubView, setCurrentSubView] = useState<SubView>("menu");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

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

  const handlePasswordChange = () => {
    if (newPassword === confirmPassword && newPassword.length >= 6) {
      showSuccessToast("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
      setCurrentSubView("menu");
    } else {
      showErrorToast(new Error("Passwords do not match or are too short (min 6 characters)"));
    }
  };

  const handleForgotPassword = () => {
    if (forgotEmail) {
      showSuccessToast(`Password reset link sent to ${forgotEmail}`);
      setForgotEmail("");
      setShowForgotPassword(false);
    }
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
    if (currentSubView === "edit-profile") return "Edit Profile";
    if (currentSubView === "preferences") return "Preferences";
    if (currentSubView === "appearance") return "Appearance";
    if (currentSubView === "account") return "Account Settings";
    return "";
  };

  const handleFeaturePlaceholder = (featureName: string) => {
    showSuccessToast(`${featureName} feature coming soon`);
  };

  // Return to the main settings menu from any sub-view, discarding unsaved edits.
  const handleBack = () => {
    setCurrentSubView("menu");
    setEditForm(profile);
    setShowPasswordForm(false);
    setShowForgotPassword(false);
  };

  return (
    <div className="h-full w-full bg-background">
      <div
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
            /* ── WHATSAPP STYLE YOU MENU ── */
            <div className="px-4 py-2 space-y-6">
              {/* Header Actions */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-base text-foreground tracking-tight select-none truncate max-w-25">
                  You
                </span>
                <div className="flex items-center gap-1 bg-card/80 rounded-full p-1 border border-border">
                  <button
                    onClick={() => setShowQrModal(true)}
                    className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center text-foreground transition-colors"
                  >
                    <QrCode className="h-4.5 w-4.5" />
                  </button>
                  <div className="h-4 w-px bg-muted" />
                  <button
                    onClick={handleEditStart}
                    className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center text-foreground transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Circular Avatar */}
              <div className="flex flex-col items-center justify-center">
                <div
                  onClick={handleEditStart}
                  className="relative h-27.5 w-27.5 rounded-full overflow-hidden border border-border/80 flex items-center justify-center shadow-2xl cursor-pointer hover:opacity-90 transition-opacity"
                >
                  {profile.profileImage ? (
                    <img
                      src={profile.profileImage}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <NeonSkullAvatar />
                  )}
                </div>

                {/* Display Name & verify/plus badge */}
                <h2 className="text-2xl font-bold tracking-wide text-foreground uppercase mt-4 flex items-center gap-2 justify-center">
                  {profile.name || "YOU"}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  @{profile.username || "user"}
                </p>
              </div>

              {/* Group 2: Account, Privacy, Chats, Notifications */}
              <div className="bg-card rounded-[18px] divide-y divide-border/50 overflow-hidden border border-border">
                <div
                  onClick={() => {
                    setCurrentSubView("account");
                    setShowPasswordForm(true);
                  }}
                  className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-muted/20 active:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3.5 text-foreground">
                    <KeyRound className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Account</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>

                <div
                  onClick={() => setCurrentSubView("preferences")}
                  className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-muted/20 active:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3.5 text-foreground">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Privacy</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>

                <div
                  onClick={() => setCurrentSubView("preferences")}
                  className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-muted/20 active:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3.5 text-foreground">
                    <MessageCircle className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Chats</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>

                <div
                  onClick={() => setCurrentSubView("preferences")}
                  className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-muted/20 active:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3.5 text-foreground">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Notifications</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Group 3: Help and feedback */}
              <div className="bg-card rounded-[18px] divide-y divide-border/50 overflow-hidden border border-border">
                <div
                  onClick={() => setCurrentSubView("appearance")}
                  className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-muted/20 active:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3.5 text-foreground">
                    <Palette className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Appearance / Theme</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>

                <div
                  onClick={() => handleFeaturePlaceholder("Help and feedback")}
                  className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-muted/20 active:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3.5 text-foreground">
                    <HelpCircle className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Help and feedback</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
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
          ) : currentSubView === "preferences" ? (
            /* ── PREFERENCES VIEW (Original preferences tab) ── */
            <div className="p-4 space-y-6 max-w-2xl mx-auto text-left">
              {/* Profile Preview */}
              <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card/40">
                <AvatarStatusBadge
                  fallback={(profile.name || "U").slice(0, 2).toUpperCase()}
                  status={displayStatus}
                  size="xl"
                />
                <div>
                  <h3 className="font-semibold text-foreground">{profile.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Status:{" "}
                    <span className="capitalize font-medium text-foreground">{displayStatus}</span>
                  </p>
                </div>
              </div>

              {/* Presence Settings */}
              <PresenceSettings />

              {/* Notification Settings */}
              <NotificationSettingsSection />

              {/* Debug Panel */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground px-1">Developer Tools</h3>
                <PresenceDebugPanel />
              </div>

              {/* Logout */}
              <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                <h3 className="text-sm font-semibold text-foreground mb-1">Account</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Sign out of your account on this device.
                </p>
                <Button
                  variant="destructive"
                  className="w-full gap-2 cursor-pointer"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          ) : currentSubView === "account" ? (
            /* ── ACCOUNT / SECURITY SUBVIEW (Original Change Password Form) ── */
            <div className="p-4 space-y-6 max-w-2xl mx-auto text-left">
              {showPasswordForm ? (
                <div className="space-y-4 p-4 rounded-lg border border-border bg-card/40">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                      <Lock className="h-5 w-5" />
                      Change Password
                    </h3>
                  </div>
                  <div className="relative mt-4">
                    <Input
                      id="settings-current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="h-10"
                    />
                    <Label
                      htmlFor="settings-current-password"
                      className="absolute left-3 -top-2 z-10 px-1 bg-background text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                    >
                      Current Password
                    </Label>
                  </div>
                  <div className="relative mt-4">
                    <Input
                      id="settings-new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="h-10"
                    />
                    <Label
                      htmlFor="settings-new-password"
                      className="absolute left-3 -top-2 z-10 px-1 bg-background text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                    >
                      New Password
                    </Label>
                  </div>
                  <div className="relative mt-4">
                    <Input
                      id="settings-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="h-10"
                    />
                    <Label
                      htmlFor="settings-confirm-password"
                      className="absolute left-3 -top-2 z-10 px-1 bg-background text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                    >
                      Confirm New Password
                    </Label>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={handlePasswordChange}
                      className="flex-1 bg-primary hover:bg-primary/90 cursor-pointer"
                    >
                      Update Password
                    </Button>
                    <Button
                      onClick={() => {
                        setShowPasswordForm(false);
                        setCurrentSubView("menu");
                      }}
                      variant="outline"
                      className="flex-1 border-border hover:bg-card cursor-pointer"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : showForgotPassword ? (
                <div className="space-y-4 p-4 rounded-lg border border-border bg-card/40">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                      <KeyRound className="h-5 w-5" />
                      Reset Password
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                  <div className="relative mt-4">
                    <Input
                      id="settings-forgot-email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="h-10"
                    />
                    <Label
                      htmlFor="settings-forgot-email"
                      className="absolute left-3 -top-2 z-10 px-1 bg-background text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                    >
                      Email Address
                    </Label>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={handleForgotPassword}
                      className="flex-1 bg-primary hover:bg-primary/90 cursor-pointer"
                    >
                      Send Reset Link
                    </Button>
                    <Button
                      onClick={() => {
                        setShowForgotPassword(false);
                        setCurrentSubView("menu");
                      }}
                      variant="outline"
                      className="flex-1 border-border hover:bg-card cursor-pointer"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg border border-border bg-card/40 text-center text-muted-foreground">
                  Select an option from the main menu.
                </div>
              )}
            </div>
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
          showSuccessToast("Push notifications enabled");
        } else if (typeof Notification !== "undefined" && Notification.permission === "denied") {
          showErrorToast(
            new Error(
              "Notifications are blocked. Allow them in your browser/site settings, then try again.",
            ),
          );
        } else {
          showErrorToast(new Error("Couldn't enable push notifications."));
        }
      } else {
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
            <Label
              htmlFor="message-tone"
              className="text-xs font-semibold text-muted-foreground/80"
            >
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
            <Label
              htmlFor="message-vibrate"
              className="text-xs font-semibold text-muted-foreground/80"
            >
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
            <Label
              htmlFor="group-vibrate"
              className="text-xs font-semibold text-muted-foreground/80"
            >
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
            <Label
              htmlFor="call-ringtone"
              className="text-xs font-semibold text-muted-foreground/80"
            >
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
            <Label
              htmlFor="call-vibrate"
              className="text-xs font-semibold text-muted-foreground/80"
            >
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
