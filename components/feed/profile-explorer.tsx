"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MapPin,
  Link as LinkIcon,
  Calendar,
  Edit2,
  Camera,
  Check,
  X,
  BadgeCheck,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn, getAvatarUrl } from "@/lib/utils"
import type { UserProfile } from "./types"

interface ProfileExplorerProps {
  profile: UserProfile
  onUpdateProfile?: (updates: Partial<UserProfile>) => void
  onFollow?: () => void
  onMessage?: () => void
}

export function ProfileExplorer({
  profile,
  onUpdateProfile,
  onFollow,
  onMessage,
}: ProfileExplorerProps) {
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [editedBio, setEditedBio] = useState(profile.bio)
  const [bioExpanded, setBioExpanded] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [editingInterests, setEditingInterests] = useState(false)
  const [interests, setInterests] = useState(profile.interests)
  const [newInterest, setNewInterest] = useState("")

  const handleSaveBio = () => {
    onUpdateProfile?.({ bio: editedBio })
    setIsEditingBio(false)
  }

  const handleAddInterest = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newInterest.trim()) {
      const updated = [...interests, newInterest.trim()]
      setInterests(updated)
      onUpdateProfile?.({ interests: updated })
      setNewInterest("")
    }
  }

  const handleRemoveInterest = (interest: string) => {
    const updated = interests.filter((i) => i !== interest)
    setInterests(updated)
    onUpdateProfile?.({ interests: updated })
  }

  const bioIsTruncated = profile.bio.length > 150

  return (
    <div className="space-y-6">
      {/* Cover and Avatar */}
      <div className="relative">
        {/* Cover image */}
        <div className="h-32 md:h-48 bg-muted rounded-xl overflow-hidden">
          {profile.coverImage && (
            <img
              src={profile.coverImage}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
          {profile.isOwnProfile && (
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-3 right-3 gap-1.5"
            >
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Edit Cover</span>
            </Button>
          )}
        </div>

        {/* Avatar */}
        <div className="absolute -bottom-12 left-4 md:left-6">
          <div className="relative">
            <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-background">
              <AvatarImage src={getAvatarUrl(profile.avatar)} />
              <AvatarFallback className="text-2xl">{profile.name.charAt(0)}</AvatarFallback>
            </Avatar>
            {profile.isOwnProfile && (
              <Button
                variant="secondary"
                size="icon"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
              >
                <Camera className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="absolute -bottom-12 right-4 flex gap-2">
          {profile.isOwnProfile ? (
            <Button variant="outline" size="sm">
              <Edit2 className="h-4 w-4 mr-1.5" />
              Edit Profile
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={onMessage}>
                Message
              </Button>
              <Button size="sm" onClick={onFollow}>
                Follow
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Profile info */}
      <div className="pt-14 px-4 md:px-6 space-y-4">
        {/* Name and username */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold">{profile.name}</h1>
            {profile.followers > 10000 && (
              <BadgeCheck className="h-5 w-5 text-primary fill-primary/20" />
            )}
          </div>
          <p className="text-muted-foreground">@{profile.username}</p>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          {isEditingBio ? (
            <div className="space-y-2">
              <Textarea
                value={editedBio}
                onChange={(e) => setEditedBio(e.target.value)}
                className="min-h-24 resize-none"
                maxLength={300}
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleSaveBio}>
                  <Check className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditingBio(false)
                    setEditedBio(profile.bio)
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <span className="text-xs text-muted-foreground ml-auto">
                  {editedBio.length}/300
                </span>
              </div>
            </div>
          ) : (
            <div className="relative">
              <p
                className={cn(
                  "text-sm leading-relaxed",
                  !bioExpanded && bioIsTruncated && "line-clamp-3"
                )}
              >
                {profile.bio}
              </p>
              {bioIsTruncated && (
                <button
                  onClick={() => setBioExpanded(!bioExpanded)}
                  className="text-sm text-primary font-medium mt-1"
                >
                  {bioExpanded ? "Show less" : "Read more"}
                </button>
              )}
              {profile.isOwnProfile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingBio(true)}
                  className="absolute top-0 right-0 h-7 px-2"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {profile.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{profile.location}</span>
            </div>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <LinkIcon className="h-4 w-4" />
              <span>{profile.website.replace(/^https?:\/\//, "")}</span>
            </a>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Joined {formatJoinDate(profile.joinedDate)}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6">
          <button className="group">
            <span className="font-bold">{formatCount(profile.following)}</span>
            <span className="text-muted-foreground group-hover:underline ml-1">
              Following
            </span>
          </button>
          <button className="group">
            <span className="font-bold">{formatCount(profile.followers)}</span>
            <span className="text-muted-foreground group-hover:underline ml-1">
              Followers
            </span>
          </button>
          <div>
            <span className="font-bold">{formatCount(profile.posts)}</span>
            <span className="text-muted-foreground ml-1">Posts</span>
          </div>
        </div>
      </div>

      {/* Interests */}
      <div className="px-4 md:px-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Interests</h2>
          {profile.isOwnProfile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingInterests(!editingInterests)}
            >
              {editingInterests ? "Done" : "Edit"}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {interests.map((interest) => (
              <motion.div
                key={interest}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Badge
                  variant="secondary"
                  className={cn(
                    "px-3 py-1 cursor-default",
                    editingInterests && "pr-1.5"
                  )}
                >
                  {interest}
                  {editingInterests && (
                    <button
                      onClick={() => handleRemoveInterest(interest)}
                      className="ml-1.5 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              </motion.div>
            ))}
          </AnimatePresence>
          {editingInterests && (
            <Input
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyDown={handleAddInterest}
              placeholder="Add interest..."
              className="w-32 h-7 text-sm"
            />
          )}
        </div>
      </div>

      {/* Photo gallery */}
      <div className="px-4 md:px-6 space-y-3">
        <h2 className="font-semibold">Photos</h2>
        {profile.photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
            {profile.photos.slice(0, 9).map((photo, index) => (
              <motion.button
                key={index}
                onClick={() => setSelectedPhoto(photo)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative aspect-square overflow-hidden bg-muted"
              >
                <img
                  src={photo}
                  alt=""
                  className="w-full h-full object-cover"
                />
                {index === 8 && profile.photos.length > 9 && (
                  <div className="absolute inset-0 bg-black flex items-center justify-center">
                    <span className="text-white text-xl font-bold">
                      +{profile.photos.length - 9}
                    </span>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground rounded-xl border border-dashed">
            <p className="text-sm">No photos yet</p>
          </div>
        )}
      </div>

      {/* Photo viewer modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={selectedPhoto}
              alt=""
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function formatJoinDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function formatCount(count: number): string {
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`
  return `${(count / 1000000).toFixed(1)}M`
}
