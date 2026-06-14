'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MessageCircle, Phone, Video, Ban, AlertTriangle, MapPin, Calendar, Loader2, ShieldCheck, Heart, Briefcase, GraduationCap, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AvatarStatusBadge } from '@/components/presence'
import { useUserById, useBlockUser, useUnblockUser, useReportUser } from '@/src/api/hooks/useProfile'
import { useMutualFriends } from '@/src/api/hooks/useDiscover'
import { useImageViewer } from '@/components/providers'
import { BASE_URL, getMediaUrl } from '@/src/api/client'
import type { ChatContact, MediaAttachment } from './types'

interface UserProfileModalProps {
  contact: ChatContact | null
  userId?: string | null
  isOpen: boolean
  onClose: () => void
  onMessage?: () => void
  isOwnProfile?: boolean
  sharedMedia?: MediaAttachment[]
}

export function UserProfileModal({ contact, userId, isOpen, onClose, onMessage, isOwnProfile = false, sharedMedia = [] }: UserProfileModalProps) {
  const { showImage } = useImageViewer()
  // Use either the explicit userId prop or fallback to contact's ID if appropriate
  const activeUserId = userId || (contact && !contact.id.includes('-') ? contact.id : null)

  const { data: user, isLoading: isUserLoading } = useUserById(activeUserId || '')
  const { data: mutualData, isLoading: isMutualLoading } = useMutualFriends(activeUserId || '')

  const blockMutation = useBlockUser()
  const unblockMutation = useUnblockUser()
  const reportMutation = useReportUser()

  const [showReportForm, setShowReportForm] = useState(false)
  const [reportReason, setReportReason] = useState('spam')
  const [reportDescription, setReportDescription] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setShowReportForm(false)
      setReportDescription('')
    }
  }, [isOpen])

  const handleBlockToggle = () => {
    if (!user) return
    if (user.isBlocked) {
      unblockMutation.mutate(user.id)
    } else {
      blockMutation.mutate(user.id)
    }
  }

  const handleReport = () => {
    if (!user) return
    reportMutation.mutate(
      { userId: user.id, reason: reportReason, description: reportDescription },
      {
        onSuccess: () => {
          setShowReportForm(false)
          setReportDescription('')
        },
      }
    )
  }

  const formatInterest = (interest: string) => {
    if (!interest) return ''
    return interest.charAt(0).toUpperCase() + interest.slice(1).toLowerCase()
  }

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[250] bg-black/40 backdrop-blur-xs"
          />

          {/* Sliding Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            className="fixed top-0 right-0 z-[260] h-full w-full sm:w-[400px] bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-border bg-card shrink-0">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 hover:bg-muted rounded-full"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </Button>
                <h2 className="text-md font-semibold text-foreground">Contact info</h2>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto bg-muted/20 dark:bg-muted/10 space-y-3 pb-8">
              {isUserLoading ? (
                <div className="flex flex-col items-center justify-center h-64 p-6">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground mt-2">Loading contact details...</p>
                </div>
              ) : user ? (
                <>
                  {/* Section 1: Main Avatar Card */}
                  <div className="flex flex-col items-center text-center p-6 bg-card border-b border-border shadow-xs">
                    <div 
                      className={`relative mb-4 ${user.avatar ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
                      onClick={() => user.avatar && showImage(getMediaUrl(user.avatar)!)}
                    >
                      <AvatarStatusBadge
                        fallback={(user.name || 'U').slice(0, 2).toUpperCase()}
                        status={user.presence || 'offline'}
                        size="xl"
                        showStatusDot
                        src={user.avatar || undefined}
                        gender={user.gender}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground truncate max-w-[280px]">
                        {user.name}
                      </h3>
                      {user.isVerified && (
                        <ShieldCheck className="h-5.5 w-5.5 text-blue-500 fill-blue-500/10 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      @{user.username || user.name.toLowerCase()}
                    </p>
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-2">
                      {user.presence === 'online' ? 'Online' : 'Offline'}
                    </p>

                    {/* Quick call/message bar */}
                    {!isOwnProfile && (
                      <div className="flex gap-4 mt-5">
                        <Button
                          onClick={() => {
                            onMessage?.()
                            onClose()
                          }}
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-full hover:bg-muted border-border"
                        >
                          <MessageCircle className="h-4.5 w-4.5 text-primary" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-full hover:bg-muted border-border"
                        >
                          <Phone className="h-4.5 w-4.5 text-primary" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-full hover:bg-muted border-border"
                        >
                          <Video className="h-4.5 w-4.5 text-primary" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Section 2: About / Bio */}
                  <div className="p-6 bg-card border-b border-border shadow-xs space-y-2">
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                      About
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {user.bio || 'Hey there! I am using talkMe.'}
                    </p>
                  </div>

                  {/* Section 3: Details */}
                  <div className="p-6 bg-card border-b border-border shadow-xs space-y-4">
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                      Personal details
                    </p>
                    <div className="space-y-3">
                      {(user.city || user.country) && (
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <MapPin className="h-4.5 w-4.5 shrink-0" />
                          <span>
                            {[user.city, user.country].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                      {user.age && (
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <Calendar className="h-4.5 w-4.5 shrink-0" />
                          <span>{user.age} years old</span>
                        </div>
                      )}
                      {user.gender && (
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <User className="h-4.5 w-4.5 shrink-0" />
                          <span className="capitalize">{user.gender}</span>
                        </div>
                      )}
                      {user.occupation && (
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <Briefcase className="h-4.5 w-4.5 shrink-0" />
                          <span>{user.occupation}</span>
                        </div>
                      )}
                      {user.education && (
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <GraduationCap className="h-4.5 w-4.5 shrink-0" />
                          <span>{user.education}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 4: Shared Media */}
                  {sharedMedia && sharedMedia.length > 0 && (
                    <div className="p-6 bg-card border-b border-border shadow-xs space-y-3">
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                        Media, links, and docs
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                        {sharedMedia.map((media, idx) => (
                          <div 
                            key={idx} 
                            className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden cursor-pointer hover:opacity-90"
                            onClick={() => media.type === "image" && showImage(media.url)}
                          >
                            {media.type === "image" || media.type === "video" ? (
                              <img src={media.thumbnail || media.url} alt="Shared media" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-muted flex flex-col items-center justify-center">
                                <span className="text-[10px] font-medium truncate w-full px-1 text-center">{media.fileName || "File"}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section 5: Interests */}
                  {user.interests && user.interests.length > 0 && (
                    <div className="p-6 bg-card border-b border-border shadow-xs space-y-3">
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                        Interests
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {user.interests.map((interest) => (
                          <Badge key={interest} variant="secondary" className="text-xs font-medium px-2 py-0.5">
                            {formatInterest(interest)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section 5: Mutual Friends */}
                  {!isOwnProfile && (
                    <div className="p-6 bg-card border-b border-border shadow-xs">
                      {isMutualLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : mutualData?.users && mutualData.users.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                            Mutual Friends ({mutualData.count})
                          </p>
                          <div className="space-y-3">
                            {mutualData.users.slice(0, 5).map((mFriend) => (
                              <div key={mFriend.id} className="flex items-center gap-3">
                                <AvatarStatusBadge
                                  fallback={(mFriend.name || 'U').slice(0, 2).toUpperCase()}
                                  status={mFriend.presence || 'offline'}
                                  size="sm"
                                  showStatusDot
                                  src={mFriend.avatar || undefined}
                                  gender={mFriend.gender}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-foreground truncate">{mFriend.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">@{mFriend.username || mFriend.name.toLowerCase()}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                            Mutual Friends
                          </p>
                          <p className="text-xs text-muted-foreground">No mutual friends</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section 6: Action list */}
                  {!isOwnProfile && (
                    <div className="p-6 bg-card border-b border-border shadow-xs space-y-4">
                      {showReportForm ? (
                        <div className="space-y-3 border-t border-border pt-3">
                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                            Report details
                          </p>
                          <div className="space-y-2">
                            <select
                              value={reportReason}
                              onChange={(e) => setReportReason(e.target.value)}
                              className="w-full text-sm p-2 rounded-md border border-border bg-background"
                            >
                              <option value="spam">Spam / Advertising</option>
                              <option value="abuse">Harassment / Abuse</option>
                              <option value="inappropriate">Inappropriate profile details</option>
                              <option value="other">Other</option>
                            </select>
                            <textarea
                              value={reportDescription}
                              onChange={(e) => setReportDescription(e.target.value)}
                              placeholder="Please describe the issue..."
                              className="w-full text-xs p-2 rounded-md border border-border bg-background h-16 resize-none"
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowReportForm(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={handleReport}
                                disabled={reportMutation.isPending}
                              >
                                {reportMutation.isPending ? 'Sending...' : 'Submit Report'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <button
                            onClick={handleBlockToggle}
                            disabled={blockMutation.isPending || unblockMutation.isPending}
                            className="w-full flex items-center gap-3 text-sm font-medium text-destructive hover:bg-destructive/5 p-2.5 rounded-lg transition-colors text-left"
                          >
                            <Ban className="h-4.5 w-4.5" />
                            <span>
                              {user.isBlocked ? 'Unblock' : 'Block'} {user.name}
                            </span>
                          </button>
                          <button
                            onClick={() => setShowReportForm(true)}
                            className="w-full flex items-center gap-3 text-sm font-medium text-destructive hover:bg-destructive/5 p-2.5 rounded-lg transition-colors text-left"
                          >
                            <AlertTriangle className="h-4.5 w-4.5" />
                            <span>Report {user.name}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  User not found
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  if (typeof document === 'undefined') return null
  return createPortal(modalContent, document.body)
}
