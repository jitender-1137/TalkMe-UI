"use client"

import { useState, useEffect } from "react"
import { Settings, User, Camera, Save, Edit2, Lock, KeyRound, X, Palette, LogOut, Image as ImageIcon, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { CameraModal } from "@/components/chat/camera-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AvatarStatusBadge, PresenceSettings, PresenceDebugPanel } from "@/components/presence"
import { usePresenceStore } from "@/lib/presence"
import { AppearanceSettings } from "./appearance-settings"
import { useAuth } from "./auth-context"
import { cn } from "@/lib/utils"
import { useProfile, useUpdateProfile, useUploadAvatar } from "@/src/api/hooks/useProfile"
import { AvatarCropperModal } from "@/components/settings/avatar-cropper-modal"
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
  const status = usePresenceStore((state) => state.status)
  const invisibleMode = usePresenceStore((state) => state.invisibleMode)
  const displayStatus = invisibleMode ? "offline" : status
  const { logout } = useAuth()

  // API hooks
  const { data: userProfile, isLoading: isProfileLoading } = useProfile()
  const updateProfileMutation = useUpdateProfile()
  const uploadAvatarMutation = useUploadAvatar()

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile")
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
    <div className="flex flex-col h-[100dvh]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Settings</h2>
              <p className="text-xs text-muted-foreground">Manage your account</p>
            </div>
          </div>
        </div>
        {activeTab === "profile" && !isEditing && !showPasswordForm && !showForgotPassword && (
          <Button variant="ghost" size="icon" onClick={handleEditStart} className="h-9 w-9">
            <Edit2 className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-4">
        <button
          onClick={() => {
            setActiveTab("profile")
            setIsEditing(false)
            setShowPasswordForm(false)
            setShowForgotPassword(false)
          }}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "profile"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <User className="h-4 w-4" />
          Profile
        </button>
        <button
          onClick={() => {
            setActiveTab("settings")
            setIsEditing(false)
            setShowPasswordForm(false)
            setShowForgotPassword(false)
          }}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "settings"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          Preferences
        </button>
        <button
          onClick={() => {
            setActiveTab("appearance")
            setIsEditing(false)
            setShowPasswordForm(false)
            setShowForgotPassword(false)
          }}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "appearance"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Palette className="h-4 w-4" />
          Appearance
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto pb-24 md:pb-8">
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
                <div>
                  <label className="text-sm font-medium">Current Password</label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">New Password</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Confirm Password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="mt-1"
                  />
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
                <div>
                  <label className="text-sm font-medium">Email Address</label>
                  <Input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="mt-1"
                  />
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
                            <DropdownMenuItem asChild className="cursor-pointer gap-2">
                              <label className="flex items-center w-full">
                                <ImageIcon className="h-4 w-4 mr-2" />
                                Choose from gallery
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageSelect}
                                  onClick={(e) => {
                                    (e.target as HTMLInputElement).value = ""
                                  }}
                                  className="hidden"
                                />
                              </label>
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
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="text-lg font-semibold text-center max-w-xs"
                      placeholder="Your Name"
                    />
                  ) : (
                    <h3 className="text-2xl font-semibold">{profile.name}</h3>
                  )}
                  <p className="text-sm text-muted-foreground mt-1 capitalize">{displayStatus}</p>
                </div>

                {/* Profile Details */}
                <div className="p-4 rounded-lg border border-border bg-card space-y-4">
                  <h4 className="font-semibold text-foreground">Profile Details</h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Username</label>
                      <Input
                        value={userProfile?.username || ""}
                        disabled
                        className="mt-1 bg-muted/30 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Age</label>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editForm.age}
                          onChange={(e) =>
                            setEditForm({ ...editForm, age: parseInt(e.target.value) || 0 })
                          }
                          className="mt-1"
                          min={18}
                          max={99}
                        />
                      ) : (
                        <p className="mt-1 text-sm font-medium">{profile.age || "N/A"}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Country</label>
                      {isEditing ? (
                        <Input
                          value={editForm.country}
                          disabled
                          className="mt-1 bg-muted/30 cursor-not-allowed"
                        />
                      ) : (
                        <p className="mt-1 text-sm font-medium">{profile.country || "N/A"}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">City</label>
                      {isEditing ? (
                        <Input
                          value={editForm.city}
                          onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                          className="mt-1"
                          placeholder="City"
                        />
                      ) : (
                        <p className="mt-1 text-sm font-medium">{profile.city || "N/A"}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div className="p-4 rounded-lg border border-border bg-card space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Bio</label>
                  {isEditing ? (
                    <div>
                      <textarea
                        value={editForm.bio}
                        onChange={(e) => {
                          if (e.target.value.length <= 500) {
                            setEditForm({ ...editForm, bio: e.target.value })
                          }
                        }}
                        maxLength={500}
                        className="w-full p-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                        rows={4}
                        placeholder="Tell us about yourself..."
                      />
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
                    <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio || "No bio added yet."}</p>
                  )}
                </div>

                {/* Interests */}
                <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground">Interests</label>
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
                    <div className="flex gap-2">
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
                        <SelectTrigger className="w-full">
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
    </div>
  )
}
