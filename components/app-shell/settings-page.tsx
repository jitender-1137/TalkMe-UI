"use client"

import { useState, useEffect, useRef } from "react"
import { AppLayout } from "@/components/ui/app-layout"
import { Settings, User, Camera, Save, Edit2, Lock, KeyRound, X, Palette, LogOut, Image as ImageIcon, Trash2, ChevronDown, MessageSquare, Users, Phone, Bell, Volume2, Smile } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { CameraModal } from "@/components/chat/camera-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { AvatarStatusBadge, PresenceSettings, PresenceDebugPanel } from "@/components/presence"
import { usePresenceStore } from "@/lib/presence"
import { AppearanceSettings } from "./appearance-settings"
import { useAuth } from "./auth-context"
import { cn } from "@/lib/utils"
import { useProfile, useUpdateProfile, useUploadAvatar } from "@/src/api/hooks/useProfile"
import { AvatarCropperModal } from "@/components/settings/avatar-cropper-modal"
import { useLobbyStore } from "@/components/lobby/lobby-store"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
]

interface UserProfile {
  name: string
  age: number
  country: string
  city: string
  bio: string
  interests: string[]
  profileImage: string
}

type SettingsTab = "profile" | "settings" | "appearance"

export function SettingsPage() {
  // Reference useLobbyStore to prevent Turbopack optimization/ReferenceError issues
  const _lobbyStore = useLobbyStore
  const fileInputRef = useRef<HTMLInputElement>(null)

  const status = usePresenceStore((state) => state.status)
  const invisibleMode = usePresenceStore((state) => state.invisibleMode)
  const displayStatus = invisibleMode ? "offline" : status
  const { logout } = useAuth()

  // API hooks
  const { data: userProfile, isLoading: isProfileLoading } = useProfile()
  const updateProfileMutation = useUpdateProfile()
  const uploadAvatarMutation = useUploadAvatar()
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile")

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === "#profile") {
        setActiveTab("profile")
      }
    }
    window.addEventListener("hashchange", handleHashChange)
    
    // Check initial hash
    if (window.location.hash === "#profile") {
      setActiveTab("profile")
    }

    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])
  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [forgotEmail, setForgotEmail] = useState("")
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [showCameraModal, setShowCameraModal] = useState(false)

  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    age: 0,
    country: "",
    city: "",
    bio: "",
    interests: [],
    profileImage: "",
  })

  const [editForm, setEditForm] = useState<UserProfile>(profile)

  const availableInterests = ALLOWED_INTERESTS.filter(
    (interest) => !(editForm.interests || []).some((i) => i.toUpperCase() === interest.toUpperCase())
  )

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
      }
      setProfile(mapped)
      setEditForm(mapped)
    }
  }, [userProfile])

  const formatInterest = (interest: string) => {
    if (!interest) return ""
    return interest.charAt(0).toUpperCase() + interest.slice(1).toLowerCase()
  }

  const handleEditStart = () => {
    setIsEditing(true)
    setEditForm(profile)
  }

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
          }
          setProfile(mapped)
          setIsEditing(false)
        },
      }
    )
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditForm(profile)
  }

  const handlePasswordChange = () => {
    if (newPassword === confirmPassword && newPassword.length >= 6) {
      alert("Password updated successfully!")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setShowPasswordForm(false)
    } else {
      alert("Passwords do not match or are too short (min 6 characters)")
    }
  }

  const handleForgotPassword = () => {
    if (forgotEmail) {
      alert(`Password reset link sent to ${forgotEmail}`)
      setForgotEmail("")
      setShowForgotPassword(false)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImageFile(file)
    }
  }

  const handleCropComplete = (croppedFile: File) => {
    uploadAvatarMutation.mutate(croppedFile, {
      onSuccess: (result) => {
        setEditForm({
          ...editForm,
          profileImage: result.url,
        })
      },
    })
    setSelectedImageFile(null)
  }



  const removeInterest = (interest: string) => {
    setEditForm({
      ...editForm,
      interests: editForm.interests.filter((i) => i !== interest),
    })
  }

  const handleRemoveAvatar = () => {
    setEditForm({
      ...editForm,
      profileImage: "",
    })
  }

  return (
    <div className="h-full w-full">
      <AppLayout
        title="Settings"
        icon={Settings}
        filterChips={[
          { id: "profile", label: "Profile" },
          { id: "settings", label: "Preferences" },
          { id: "appearance", label: "Appearance" },
        ]}
        activeFilterId={activeTab}
        onFilterChange={(id) => {
          setActiveTab(id as SettingsTab);
          setIsEditing(false);
          setShowPasswordForm(false);
          setShowForgotPassword(false);
        }}
        headerRight={
          activeTab === "profile" && !isEditing && !showPasswordForm && !showForgotPassword && (
            <Button variant="ghost" size="icon" onClick={handleEditStart} className="h-9 w-9 text-primary cursor-pointer">
              <Edit2 className="h-5 w-5" />
            </Button>
          )
        }
      >
        <div className="flex-1 p-4 space-y-6 max-w-2xl mx-auto w-full">
        {isProfileLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : activeTab === "profile" ? (
          <div className="p-4 space-y-6 max-w-2xl mx-auto">
            {showPasswordForm ? (
              /* Password Change Form */
              <div className="space-y-4 p-4 rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Change Password
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPasswordForm(false)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
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
                    className="absolute left-3 -top-2 z-10 px-1 bg-card text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
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
                    placeholder="Enter new password (min 6 characters)"
                    className="h-10"
                  />
                  <Label
                    htmlFor="settings-new-password"
                    className="absolute left-3 -top-2 z-10 px-1 bg-card text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
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
                    className="absolute left-3 -top-2 z-10 px-1 bg-card text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                  >
                    Confirm Password
                  </Label>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={handlePasswordChange} className="flex-1">
                    Update Password
                  </Button>
                  <Button
                    onClick={() => setShowPasswordForm(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : showForgotPassword ? (
              /* Forgot Password Form */
              <div className="space-y-4 p-4 rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <KeyRound className="h-5 w-5" />
                    Forgot Password
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowForgotPassword(false)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter your email address and we&apos;ll send you a link to reset your password.
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
                    className="absolute left-3 -top-2 z-10 px-1 bg-card text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                  >
                    Email Address
                  </Label>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleForgotPassword} className="flex-1">
                    Send Reset Link
                  </Button>
                  <Button
                    onClick={() => setShowForgotPassword(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Profile Picture */}
                <div className="flex flex-col items-center p-6 rounded-lg border border-border bg-card">
                  <div className="relative mb-4">
                    {isEditing ? (
                      <div className="relative">
                        <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                          {editForm.profileImage ? (
                            <img
                              src={editForm.profileImage}
                              alt="Profile"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <AvatarStatusBadge
                              fallback={(editForm.name || "U").slice(0, 2).toUpperCase()}
                              status={displayStatus}
                              size="xl"
                              showStatusDot
                            />
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="absolute bottom-0 right-0 p-2 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors focus:outline-none">
                              <Camera className="h-4 w-4 text-primary-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-popover rounded-xl">
                            <DropdownMenuItem onClick={() => setShowCameraModal(true)} className="cursor-pointer gap-2">
                              <Camera className="h-4 w-4" />
                              Take photo
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => fileInputRef.current?.click()}
                              className="cursor-pointer gap-2"
                            >
                              <ImageIcon className="h-4 w-4" />
                              Choose from gallery
                            </DropdownMenuItem>
                            {editForm.profileImage && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleRemoveAvatar} className="cursor-pointer gap-2 text-destructive focus:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                  Remove photo
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ) : (
                      <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {profile.profileImage ? (
                          <img
                            src={profile.profileImage}
                            alt="Profile"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <AvatarStatusBadge
                            fallback={(profile.name || "U").slice(0, 2).toUpperCase()}
                            status={displayStatus}
                            size="xl"
                            showStatusDot
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="relative mt-4 w-full max-w-xs mx-auto">
                      <Input
                        id="settings-name"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="text-lg font-semibold text-center h-10"
                        placeholder="Your Name"
                      />
                      <Label
                        htmlFor="settings-name"
                        className="absolute left-3 -top-2 z-10 px-1 bg-card text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                      >
                        Display Name
                      </Label>
                    </div>
                  ) : (
                    <h3 className="text-2xl font-semibold">{profile.name}</h3>
                  )}
                  <p className="text-sm text-muted-foreground mt-1 capitalize">{displayStatus}</p>
                </div>

                {/* Profile Details */}
                <div className="p-4 rounded-lg border border-border bg-card space-y-4">
                  <h4 className="font-semibold text-foreground">Profile Details</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative mt-4">
                      <Input
                        id="settings-username"
                        value={userProfile?.username || ""}
                        disabled
                        className="bg-muted/30 cursor-not-allowed h-10"
                      />
                      <Label
                        htmlFor="settings-username"
                        className="absolute left-3 -top-2 z-10 px-1 bg-card text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                      >
                        Username
                      </Label>
                    </div>
                    <div>
                      {isEditing ? (
                        <div className="relative mt-4">
                          <select
                            id="settings-age"
                            value={editForm.age}
                            onChange={(e) =>
                              setEditForm({ ...editForm, age: parseInt(e.target.value) || 0 })
                            }
                            className={cn(
                              "pl-3 pr-8 dark:bg-input/30 border-input h-10 w-full min-w-0 rounded-md border bg-card py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm cursor-pointer appearance-none",
                              "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                              editForm.age === 0 ? "text-muted-foreground" : "text-foreground",
                            )}
                          >
                            <option value={0} disabled className="bg-card text-muted-foreground">
                              Select Age
                            </option>
                            {Array.from({ length: 82 }, (_, i) => i + 18).map((num) => (
                              <option key={num} value={num} className="bg-card text-foreground">
                                {num}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                          <Label
                            htmlFor="settings-age"
                            className="absolute left-3 -top-2 z-10 px-1 bg-card text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                          >
                            Age
                          </Label>
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground">Age</span>
                          <p className="mt-1 text-sm font-medium">{profile.age || "N/A"}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      {isEditing ? (
                        <div className="relative mt-4">
                          <Input
                            id="settings-country"
                            value={editForm.country}
                            disabled
                            className="bg-muted/30 cursor-not-allowed h-10"
                          />
                          <Label
                            htmlFor="settings-country"
                            className="absolute left-3 -top-2 z-10 px-1 bg-card text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                          >
                            Country
                          </Label>
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground">Country</span>
                          <p className="mt-1 text-sm font-medium">{profile.country || "N/A"}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      {isEditing ? (
                        <div className="relative mt-4">
                          <Input
                            id="settings-city"
                            value={editForm.city}
                            onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                            className="h-10"
                            placeholder="City"
                          />
                          <Label
                            htmlFor="settings-city"
                            className="absolute left-3 -top-2 z-10 px-1 bg-card text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                          >
                            City
                          </Label>
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground">City</span>
                          <p className="mt-1 text-sm font-medium">{profile.city || "N/A"}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div className="p-4 rounded-lg border border-border bg-card">
                  {isEditing ? (
                    <div className="relative mt-4">
                      <textarea
                        id="settings-bio"
                        value={editForm.bio}
                        onChange={(e) => {
                          if (e.target.value.length <= 500) {
                            setEditForm({ ...editForm, bio: e.target.value })
                          }
                        }}
                        maxLength={500}
                        className="w-full p-2.5 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                        rows={4}
                        placeholder="Tell us about yourself..."
                      />
                      <Label
                        htmlFor="settings-bio"
                        className="absolute left-3 -top-2 z-10 px-1 bg-card text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                      >
                        Bio
                      </Label>
                      <div className={cn(
                        "text-right text-xs mt-1 transition-colors",
                        (editForm.bio || "").length >= 500 
                          ? "text-destructive font-semibold" 
                          : "text-muted-foreground"
                      )}>
                        {(editForm.bio || "").length}/500
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground">Bio</span>
                      <p className="text-sm text-muted-foreground leading-relaxed mt-1">{profile.bio || "No bio added yet."}</p>
                    </div>
                  )}
                </div>

                {/* Interests */}
                <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                  <span className="text-xs font-semibold text-muted-foreground">Interests</span>
                  <div className="flex flex-wrap gap-2">
                    {(isEditing ? editForm.interests : profile.interests).map((interest) => (
                      <Badge
                        key={interest}
                        variant="secondary"
                        className={isEditing ? "pr-1" : ""}
                      >
                        {formatInterest(interest)}
                        {isEditing && (
                          <button
                            onClick={() => removeInterest(interest)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                  {isEditing && availableInterests.length > 0 && (
                    <div className="relative mt-4">
                      <Select
                        onValueChange={(val) => {
                          if (val) {
                            setEditForm({
                              ...editForm,
                              interests: [...editForm.interests, val],
                            })
                          }
                        }}
                      >
                        <SelectTrigger className="w-full h-10">
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
                      <Label
                        className="absolute left-3 -top-2 z-10 px-1 bg-card text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                      >
                        Add Interest
                      </Label>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {isEditing ? (
                  <div className="flex gap-3">
                    <Button onClick={handleSave} className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button onClick={handleCancel} variant="outline" className="flex-1">
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      onClick={() => setShowPasswordForm(true)}
                      variant="outline"
                      className="w-full"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                    <Button
                      onClick={() => setShowForgotPassword(true)}
                      variant="ghost"
                      className="w-full text-muted-foreground"
                    >
                      <KeyRound className="h-4 w-4 mr-2" />
                      Forgot Password?
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : activeTab === "settings" ? (
          /* Preferences Tab */
          <div className="p-4 space-y-6 max-w-2xl mx-auto">
            {/* Profile Preview */}
            <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
              <AvatarStatusBadge
                fallback={(profile.name || "U").slice(0, 2).toUpperCase()}
                status={displayStatus}
                size="xl"
              />
              <div>
                <h3 className="font-semibold text-foreground">{profile.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Status: <span className="capitalize font-medium text-foreground">{displayStatus}</span>
                </p>
              </div>
            </div>

            {/* Presence Settings */}
            <PresenceSettings />

            {/* Notification Settings */}
            <NotificationSettingsSection />

            {/* Debug Panel */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground px-1">
                Developer Tools
              </h3>
              <PresenceDebugPanel />
            </div>

            {/* Avatar Status Demo */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground px-1">
                Status Badge Preview
              </h3>
              <div className="flex items-center gap-6 p-4 rounded-lg border border-border bg-card">
                <div className="flex flex-col items-center gap-2">
                  <AvatarStatusBadge fallback="ON" status="online" size="lg" />
                  <span className="text-xs text-muted-foreground">Online</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <AvatarStatusBadge fallback="ID" status="idle" size="lg" />
                  <span className="text-xs text-muted-foreground">Idle</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <AvatarStatusBadge fallback="OF" status="offline" size="lg" />
                  <span className="text-xs text-muted-foreground">Offline</span>
                </div>
              </div>
            </div>

            {/* Logout */}
            <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <h3 className="text-sm font-semibold text-foreground mb-1">Account</h3>
              <p className="text-xs text-muted-foreground mb-3">Sign out of your account on this device.</p>
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        ) : (
          /* Appearance Tab */
          <div className="p-4 space-y-6 max-w-2xl mx-auto">
            <AppearanceSettings />
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageSelect}
        onClick={(e) => {
          (e.target as HTMLInputElement).value = ""
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
          setSelectedImageFile(file)
          setShowCameraModal(false)
        }}
      />
      </AppLayout>
    </div>
  )
}

export function NotificationSettingsSection() {
  const { notificationSettings, updateNotificationSettings } = useLobbyStore();

  return (
    <div className="space-y-6">
      <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
        <div className="px-6 pb-2">
          <h3 className="text-lg font-semibold text-foreground">Notification Settings</h3>
          <p className="text-sm text-muted-foreground">Manage your sound, vibration, and alert preferences</p>
        </div>

        {/* Global Sound Switch */}
        <div className="px-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Notification Sounds</Label>
              <p className="text-xs text-muted-foreground">Play sounds for incoming messages and alerts globally</p>
            </div>
            <Switch
              id="global-sound-switch"
              checked={notificationSettings.sound}
              onCheckedChange={(val) => updateNotificationSettings({ sound: val })}
            />
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Conversation Tones</Label>
              <p className="text-xs text-muted-foreground">Play sounds for incoming and outgoing messages</p>
            </div>
            <Switch
              id="conv-tones-switch"
              checked={notificationSettings.conversationTones}
              onCheckedChange={(val) => updateNotificationSettings({ conversationTones: val })}
            />
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Desktop Notifications</Label>
              <p className="text-xs text-muted-foreground">Show previews and banner alerts on your desktop</p>
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
      <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
        <div className="px-6 pb-2 border-b border-white/5 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Messages</h3>
        </div>

        <div className="px-6 space-y-5">
          {/* Message Notification Tone */}
          <div className="space-y-1.5">
            <Label htmlFor="message-tone" className="text-xs font-semibold text-muted-foreground/80">Notification Tone</Label>
            <div className="relative">
              <select
                id="message-tone"
                value={notificationSettings.messageTone}
                onChange={(e) => updateNotificationSettings({ messageTone: e.target.value })}
                className="pl-3 pr-8 dark:bg-input/30 border-input h-10 w-full min-w-0 rounded-md border bg-card py-1 text-sm shadow-xs outline-none cursor-pointer appearance-none focus-visible:border-ring focus-visible:ring-[3px] text-foreground"
              >
                <option value="default" className="bg-card text-foreground">Default (notification.wav)</option>
                <option value="chime" className="bg-card text-foreground">Chime</option>
                <option value="chord" className="bg-card text-foreground">Chord</option>
                <option value="ding" className="bg-card text-foreground">Ding</option>
                <option value="none" className="bg-card text-foreground">None (Silent)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            </div>
          </div>

          {/* Message Vibrate */}
          <div className="space-y-1.5">
            <Label htmlFor="message-vibrate" className="text-xs font-semibold text-muted-foreground/80">Vibrate</Label>
            <div className="relative">
              <select
                id="message-vibrate"
                value={notificationSettings.messageVibrate}
                onChange={(e) => updateNotificationSettings({ messageVibrate: e.target.value })}
                className="pl-3 pr-8 dark:bg-input/30 border-input h-10 w-full min-w-0 rounded-md border bg-card py-1 text-sm shadow-xs outline-none cursor-pointer appearance-none focus-visible:border-ring focus-visible:ring-[3px] text-foreground"
              >
                <option value="off" className="bg-card text-foreground">Off</option>
                <option value="default" className="bg-card text-foreground">Default</option>
                <option value="short" className="bg-card text-foreground">Short</option>
                <option value="long" className="bg-card text-foreground">Long</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            </div>
          </div>

          {/* Message High Priority */}
          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Use high priority notifications</Label>
              <p className="text-xs text-muted-foreground">Show previews of notifications at the top of the screen</p>
            </div>
            <Switch
              id="message-high-priority"
              checked={notificationSettings.messageHighPriority}
              onCheckedChange={(val) => updateNotificationSettings({ messageHighPriority: val })}
            />
          </div>

          {/* Message Reactions */}
          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Reaction Notifications</Label>
              <p className="text-xs text-muted-foreground">Show notifications for reactions to messages you send</p>
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
      <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
        <div className="px-6 pb-2 border-b border-white/5 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Groups</h3>
        </div>

        <div className="px-6 space-y-5">
          {/* Group Notification Tone */}
          <div className="space-y-1.5">
            <Label htmlFor="group-tone" className="text-xs font-semibold text-muted-foreground/80">Notification Tone</Label>
            <div className="relative">
              <select
                id="group-tone"
                value={notificationSettings.groupTone}
                onChange={(e) => updateNotificationSettings({ groupTone: e.target.value })}
                className="pl-3 pr-8 dark:bg-input/30 border-input h-10 w-full min-w-0 rounded-md border bg-card py-1 text-sm shadow-xs outline-none cursor-pointer appearance-none focus-visible:border-ring focus-visible:ring-[3px] text-foreground"
              >
                <option value="default" className="bg-card text-foreground">Default (notification.wav)</option>
                <option value="chime" className="bg-card text-foreground">Chime</option>
                <option value="chord" className="bg-card text-foreground">Chord</option>
                <option value="ding" className="bg-card text-foreground">Ding</option>
                <option value="none" className="bg-card text-foreground">None (Silent)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            </div>
          </div>

          {/* Group Vibrate */}
          <div className="space-y-1.5">
            <Label htmlFor="group-vibrate" className="text-xs font-semibold text-muted-foreground/80">Vibrate</Label>
            <div className="relative">
              <select
                id="group-vibrate"
                value={notificationSettings.groupVibrate}
                onChange={(e) => updateNotificationSettings({ groupVibrate: e.target.value })}
                className="pl-3 pr-8 dark:bg-input/30 border-input h-10 w-full min-w-0 rounded-md border bg-card py-1 text-sm shadow-xs outline-none cursor-pointer appearance-none focus-visible:border-ring focus-visible:ring-[3px] text-foreground"
              >
                <option value="off" className="bg-card text-foreground">Off</option>
                <option value="default" className="bg-card text-foreground">Default</option>
                <option value="short" className="bg-card text-foreground">Short</option>
                <option value="long" className="bg-card text-foreground">Long</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            </div>
          </div>

          {/* Group High Priority */}
          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Use high priority notifications</Label>
              <p className="text-xs text-muted-foreground">Show previews of notifications at the top of the screen</p>
            </div>
            <Switch
              id="group-high-priority"
              checked={notificationSettings.groupHighPriority}
              onCheckedChange={(val) => updateNotificationSettings({ groupHighPriority: val })}
            />
          </div>

          {/* Group Reactions */}
          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Reaction Notifications</Label>
              <p className="text-xs text-muted-foreground">Show notifications for reactions to messages you send</p>
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
      <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
        <div className="px-6 pb-2 border-b border-white/5 flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Calls</h3>
        </div>

        <div className="px-6 space-y-5">
          {/* Call Ringtone */}
          <div className="space-y-1.5">
            <Label htmlFor="call-ringtone" className="text-xs font-semibold text-muted-foreground/80">Ringtone</Label>
            <div className="relative">
              <select
                id="call-ringtone"
                value={notificationSettings.callRingtone}
                onChange={(e) => updateNotificationSettings({ callRingtone: e.target.value })}
                className="pl-3 pr-8 dark:bg-input/30 border-input h-10 w-full min-w-0 rounded-md border bg-card py-1 text-sm shadow-xs outline-none cursor-pointer appearance-none focus-visible:border-ring focus-visible:ring-[3px] text-foreground"
              >
                <option value="default" className="bg-card text-foreground">Default</option>
                <option value="ringing" className="bg-card text-foreground">Ringing</option>
                <option value="none" className="bg-card text-foreground">None (Silent)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            </div>
          </div>

          {/* Call Vibrate */}
          <div className="space-y-1.5">
            <Label htmlFor="call-vibrate" className="text-xs font-semibold text-muted-foreground/80">Vibrate</Label>
            <div className="relative">
              <select
                id="call-vibrate"
                value={notificationSettings.callVibrate}
                onChange={(e) => updateNotificationSettings({ callVibrate: e.target.value })}
                className="pl-3 pr-8 dark:bg-input/30 border-input h-10 w-full min-w-0 rounded-md border bg-card py-1 text-sm shadow-xs outline-none cursor-pointer appearance-none focus-visible:border-ring focus-visible:ring-[3px] text-foreground"
              >
                <option value="off" className="bg-card text-foreground">Off</option>
                <option value="default" className="bg-card text-foreground">Default</option>
                <option value="short" className="bg-card text-foreground">Short</option>
                <option value="long" className="bg-card text-foreground">Long</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
