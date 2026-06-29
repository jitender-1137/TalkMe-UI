"use client"

import { ShieldAlert, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * In-chat prompt shown to the receiver when the other participant requests consent
 * to exchange mature (explicit) content. Accepting releases any held messages and
 * lets both sides exchange such content freely. Dismissing leaves a persistent
 * "review request" entry point in the chat (handled by the parent).
 */
export function ConsentRequestDialog({
  open,
  requesterName,
  accepting,
  rejecting,
  onAccept,
  onReject,
  onDismiss,
}: {
  open: boolean
  requesterName: string
  accepting?: boolean
  rejecting?: boolean
  onAccept: () => void
  onReject: () => void
  onDismiss: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" onClick={onDismiss}>
      <div
        className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
          </div>
          <h3 className="text-base font-semibold text-foreground">18+ Content Permission Request</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{requesterName}</span> wants to exchange
          18+ content with you. If you approve, you both can send 18+ content in this conversation.
        </p>
        <div className="mt-5 flex gap-2 justify-end">
          <Button variant="ghost" onClick={onDismiss} disabled={accepting || rejecting}>
            Later
          </Button>
          <Button
            variant="ghost"
            onClick={onReject}
            disabled={accepting || rejecting}
            className="text-destructive hover:text-destructive"
          >
            {rejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Decline"}
          </Button>
          <Button onClick={onAccept} disabled={accepting || rejecting}>
            {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept"}
          </Button>
        </div>
      </div>
    </div>
  )
}
