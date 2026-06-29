"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { ChatHeader } from "./chat-header"
import { VirtualizedChatList } from "./virtualized-chat-list"
import { MessageInput } from "./message-input"
import { useCall } from "@/components/providers"
import { CameraModal } from "./camera-modal"
import { ChatSearchSidebar } from "./chat-search-sidebar"
import { useChatContext } from "./chat-context"
import * as ContextMenu from "./message-context-menu"
import { EmojiReactionPanel } from "./emoji-reaction-panel"
import { useIsMobile } from "@/hooks/use-mobile"
import { useVisualViewport } from "@/hooks/use-visual-viewport"
import { cn } from "@/lib/utils"
import { displayContent } from "@/lib/shared-post"
import type { Message, ChatContact, ReplyTo, PendingAttachment } from "./types"
import { toast } from "sonner"
import { getPendingFile } from "@/lib/chat/pending-upload-files"
import { Button } from "@/components/ui/button"
import { BASE_URL, getMediaUrl } from "@/src/api/client"

import { useProfile, useBlockUser, useUnblockUser } from "@/src/api/hooks/useProfile"
import { useChat, useClearChat, useMarkChatAsRead, useMuteChat, useUnmuteChat } from "@/src/api/hooks/useChats"
import { useAddContact, useRemoveContact, useContacts } from "@/src/api/hooks/useContacts"
import {
  useMessages,
  useSendMessage,
  useDeleteMessage,
  useReactToMessage,
  useRemoveReaction,
} from "@/src/api/hooks/useMessages"
import { useWebSocket } from "@/components/providers/websocket-provider"
import { useQueryClient } from "@tanstack/react-query"
import { useChatConsent, useRequestConsent, useAcceptConsent, useDeclineConsent, useRevokeConsent } from "@/src/api/hooks/useConsent"
import { ConsentRequestDialog } from "./consent-request-dialog"
import { checkImageNsfw, checkVideoNsfw } from "@/lib/moderation/nsfw-check"
import { useLivePresence } from "@/lib/presence/live-status-store"
import { Loader2, MessageSquare, Video, Phone, Shield } from "lucide-react"

function formatLastSeen(lastSeenStr?: string | null): string | undefined {
  if (!lastSeenStr) return undefined
  const dateObj = new Date(lastSeenStr)
  if (isNaN(dateObj.getTime())) return undefined

  const now = new Date()
  const timePart = dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  
  if (dateObj.toDateString() === now.toDateString()) {
    return `today at ${timePart}`
  } else {
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    if (dateObj.toDateString() === yesterday.toDateString()) {
      return `yesterday at ${timePart}`
    }
  }
  
  const datePart = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  return `${datePart} at ${timePart}`
}

