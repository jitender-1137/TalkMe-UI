"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BubbleShellProps {
  /** True for the current user's own (right-aligned) message. */
  isSent: boolean;
  variant?: "default" | "sticker";
  className?: string;
  children: ReactNode;
}

/**
 * The bubble container box (padding, radius, tail, background) — identical across
 * the main chat, lobby and matchmaking so every bubble looks the same. Callers
 * keep their own outer alignment/max-width wrapper and pass body + media as
 * children.
 */
export function BubbleShell({
  isSent,
  variant = "default",
  className,
  children,
}: BubbleShellProps) {
  return (
    <div
      className={cn(
        variant === "sticker"
          ? "p-0 bg-transparent shadow-none relative overflow-hidden rounded-2xl"
          : "px-2 py-1.5 rounded-xl shadow-sm relative",
        variant !== "sticker" &&
          (isSent
            ? "bg-primary text-primary-foreground rounded-br-sm shadow-primary/15"
            : "bg-muted text-card-foreground rounded-bl-sm"),
        className,
      )}
    >
      {children}
    </div>
  );
}

interface BubbleBodyProps {
  /** Message text. When empty (media/sticker-only) just the time row is shown. */
  content?: string | null;
  /** Pre-formatted time string (e.g. "21:39"). */
  time: string;
  /** Tailwind colour classes for the time + ticks block (matches the bubble tone). */
  timeClassName?: string;
  /** Optional status/ticks element (e.g. <MessageStatusIcon/>); omit for chats without ticks. */
  statusNode?: ReactNode;
  /** Reserve extra room on the last line for the inline time. Defaults to true when
   *  a statusNode (ticks) is present, since that's wider. */
  reserveWide?: boolean;
  /** Whether media/reply content is rendered ABOVE this body — adds the top gap. */
  hasMedia?: boolean;
  /** Alignment for the media-only (no text) time row. */
  align?: "start" | "end";
}

/**
 * Shared message-bubble body used by the main chat, the lobby chat and the
 * matchmaking (stranger) chat — so the WhatsApp-style compact text + inline
 * bottom-right time/ticks is defined in exactly one place. Callers own the bubble
 * shell (padding/radius/background) and any media/reply/system content above it.
 */
export function BubbleBody({
  content,
  time,
  timeClassName,
  statusNode,
  reserveWide,
  hasMedia,
  align = "end",
}: BubbleBodyProps) {
  const timeInner = (
    <>
      <span className="text-[10px]">{time}</span>
      {statusNode}
    </>
  );

  if (!content) {
    return (
      <div
        className={cn(
          "flex items-center gap-1 leading-none",
          hasMedia && "mt-0.5",
          align === "end" ? "justify-end" : "justify-start",
          timeClassName,
        )}
      >
        {timeInner}
      </div>
    );
  }

  const wide = reserveWide ?? !!statusNode;
  return (
    <div className="relative">
      <p
        className={cn(
          "text-[14.5px] leading-snug whitespace-pre-wrap wrap-break-word",
          hasMedia && "mt-1",
        )}
      >
        {content}
        {/* Invisible spacer reserves room on the LAST line so the inline
            time/ticks sit beside the text instead of on a new line. */}
        <span aria-hidden className={cn("inline-block align-bottom", wide ? "w-18" : "w-14.5")} />
      </p>
      <div
        className={cn(
          "absolute bottom-0 right-0 flex items-center gap-1 leading-none",
          timeClassName,
        )}
      >
        {timeInner}
      </div>
    </div>
  );
}
