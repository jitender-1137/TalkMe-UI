"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Send, Check, Loader2 } from "lucide-react"
import { useContacts } from "@/src/api/hooks/useContacts"
import { ChatService } from "@/src/api/services/chat.service"
import { MessageService } from "@/src/api/services/message.service"
import { getAvatarUrl } from "@/lib/utils"
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
  const [query, setQuery] = useState("")
  const [sentTo, setSentTo] = useState<Set<string>>(new Set())
  const [sendingId, setSendingId] = useState<string | null>(null)

  const filtered = contacts.filter((c) =>
    (c.name || c.username || "").toLowerCase().includes(query.toLowerCase()),
  )

  const buildPayload = () => {
    const first = post.media?.[0] as any
    const url = first ? (typeof first === "string" ? first : first.url) : undefined
    const mediaType = first
      ? typeof first === "string"
        ? "image"
        : first.type || "image"
      : undefined
    const author = post.author?.username || post.author?.name || "a user"
    const content = post.content
      ? `Shared @${author}'s post: ${post.content}`
      : `Shared @${author}'s post`
    const payload: any = { content }
    if (url) payload.media = { url, type: mediaType }
    return payload
  }

  const handleSend = async (contact: (typeof contacts)[number]) => {
    if (sendingId || sentTo.has(contact.id)) return
    setSendingId(contact.id)
    try {
      const chat = await ChatService.createChat({ participantId: contact.id })
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