export function ChatArea({
  conversationId,
  onBack,
}: {
  conversationId?: string | null
  onBack?: () => void
} = {}) {
  const { selectedConversationId: contextConversationId, setSelectedConversationId, setShowMobileSecondaryPanel, showMobileSecondaryPanel, setProfileModal } = useChatContext()
  const selectedConversationId = conversationId !== undefined ? conversationId : contextConversationId
  const isSecondaryActive = conversationId !== undefined ? false : showMobileSecondaryPanel
  const isMobile = useIsMobile()
  const { makeCall } = useCall()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null)
  // Text handed back to the composer when a send is hard-rejected for non-clean
  // content (so a long message isn't lost — the user can edit out the bad word).
  const [restoreDraft, setRestoreDraft] = useState<string | null>(null)
  const { data: contacts } = useContacts()

  const [showCameraModal, setShowCameraModal] = useState(false)
  const [showSearchSidebar, setShowSearchSidebar] = useState(false)
  const [showCallRestrictionModal, setShowCallRestrictionModal] = useState(false)
  const [messageMenuOpen, setMessageMenuOpen] = useState(false)
  const [messageMenuPos, setMessageMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  // Full emoji picker for the context-menu "+ more reactions" affordance.
  const [reactionPickerFor, setReactionPickerFor] = useState<Message | null>(null)
  const [uploadType, setUploadType] = useState<"image" | "video" | "audio" | "document" | "camera">("image")
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null)

  // Reply state is per-conversation. The ChatArea instance is reused when the
  // user switches chats (only selectedConversationId changes), so an unsent
  // reply selected in one chat would otherwise leak into the next. Clear the
  // draft reply (and any in-progress attachment) when the conversation changes.
  //
  // The live typing / recording indicators are likewise per-conversation and
  // MUST be reset here: if the partner is mid-typing when we switch away, their
  // eventual `typing_stopped` carries the OLD chatId and is filtered out by the
  // `isTargetChat` guard below — so a stale `partnerTyping = true` would stick
  // and surface as a phantom "typing"/online status on the newly opened chat.
  useEffect(() => {
    setReplyTo(null)
    setRestoreDraft(null)
    setPendingAttachment(null)
    setPartnerTyping(false)
    setPartnerRecording(null)
  }, [selectedConversationId])

  const { data: ownProfile } = useProfile()
  const { data: chatDetail, isLoading: isChatLoading } = useChat(selectedConversationId || "")
  const {
    data: messagesResponse,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(selectedConversationId || "")

  const consent = useChatConsent(selectedConversationId || "")
  const requestConsentMutation = useRequestConsent(selectedConversationId || "")
  const acceptConsentMutation = useAcceptConsent(selectedConversationId || "")
  const declineConsentMutation = useDeclineConsent(selectedConversationId || "")
  const revokeConsentMutation = useRevokeConsent(selectedConversationId || "")
  const [consentDialogOpen, setConsentDialogOpen] = useState(false)
  const consentQueryClient = useQueryClient()

  // A send the server withheld pending 18+ consent now shows IN the thread as a
  // "not delivered · needs consent" bubble (with a Request-consent action) — no
  // toast, no popup. Here we only refresh the consent flags so that bubble and the
  // header badge reflect the latest state.
  const handleModerationResult = useCallback(
    (sent: any) => {
      if (sent?.moderationStatus !== "BLOCKED_PENDING_CONSENT") return
      if (selectedConversationId) {
        consentQueryClient.invalidateQueries({ queryKey: ["consent", selectedConversationId] })
      }
    },
    [selectedConversationId, consentQueryClient],
  )
  const sendMessageMutation = useSendMessage(selectedConversationId || "", {
    restoreDraftToInput: (content) => setRestoreDraft(content),
  })
  const deleteMessageMutation = useDeleteMessage(selectedConversationId || "")
  const reactToMessageMutation = useReactToMessage(selectedConversationId || "")
  const removeReactionMutation = useRemoveReaction(selectedConversationId || "")
  const clearChatMutation = useClearChat()
  const muteMutation = useMuteChat()
  const unmuteMutation = useUnmuteChat()
  const blockUserMutation = useBlockUser()
  const unblockUserMutation = useUnblockUser()
  const addContactMutation = useAddContact()
  const removeContactMutation = useRemoveContact()
  const { mutate: markAsRead } = useMarkChatAsRead()

  const isChatMuted = chatDetail?.muted || chatDetail?.isMuted || false

  const { registerHandler, sendEvent, subscribeToPresence } = useWebSocket()
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [partnerRecording, setPartnerRecording] = useState<"recording" | "recording_video" | null>(null)
  // Keep the chat screen glued to the *visual* viewport (the area not covered by
  // the on-screen keyboard) — WhatsApp-style. Driving the fixed container's height
  // AND top from these keeps the header pinned, shrinks the messages area, and rides
  // the input just above the keyboard instead of hiding it behind. Shared with the
  // lobby + quick-match chats via useVisualViewport().
  const { height: viewportHeight, offsetTop: viewportOffsetTop } = useVisualViewport()

  // Track active chat ID globally for WebSocket message notifications
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).activeChatId = !isSecondaryActive ? (selectedConversationId || undefined) : undefined
    }
    return () => {
      if (typeof window !== "undefined") {
        (window as any).activeChatId = undefined
      }
    }
  }, [selectedConversationId, isSecondaryActive])

  // Mark chat as read when opened
  useEffect(() => {
    if (selectedConversationId) {
      markAsRead(selectedConversationId)
    }
  }, [selectedConversationId, markAsRead])

  // An offline backlog (messages received while A was away) syncs into the chat a
  // beat AFTER the on-open mark above — so the first mark misses it and the chat
  // still shows unread until a second open. Re-mark whenever the open chat's live
  // unread count is still > 0, so the VERY FIRST open reliably clears it.
  const openChatUnread = chatDetail?.unreadCount ?? 0
  useEffect(() => {
    if (selectedConversationId && !isSecondaryActive && openChatUnread > 0) {
      markAsRead(selectedConversationId)
    }
  }, [selectedConversationId, isSecondaryActive, openChatUnread, markAsRead])

  // Register WebSocket listeners for live typing indicators
  useEffect(() => {
    if (!selectedConversationId) return
    const cleanup1 = registerHandler("typing_started", (payload: any) => {
      const isSelf = payload.userId === ownProfile?.id
      const isTargetChat = payload.chatId === selectedConversationId
      console.log("[TYPING UI] ChatArea received typing_started event:", {
        currentLoggedInUserId: ownProfile?.id,
        chatId: selectedConversationId,
        eventChatId: payload.chatId,
        senderId: payload.userId,
        ignored: (isSelf || !isTargetChat) ? "YES" : "NO",
        reason: isSelf ? "Self typing event" : (!isTargetChat ? "Different conversation" : "None")
      })
      if (isTargetChat && !isSelf) {
        setPartnerTyping(true)
      }
    })
    const cleanup2 = registerHandler("typing_stopped", (payload: any) => {
      const isSelf = payload.userId === ownProfile?.id
      const isTargetChat = payload.chatId === selectedConversationId
      console.log("[TYPING UI] ChatArea received typing_stopped event:", {
        currentLoggedInUserId: ownProfile?.id,
        chatId: selectedConversationId,
        eventChatId: payload.chatId,
        senderId: payload.userId,
        ignored: (isSelf || !isTargetChat) ? "YES" : "NO",
        reason: isSelf ? "Self typing event" : (!isTargetChat ? "Different conversation" : "None")
      })
      if (isTargetChat && !isSelf) {
        setPartnerTyping(false)
      }
    })
    const cleanup3 = registerHandler("chat_activity", (payload: any) => {
      const isSelf = payload.userId === ownProfile?.id
      const isTargetChat = payload.chatId === selectedConversationId
      if (!isTargetChat || isSelf) return
      switch (payload.activity) {
        case "RECORDING_AUDIO":
          setPartnerRecording("recording")
          break
        case "RECORDING_VIDEO":
          setPartnerRecording("recording_video")
          break
        default:
          setPartnerRecording(null)
      }
    })
    return () => {
      cleanup1()
      cleanup2()
      cleanup3()
    }
  }, [registerHandler, selectedConversationId, ownProfile?.id])

  // The receiver is NOT auto-prompted on open — a tap-to-respond banner above the
  // composer (shown when awaitingMyAccept) opens the accept/decline dialog instead.

  // Reset transient consent UI when switching chats.
  useEffect(() => {
    setConsentDialogOpen(false)
  }, [selectedConversationId])

  // Map other participant details
  const isGroup = chatDetail?.chatType === "GROUP" || chatDetail?.type === "group"
  const otherParticipant = chatDetail?.otherUser ?? chatDetail?.participants?.find((p) => p.id !== ownProfile?.id)
  const partnerId = otherParticipant?.id
  const partnerUsername = (otherParticipant as any)?.username
  // Global live presence — single source of truth, updated by the WS handler and
  // shared by the chat list, friends, discover, etc.
  const livePartner = useLivePresence(partnerId)
  const contactName = isGroup
    ? (chatDetail?.name ?? "Group Chat")
    : (otherParticipant?.name || otherParticipant?.username || "Unknown User")
  // Live presence overrides the (possibly stale) Dexie value. Pass the full
  // online/idle/offline status through so the header reflects idle (Away) too.
  const liveStatus = livePartner ? livePartner.status : undefined
  const contactPresence = isGroup
    ? "online"
    : (partnerRecording ? partnerRecording
       : (partnerTyping ? "typing"
          : (liveStatus ?? otherParticipant?.presence ?? "offline")))

  const contact: ChatContact = {
    id: selectedConversationId || "1",
    name: contactName,
    avatar: chatDetail?.avatar || otherParticipant?.avatar || undefined,
    gender: otherParticipant?.gender || undefined,
    activity: contactPresence as any,
    lastSeen: formatLastSeen(livePartner?.lastSeen ?? otherParticipant?.lastSeen),
    isFriend: contacts?.some(c => c.id === otherParticipant?.id) || false,
    isBlockedByMe: chatDetail?.isBlockedByMe,
    hasBlockedMe: chatDetail?.hasBlockedMe,
  }

  // Subscribe to the open partner's presence (sticky so the contacts sync won't
  // drop it for non-contact/stranger chats). Live updates flow through the global
  // store + useLivePresence above — no per-component event handlers needed.
  useEffect(() => {
    if (partnerUsername) subscribeToPresence(partnerUsername, true)
  }, [partnerUsername, subscribeToPresence])

  // Flatten and map query pages to local Message[] interface
  const allMessages: Message[] = useMemo(() => {
    if (!messagesResponse?.pages) return []
    const flat = messagesResponse.pages.flatMap((page) => page.items)
    const mapped: Message[] = flat.map((m) => {
      const isSent = m.senderId === ownProfile?.id

      // Resolve timestamp/time safely using createdAt (backend) or timestamp (fallback)
      const rawTime = m.timestamp || (m as any).createdAt
      const timeObj = rawTime ? new Date(rawTime) : new Date()
      const timestamp = isNaN(timeObj.getTime()) ? Date.now() : timeObj.getTime()
      const time = isNaN(timeObj.getTime())
        ? new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
        : timeObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })

      // Resolve message type
      const messageTypeRaw = m.type || (m as any).messageType || "text"
      const type = messageTypeRaw.toLowerCase() as any

      // Resolve status: map backend status (READ, DELIVERED, SENT) to UI status (seen, delivered, sent)
      let status: any = "sent"
      const lowerStatus = (m.status || "").toLowerCase()
      const rawStatus = (m.status || (m as any).status || "").toUpperCase()
      if (
        lowerStatus === "blocked" ||
        lowerStatus === "uploading" ||
        lowerStatus === "sending" ||
        lowerStatus === "failed"
      ) {
        // Local-only states (held-pending-consent / optimistic upload) — keep as-is.
        status = lowerStatus
      } else if (rawStatus === "READ" || rawStatus === "SEEN") {
        status = "seen"
      } else if (rawStatus === "DELIVERED") {
        status = "delivered"
      } else if (rawStatus === "SENT") {
        status = "sent"
      }

      // Group raw reactions by emoji
      const rawReactions: { username: string; emoji: string }[] = (m as any).reactions || []
      const reactionGroups: Record<string, { emoji: string; count: number; users: string[]; hasReacted: boolean }> = {}
      for (const r of rawReactions) {
        if (!r.emoji) continue
        if (!reactionGroups[r.emoji]) {
          reactionGroups[r.emoji] = {
            emoji: r.emoji,
            count: 0,
            users: [],
            hasReacted: false,
          }
        }
        reactionGroups[r.emoji].count += 1
        reactionGroups[r.emoji].users.push(r.username)
        if (r.username === ownProfile?.username) {
          reactionGroups[r.emoji].hasReacted = true
        }
      }
      const reactions = Object.values(reactionGroups)

      // Resolve parent reply
      const parentMsg = m.replyTo || (m as any).parentMessage
      let replyTo = undefined
      if (parentMsg) {
        const parentIsSent = parentMsg.senderId === ownProfile?.id
        const parentSenderName = parentMsg.senderName || (parentIsSent ? "You" : contactName)
        // Media thumbnail for the quote: optimistic replyTo carries media.url; the
        // server's parentMessage carries fileUrl (+ attachments fallback).
        const parentRawMedia =
          parentMsg.media?.url ||
          parentMsg.mediaUrl ||
          parentMsg.fileUrl ||
          parentMsg.attachments?.[0]?.fileUrl ||
          parentMsg.attachments?.[0]?.url
        replyTo = {
          id: parentMsg.id,
          senderName: parentSenderName,
          content: displayContent(parentMsg.content),
          type: (parentMsg.type || parentMsg.messageType || "text").toLowerCase() as any,
          mediaUrl: parentRawMedia ? getMediaUrl(parentRawMedia) : undefined,
        }
      }

      // Resolve attachments/media
      const attachment = (m as any).attachments?.[0] || m.media
      const rawUrl = attachment?.fileUrl || attachment?.url
      const media = attachment ? {
        type: (attachment.type || (m as any).messageType || "document").toLowerCase() as any,
        url: getMediaUrl(rawUrl),
        thumbnail: attachment.thumbnailUrl || attachment.thumbnail,
        fileName: attachment.fileName,
        fileSize: typeof attachment.fileSize === "number"
          ? `${(attachment.fileSize / (1024 * 1024)).toFixed(2)} MB`
          : attachment.fileSize,
        duration: attachment.duration,
        width: attachment.width,
        height: attachment.height,
      } : undefined

      return {
        id: m.id,
        clientId: (m as any).clientId,
        content: m.content,
        time,
        timestamp,
        isSent,
        senderName: m.senderName,
        senderAvatar: m.senderAvatar || undefined,
        status,
        type,
        reactions,
        replyTo,
        media,
        isDeleted: m.isDeleted,
      }
    })
    return mapped.sort((a, b) => a.timestamp - b.timestamp)
  }, [messagesResponse, ownProfile?.id, ownProfile?.username, contactName])

  const sharedMedia = useMemo(() => {
    return allMessages
      .filter(m => m.media && m.media.url)
      .map(m => m.media!)
      .reverse() // show latest first
  }, [allMessages])



  const handleSend = useCallback((content: string) => {
    if (!content.trim() && !pendingAttachment) return

    // Pre-flight size guard for non-image media. Images are compressed before upload,
    // so their RAW size isn't the limit (the backend validates the compressed bytes and
    // a 413 cleanly removes the bubble). Videos/audio/documents aren't compressed, so a
    // too-large file would otherwise show an "uploading" bubble, fail after a long
    // upload, and offer a broken retry. Reject it up-front: show an error and keep it
    // OUT of the chat entirely (no bubble, no resend). Mirrors the backend 30 MB cap.
    if (pendingAttachment && pendingAttachment.type !== "image" && pendingAttachment.file) {
      const MAX_NON_IMAGE_BYTES = 30 * 1024 * 1024
      if (pendingAttachment.file.size > MAX_NON_IMAGE_BYTES) {
        const label =
          pendingAttachment.type.charAt(0).toUpperCase() + pendingAttachment.type.slice(1)
        toast.error(`${label} is too large. Maximum size is 30 MB.`)
        return // keep the composer attachment so the user can remove/replace it
      }
    }

    // Capture + clear the composer IMMEDIATELY. The send button must not wait on the
    // upload/network: the optimistic bubble appears right away (status "uploading" for
    // media) and the file uploads in the background (see useSendMessage). Any group
    // NSFW hard-block already happened at pick-time (see uploadFile below).
    const attachment = pendingAttachment
    const reply = replyTo
    setPendingAttachment(null)
    setReplyTo(null)

    if (attachment) {
      sendMessageMutation.mutate(
        {
          content: content.trim(),
          type: attachment.type as any,
          replyToId: reply?.id || undefined,
          localFile: attachment.file,
          localPreviewUrl: attachment.previewUrl,
        },
        { onSuccess: (sent) => handleModerationResult(sent) },
      )
    } else {
      sendMessageMutation.mutate(
        { content: content.trim(), type: "text", replyToId: reply?.id || undefined },
        { onSuccess: (sent) => handleModerationResult(sent) },
      )
    }
  }, [pendingAttachment, replyTo, sendMessageMutation, handleModerationResult])

  const handleSendMediaDirectly = useCallback((url: string, type: "image" | "sticker") => {
    // GIF / sticker — already a remote URL, no upload. Preserve the reply reference
    // (this was the bug: replying then sending a GIF dropped the parent) and clear it.
    const reply = replyTo
    setReplyTo(null)
    sendMessageMutation.mutate({
      content: "",
      type: "image",
      replyToId: reply?.id || undefined,
      media: {
        url: url,
        type: "image",
        fileName: type === "sticker" ? "sticker.png" : "animated.gif",
        fileSize: "0.1 MB",
        mimeType: type === "sticker" ? "image/png" : "image/gif",
      },
    })
  }, [replyTo, sendMessageMutation])

  const handleSendAudio = useCallback((file: File) => {
    const reply = replyTo
    setReplyTo(null)
    sendMessageMutation.mutate({
      content: "",
      type: "audio",
      replyToId: reply?.id || undefined,
      localFile: file,
      localPreviewUrl: typeof URL !== "undefined" ? URL.createObjectURL(file) : undefined,
    })
  }, [replyTo, sendMessageMutation])

  const handleTyping = useCallback((isTyping: boolean) => {
    if (selectedConversationId) {
      console.log("[TYPING UI] ChatArea dispatching typing event:", {
        currentLoggedInUserId: ownProfile?.id,
        chatId: selectedConversationId,
        status: isTyping ? "STARTED" : "STOPPED"
      })
      sendEvent(isTyping ? "typing_started" : "typing_stopped", {
        chatId: selectedConversationId,
      })
    }
  }, [sendEvent, selectedConversationId, ownProfile?.id])

  const handleRecordingChange = useCallback((recording: "audio" | null) => {
    if (!selectedConversationId) return
    if (recording) {
      sendEvent("recording_started", { chatId: selectedConversationId, mode: recording })
    } else {
      sendEvent("recording_stopped", { chatId: selectedConversationId })
    }
  }, [sendEvent, selectedConversationId])

  const uploadFile = useCallback(async (file: File, type: string) => {
    // Group chats hard-block explicit media — do it at PICK time (not send time) so the
    // send path stays instant. 1:1 proceeds; the server gates it via the consent flow.
    if (isGroup && (type === "image" || type === "video")) {
      try {
        const nsfw = type === "video" ? await checkVideoNsfw(file) : await checkImageNsfw(file)
        if (nsfw.isNsfw) {
          toast.error("Explicit media can't be sent in group chats.")
          return
        }
      } catch {
        /* model/transient failure — fall through; the server still hard-blocks groups */
      }
    }

    // Local blob preview for the optimistic bubble (image/video show a thumbnail;
    // documents use it as a temporary link until the real upload URL arrives).
    const previewUrl = typeof URL !== "undefined" ? URL.createObjectURL(file) : undefined

    setPendingAttachment({
      file,
      type: type as any,
      previewUrl,
    })
  }, [isGroup])

  const handleAttachClick = useCallback((type: "image" | "video" | "audio" | "document" | "camera") => {
    if (type === "camera") {
      setShowCameraModal(true)
    } else {
      setUploadType(type)
      if (fileInputRef.current) {
        fileInputRef.current.accept = 
          type === "image" ? "image/*,image/jpeg,image/png,image/gif,image/webp" : 
          type === "video" ? "video/*,video/mp4,video/webm,video/ogg" : 
          type === "audio" ? "audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac" : "*/*"
        fileInputRef.current.click()
      }
    }
  }, [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Strict validation to prevent OS file picker bypasses
    if (uploadType === "audio" && !file.type.startsWith("audio/")) {
      toast.error("Please select a valid audio file.")
      if (e.target) e.target.value = ""
      return
    }
    if (uploadType === "video" && !file.type.startsWith("video/")) {
      toast.error("Please select a valid video file.")
      if (e.target) e.target.value = ""
      return
    }
    if (uploadType === "image" && !file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.")
      if (e.target) e.target.value = ""
      return
    }
    
    await uploadFile(file, uploadType)
    if (e.target) e.target.value = ""
  }, [uploadFile, uploadType])

  const handleCameraCapture = useCallback(async (file: File) => {
    await uploadFile(file, "image")
  }, [uploadFile])

  const handleReactionClick = useCallback((messageId: string, emoji: string) => {
    const msg = allMessages.find((m) => m.id === messageId)
    const alreadyReacted = msg?.reactions?.find((r) => r.emoji === emoji && r.hasReacted)
    if (alreadyReacted) {
      removeReactionMutation.mutate({ messageId, emoji })
    } else {
      reactToMessageMutation.mutate({ messageId, payload: { emoji } })
    }
  }, [allMessages, reactToMessageMutation, removeReactionMutation])

  // Retry a failed send. Reuses the message's clientId so the server dedups
  // (Part B idempotency); onMutate overwrites the failed Dexie row back to
  // "sending" because its id == clientId.
  const handleRetry = useCallback((message: Message) => {
    const media = message.media
    // Media whose file never reached the server still has a local blob: preview URL.
    // Re-sending that URL would deliver a dead link to the recipient (the original
    // bug), so RE-UPLOAD the original file instead. It's cached in memory by clientId;
    // if it's gone (e.g. after a reload) we can't re-upload — block the resend and ask
    // the user to reattach rather than deliver an unreachable file.
    const needsReupload = !!media && (!media.url || media.url.startsWith("blob:"))
    if (needsReupload) {
      const file = message.clientId ? getPendingFile(message.clientId) : undefined
      if (!file) {
        toast.error("Couldn't resend this file — please attach it again.")
        return
      }
      sendMessageMutation.mutate({
        content: message.content,
        clientId: message.clientId,
        type: message.type,
        replyToId: message.replyTo?.id,
        localFile: file,
        localPreviewUrl: URL.createObjectURL(file),
      })
      return
    }

    sendMessageMutation.mutate({
      content: message.content,
      clientId: message.clientId,
      type: message.type,
      replyToId: message.replyTo?.id,
      media: media
        ? {
            url: media.url,
            // The send payload's media union excludes "sticker" (stickers use a
            // separate send path); narrow it for the retry.
            type: media.type as "image" | "video" | "audio" | "document",
            fileName: media.fileName,
            fileSize: media.fileSize,
            duration: media.duration,
            width: media.width,
            height: media.height,
          }
        : undefined,
    })
  }, [sendMessageMutation])

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const handleBack = () => {
    // On mobile we pushed a single history entry for the chat screen
    // (useBackDismiss). Route the in-app back button through history.back() so
    // it behaves identically to the OS Back button — closing the chat AND
    // restoring the tab it was opened from. On desktop there is no such entry,
    // so close via state (history.back() there would leave the app).
    if (typeof window !== "undefined" && (window.history.state as any)?.__backDismiss) {
      window.history.back()
      return
    }
    setSelectedConversationId(null)
    setShowMobileSecondaryPanel(true)
    if (onBack) {
      onBack()
    }
  }

  // Call handlers
  const handleAudioCall = useCallback(() => {
    if (!contact.isFriend) {
      setShowCallRestrictionModal(true)
      return
    }
    makeCall(selectedConversationId || "1", contact, "audio")
  }, [makeCall, selectedConversationId, contact])

  const handleVideoCall = useCallback(() => {
    if (!contact.isFriend) {
      setShowCallRestrictionModal(true)
      return
    }
    makeCall(selectedConversationId || "1", contact, "video")
  }, [makeCall, selectedConversationId, contact])

  // More menu handlers
  const handleSearchInChat = useCallback(() => {
    setShowSearchSidebar(true)
  }, [])

  const handleMessageClickFromSearch = useCallback((messageId: string) => {
    // Look for the message element in the DOM
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`)
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" })
      // Highlight effect
      messageElement.classList.add("bg-primary/20", "transition-colors", "duration-500")
      setTimeout(() => {
        messageElement.classList.remove("bg-primary/20")
      }, 2000)
    } else {
      toast.error("Message is too old to jump to currently.")
    }
  }, [])

  const handleViewMedia = useCallback(() => {
    setShowProfileModal(true)
  }, [])

  const handleMuteNotifications = useCallback(() => {
    if (!selectedConversationId) return
    if (isChatMuted) {
      unmuteMutation.mutate(selectedConversationId)
    } else {
      muteMutation.mutate({ chatId: selectedConversationId, payload: { duration: null } })
    }
  }, [isChatMuted, selectedConversationId, muteMutation, unmuteMutation])

  const handleBlockContact = useCallback(() => {
    if (otherParticipant?.id) {
      blockUserMutation.mutate(otherParticipant.id)
    }
  }, [blockUserMutation, otherParticipant?.id])

  const handleClearChat = useCallback(() => {
    if (selectedConversationId) {
      clearChatMutation.mutate(selectedConversationId)
    }
  }, [clearChatMutation, selectedConversationId])

  const handleOpenMessageMenu = useCallback((e: PointerEvent | MouseEvent, message: Message) => {
    setMessageMenuPos({ x: e.clientX, y: e.clientY })
    setSelectedMessage(message)
    setMessageMenuOpen(true)
  }, [])

  const handleMessageReply = useCallback((message: Message) => {
    // Carry the parent's media thumbnail so the reply quote/preview renders WhatsApp-
    // style for ANY parent type (image/video/GIF/sticker/audio/doc), not just text.
    setReplyTo({
      id: message.id,
      senderName: message.isSent ? "You" : contact.name,
      content: displayContent(message.content),
      type: message.type,
      mediaUrl: message.media?.url || undefined,
    })
    setMessageMenuOpen(false)
  }, [contact.name])

  const handleMessageDelete = useCallback((messageId: string) => {
    deleteMessageMutation.mutate(messageId)
    setMessageMenuOpen(false)
  }, [deleteMessageMutation])

  const handleMessageCopy = useCallback((message: Message) => {
    if (message.content) {
      navigator.clipboard.writeText(message.content)
      toast.success("Message copied to clipboard")
    }
    setMessageMenuOpen(false)
  }, [])

  return (
    !selectedConversationId ? (
        <div
          className="flex-1 flex flex-col items-center justify-center p-8 text-center h-[100dvh] bg-gradient-to-br from-background via-card/50 to-background"
        >
          {/* Beautiful Glassmorphic Container */}
          <div className="max-w-md w-full space-y-6 p-8 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-primary/20 hover:shadow-primary/5 group">
            {/* Animated/Glowing Icon Frame */}
            <div className="relative mx-auto w-24 h-24 rounded-2xl bg-gradient-to-tr from-primary to-violet-500 p-[1px] shadow-lg shadow-primary/25 transition-transform duration-500 group-hover:scale-105">
              <div className="w-full h-full rounded-2xl overflow-hidden bg-card flex items-center justify-center">
                <img src="/apple-icon.png" alt="TalkMe" className="w-full h-full object-cover animate-pulse" />
              </div>
              {/* Glowing rings */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-primary to-violet-500 opacity-20 blur-md -z-10 group-hover:opacity-40 transition-opacity duration-300" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
                Welcome to TalkMe Chat
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Select a conversation from the sidebar to start chatting, call friends, or share files securely.
              </p>
            </div>

            {/* Quick actions or features list */}
            <div className="grid grid-cols-2 gap-3 pt-2 text-left">
              <div className="p-3 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-300">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <div className="text-xs font-semibold text-primary">Chat</div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">Secure messaging with file sharing.</p>
              </div>
              <div className="p-3 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-300">
                <div className="flex items-center gap-2 mb-1">
                  <Video className="h-4 w-4 text-violet-400" />
                  <div className="text-xs font-semibold text-violet-400">Calls</div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">High quality audio & video calls.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-col bg-background md:pb-0 relative overflow-hidden",
            isMobile
              ? "fixed top-0 left-0 right-0 z-30"
              : "md:relative md:top-auto md:left-auto md:right-auto md:z-auto md:h-full"
          )}
          style={
            isMobile
              ? { height: viewportHeight, top: viewportOffsetTop }
              : { height: "100%" }
          }
          data-chat-area
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={
              uploadType === "image" 
                ? "image/*" 
                : uploadType === "video" 
                ? "video/*" 
                : uploadType === "audio" 
                ? "audio/*" 
                : "*/*"
            }
            className="hidden"
          />

          {isChatLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading chat...</span>
            </div>
          ) : (
            <>
              {!isSecondaryActive && (
                <ChatHeader 
                  contact={contact} 
                  showBackButton 
                  onBack={handleBack}
                  onProfileClick={() => {
                    if (contact) {
                      setProfileModal({
                        contact,
                        userId: otherParticipant?.id,
                        sharedMedia
                      });
                    }
                  }}
                  onAudioCall={handleAudioCall}
                  onVideoCall={handleVideoCall}
                  onSearchInChat={handleSearchInChat}
                  onViewMedia={handleViewMedia}
                  onMuteNotifications={handleMuteNotifications}
                  onBlockContact={() => otherParticipant?.id && blockUserMutation.mutate(otherParticipant.id)}
                  onUnblockContact={() => otherParticipant?.id && unblockUserMutation.mutate(otherParticipant.id)}
                  onClearChat={() => clearChatMutation.mutate(contact.id)}
                  onAddFriend={() => otherParticipant?.id && addContactMutation.mutate(otherParticipant.id)}
                  onRemoveFriend={() => otherParticipant?.id && removeContactMutation.mutate(otherParticipant.id)}
                  isMuted={isChatMuted}
                  consentStatus={isGroup ? undefined : consent.status}
                  consentIsRequester={consent.requestedByMe}
                  onRevokeConsent={() => revokeConsentMutation.mutate()}
                  onRespondConsent={() => setConsentDialogOpen(true)}
                />
              )}
              <CameraModal
                isOpen={showCameraModal}
                onClose={() => setShowCameraModal(false)}
                onCapture={handleCameraCapture}
              />
              <ChatSearchSidebar
                chatId={selectedConversationId || ""}
                isOpen={showSearchSidebar}
                onClose={() => setShowSearchSidebar(false)}
                onMessageClick={handleMessageClickFromSearch}
              />
              {!isSecondaryActive && (
                <VirtualizedChatList
                  key={`list-${selectedConversationId || "empty"}`}
                  chatId={selectedConversationId}
                  messages={allMessages}
                  onReactionClick={handleReactionClick}
                  onReply={handleMessageReply}
                  onRetry={handleRetry}
                  onLoadMore={handleLoadMore}
                  hasMore={hasNextPage}
                  isLoadingMore={isFetchingNextPage}
                  onOpenMessageMenu={handleOpenMessageMenu}
                  onRequestConsent={() => requestConsentMutation.mutate()}
                  consentPending={consent.isPending}
                  consentLimitReached={consent.limitReached}
                />
              )}
              {!isSecondaryActive && (
                contact.isBlockedByMe ? (
                  <div className="p-4 flex justify-center items-center bg-background border-t border-white/5">
                    <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-2xl w-full" onClick={() => otherParticipant?.id && unblockUserMutation.mutate(otherParticipant.id)}>
                      You blocked this contact. Tap to unblock.
                    </Button>
                  </div>
                ) : (
                  <>
                  {consent.awaitingMyAccept && (
                    <button
                      onClick={() => setConsentDialogOpen(true)}
                      className="w-full px-4 py-2 text-xs font-semibold text-amber-500 bg-amber-500/10 border-t border-amber-500/30 hover:bg-amber-500/15 transition-colors"
                    >
                      {contactName} requested to exchange 18+ content — tap to respond
                    </button>
                  )}
                  <MessageInput
                    key={`input-${selectedConversationId || "empty"}`}
                    onSend={handleSend}
                    replyTo={replyTo}
                    onCancelReply={() => setReplyTo(null)}
                    onTyping={handleTyping}
                    onRecordingChange={handleRecordingChange}
                    onAttachClick={handleAttachClick}
                    pendingAttachment={pendingAttachment}
                    onCancelAttachment={() => setPendingAttachment(null)}
                    onRecordComplete={handleSendAudio}
                    onSendMediaDirectly={handleSendMediaDirectly}
                    restoreDraft={restoreDraft}
                    onRestoreConsumed={() => setRestoreDraft(null)}
                  />
                  </>
                )
              )}
              {selectedMessage && (
                <ContextMenu.MessageContextMenu
                  isOpen={messageMenuOpen}
                  isSent={selectedMessage.isSent}
                  isMobile={isMobile}
                  position={messageMenuPos}
                  onClose={() => setMessageMenuOpen(false)}
                  onReply={() => handleMessageReply(selectedMessage)}
                  onCopy={() => handleMessageCopy(selectedMessage)}
                  onDelete={() => handleMessageDelete(selectedMessage.id)}
                  onForward={() => toast.info("Forward coming soon")}
                  onReact={(emoji) => {
                    if (emoji) {
                      handleReactionClick(selectedMessage.id, emoji)
                    } else {
                      // "+" → open the full emoji picker for this message.
                      setReactionPickerFor(selectedMessage)
                      setMessageMenuOpen(false)
                    }
                  }}
                  onPin={() => toast.info("Pin coming soon")}
                  onInfo={() => toast.info("Message info coming soon")}
                />
              )}

              {/* Full emoji reaction picker (opened from the context menu "+") */}
              {reactionPickerFor && (
                <div
                  className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4"
                  onClick={() => setReactionPickerFor(null)}
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    <EmojiReactionPanel
                      onSelect={(emoji) => {
                        handleReactionClick(reactionPickerFor.id, emoji)
                        setReactionPickerFor(null)
                      }}
                    />
                  </div>
                </div>
              )}

              <ConsentRequestDialog
                open={consentDialogOpen && consent.awaitingMyAccept}
                requesterName={contactName}
                accepting={acceptConsentMutation.isPending}
                rejecting={declineConsentMutation.isPending}
                onAccept={() =>
                  acceptConsentMutation.mutate(undefined, { onSuccess: () => setConsentDialogOpen(false) })
                }
                onReject={() =>
                  declineConsentMutation.mutate(undefined, { onSuccess: () => setConsentDialogOpen(false) })
                }
                onDismiss={() => setConsentDialogOpen(false)}
              />

              {showCallRestrictionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <div className="max-w-sm w-full bg-[#121b22] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in duration-200">
                    {/* Call icon with warning shield */}
                    <div className="relative mx-auto w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400">
                      <Phone className="h-8 w-8" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-black border-2 border-[#121b22]">
                        <Shield className="h-3.5 w-3.5" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-white">Friend Connection Required</h3>
                      <p className="text-sm text-neutral-300 leading-relaxed">
                        You must be friends with <span className="font-semibold text-primary">{contact.name}</span> to make audio or video calls.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button 
                        onClick={() => {
                          if (otherParticipant?.id) {
                            addContactMutation.mutate(otherParticipant.id)
                            toast.success(`Friend request sent to ${contact.name}`)
                          }
                          setShowCallRestrictionModal(false)
                        }}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 rounded-2xl transition-all"
                      >
                        Add Friend
                      </Button>
                      <Button 
                        variant="ghost"
                        onClick={() => setShowCallRestrictionModal(false)}
                        className="w-full text-muted-foreground hover:text-foreground hover:bg-white/5 py-2.5 rounded-2xl transition-all"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )
  )
}
