"use client"

import { ShieldAlert, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Shown to the SENDER when a message they tried to send contains 18+ content and
 * consent hasn't been granted yet. They decide whether to ask the other person
 * for consent. Choosing "Not now" does nothing — the next 18+ message prompts
 * again. After 3 consecutive declines requests are no longer possible and this
 * dialog isn't shown (a toast explains instead).
 */
export function ConsentSendDialog({
  open,
  contactName,
  declineCount,
  sending,
  onSend,
  onCancel,
}: {
  open: boolean
  contactName: string
  declineCount: number
  sending?: boolean
  onSend: () => void
  onCancel: () => void
}) {
  if (!open) return null
  const attemptsLeft = Math.max(0, 3 - declineCount)
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
          </div>
          <h3 className="text-base font-semibold text-foreground">18+ content needs consent</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Your message contains 18+ content. Send a request asking{" "}
          <span className="font-semibold text-foreground">{contactName}</span> to allow 18+ content in this
          conversation? They can accept or decline.
        </p>
        {declineCount > 0 && (
          <p className="mt-2 text-xs text-amber-500">
            Previously declined {declineCount} of 3 times — {attemptsLeft}{" "}
            {attemptsLeft === 1 ? "try" : "tries"} left.
          </p>
        )}
        <div className="mt-5 flex gap-2 justify-end">
          <Button variant="ghost" onClick={onCancel} disabled={sending}>
            Not now
          </Button>
          <Button onClick={onSend} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send request"}
          </Button>
        </div>
      </div>
    </div>
  )
}
