"use client"

import { useState } from "react"
import { User, ChevronLeft, Camera, Save, Edit2, Lock, KeyRound, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useImageViewer } from "@/components/providers/image-viewer-provider"
import { Badge } from "@/components/ui/badge"
import { AvatarStatusBadge } from "@/components/presence"
import { usePresenceStore } from "@/lib/presence"
import { cn } from "@/lib/utils"

interface UserProfile {
  name: string
  age: number
  country: string
  city: string
  bio: string
  interests: string[]
  profileImage: string
  gender?: string
}

export function ProfileContent() {
  const status = usePresenceStore((state) => state.status)
  const invisibleMode = usePresenceStore((state) => state.invisibleMode)
  const displayStatus = invisibleMode ? "offline" : status
  const { showImage } = useImageViewer()

  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [forgotEmail, setForgotEmail] = useState("")
  const [newInterest, setNewInterest] = useState("")

  const [profile, setProfile] = useState<UserProfile>({
    name: "Your Name",
    age: 25,
    country: "United States",
    city: "New York",
    bio: "Hey there! I'm passionate about meeting new people and making meaningful connections. Always up for interesting conversations!",
    interests: ["Music", "Travel", "Photography", "Fitness", "Movies"],
    profileImage: "",
  })

  const [editForm, setEditForm] = useState<UserProfile>(profile)

  const handleEditStart = () => {
    setIsEditing(true)
    setEditForm(profile)
  }

  const handleSave = () => {
    setProfile(editForm)
    setIsEditing(false)
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setEditForm({
          ...editForm,
          profileImage: event.target?.result as string,
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const addInterest = () => {
    if (newInterest.trim() && !editForm.interests.includes(newInterest.trim())) {
      setEditForm({
        ...editForm,
        interests: [...editForm.interests, newInterest.trim()],
      })
      setNewInterest("")
    }
  }

  const removeInterest = (interest: string) => {
    setEditForm({
      ...editForm,
      interests: editForm.interests.filter((i) => i !== interest),
    })
  }

  return (
    <div className="flex flex-col h-[100dvh]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">My Profile</h2>
              <p className="text-xs text-muted-foreground">Manage your profile</p>
            </div>
          </div>
        </div>
        {!isEditing && !showPasswordForm && !showForgotPassword && (
          <Button variant="ghost" size="icon" onClick={handleEditStart} className="h-9 w-9">
            <Edit2 className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto pb-24 md:pb-8">
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
                            fallback={editForm.name.slice(0, 2).toUpperCase()}
                            status={displayStatus}
                            size="xl"
                            showStatusDot
                            gender={editForm.gender}
                          />
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 p-2 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                        <Camera className="h-4 w-4 text-primary-foreground" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <div 
                      className={cn(
                        "h-32 w-32 rounded-full bg-muted flex items-center justify-center overflow-hidden transition-opacity",
                        profile.profileImage && "cursor-pointer hover:opacity-90"
                      )}
                      onClick={() => profile.profileImage && showImage(profile.profileImage)}
                    >
                      {profile.profileImage ? (
                        <img
                          src={profile.profileImage}
                          alt="Profile"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <AvatarStatusBadge
                          fallback={profile.name.slice(0, 2).toUpperCase()}
                          status={displayStatus}
                          size="xl"
                          showStatusDot
                          gender={profile.gender}
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
                      <p className="mt-1 text-sm font-medium">{profile.age}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Country</label>
                    {isEditing ? (
                      <Input
                        value={editForm.country}
                        onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                        className="mt-1"
                        placeholder="Country"
                      />
                    ) : (
                      <p className="mt-1 text-sm font-medium">{profile.country}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground">City</label>
                    {isEditing ? (
                      <Input
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        className="mt-1"
                        placeholder="City"
                      />
                    ) : (
                      <p className="mt-1 text-sm font-medium">{profile.city}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="p-4 rounded-lg border border-border bg-card space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Bio</label>
                {isEditing ? (
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    className="w-full p-2 rounded-md border border-input bg-background text-sm resize-none"
                    rows={4}
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
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
                      {interest}
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
                {isEditing && (
                  <div className="flex gap-2">
                    <Input
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      placeholder="Add interest"
                      className="flex-1"
                      onKeyDown={(e) => e.key === "Enter" && addInterest()}
                    />
                    <Button onClick={addInterest} variant="outline" size="sm">
                      Add
                    </Button>
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
      </div>
    </div>
  )
}
