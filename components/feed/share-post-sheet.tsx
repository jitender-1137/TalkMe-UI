"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Send, Check, Loader2 } from "lucide-react"
import { useContacts } from "@/src/api/hooks/useContacts"
import { useOpenOrCreateChat, useChats } from "@/src/api/hooks/useChats"
import { MessageService } from "@/src/api/services/message.service"
import { getAvatarUrl } from "@/lib/utils"
import { getMediaUrl } from "@/src/api/client"
import { serializeSharedPost } from "@/lib/shared-post"
import { showErrorToast, showSuccessToast } from "@/src/api/error-handler"
import type { Post } from "./types"

interface SharePostSheetProps {
  post: Post
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** In-app post sharing — send a post to a contact as a chat message. */
export function SharePostSheet({ post, open, onOpenChange }: SharePostSheetProps) {
  const { data: contacts = [] } = useContacts()
  const { data: chats = [] } = useChats()
  const openOrCreateChat = useOpenOrCreateChat()
  const [query, setQuery] = useState("")
  const [sentTo, setSentTo] = useState<Set<string>>(new Set())
  const [sendingId, setSendingId] = useState<string | null>(null)

  // Share targets = followings (contacts) + people you've chatted with (DM
  // partners from the chat list), deduped by user id. Instagram shows both.
  const people = useMemo(() => {
    const byId = new Map<string, { id: string; name?: string; username?: string; avatar?: string | null }>()
    for (const c of contacts) {
      if (c?.id) byId.set(c.id, { id: c.id, name: c.name, username: c.username, avatar: c.avatar })
    }
    for (const chat of chats as any[]) {
      const isGroup = chat?.chatType === "GROUP" || chat?.type === "group"
      const u = chat?.otherUser
      if (!isGroup && u?.id && !byId.has(u.id)) {
        byId.set(u.id, { id: u.id, name: u.name, username: u.username, avatar: u.avatar })
      }
    }
    return Array.from(byId.values())
  }, [contacts, chats])

  const filtered = people.filter((c) =>
    (c.name || c.username || "").toLowerCase().includes(query.toLowerCase()),
  )

  const buildPayload = () => {
    const first = post.media?.[0] as any
    const rawUrl = first ? (typeof first === "string" ? first : first.url) : undefined
    const mediaType: "image" | "video" =
      first && typeof first !== "string" && first.type === "video" ? "video" : "image"
    // Carry a structured reference to the post in the message content. The chat
    // bubble renders it as an Instagram-style card (see SharedPostCard); list
    // previews & notifications go through sharedPostPreview(), so the raw blob
    // is never shown to the user.
    const content = serializeSharedPost({
      postId: post.id,
      authorName: post.author?.name || post.author?.username || "Unknown",
      authorUsername: post.author?.username,
      authorAvatar: post.author?.avatar,
      caption: post.content || undefined,
      thumbnail: rawUrl ? getMediaUrl(rawUrl) : undefined,
      mediaType: rawUrl ? mediaType : undefined,
    })
    return { content }
  }

  const handleSend = async (contact: (typeof people)[number]) => {
    if (sendingId || sentTo.has(contact.id)) return
    setSendingId(contact.id)
    try {
      const chat = await openOrCreateChat(contact.id)
      await MessageService.sendMessage(chat.id, buildPayload())
      setSentTo((prev) => new Set(prev).add(contact.id))
      showSuccessToast(`Sent to ${contact.name || contact.username}`)
    } catch (e) {
      showErrorToast(e as Error)
    } finally {
      setSendingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share post</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people"
            className="pl-9 h-10"
          />
        </div>

        <div className="max-h-80 overflow-y-auto -mx-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {contacts.length === 0 ? "No contacts to share with yet." : "No people found."}
            </p>
          ) : (
            filtered.map((c) => {
              const sent = sentTo.has(c.id)
              const sending = sendingId === c.id
              return (
                <div key={c.id} className="flex items-center gap-3 px-1 py-2">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={getAvatarUrl(c.avatar ?? undefined)} />
                    <AvatarFallback>{(c.name || c.username || "?").charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name || c.username}</p>
                    {c.username && (
                      <p className="text-xs text-muted-foreground truncate">@{c.username}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={sent ? "outline" : "default"}
                    disabled={sent || sending}
                    onClick={() => handleSend(c)}
                    className="h-8 shrink-0"
                  >
                    {sent ? (
                      <>
                        <Check className="h-4 w-4 mr-1" /> Sent
                      </>
                    ) : sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1" /> Send
                      </>
                    )}
                  </Button>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
