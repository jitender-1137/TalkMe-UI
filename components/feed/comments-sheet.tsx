"use client"

import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { CommentsPanel } from "./comments-panel"

interface CommentsSheetProps {
  postId: string
  authorUsername?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Open a commenter's profile. */
  onUserClick?: (userId?: string | null) => void
}

/** Instagram-style "Comments" bottom sheet (mobile). */
export function CommentsSheet({
  postId,
  authorUsername,
  open,
  onOpenChange,
  onUserClick,
}: CommentsSheetProps) {
  const content = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // stopPropagation: this sheet is portaled but rendered inside the
            // post modal's React tree, so without it the click would bubble
            // (React synthetic events follow the component tree, not the DOM)
            // to the modal's backdrop and close BOTH. We only want to close the
            // sheet here.
            onClick={(e) => {
              e.stopPropagation()
              onOpenChange(false)
            }}
            className="fixed inset-0 z-[290] bg-black/50"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            // Clicks inside the sheet must not bubble out to the modal backdrop.
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-0 inset-x-0 z-[295] mx-auto w-full sm:max-w-[480px]
                       h-[72vh] bg-card rounded-t-2xl border-t border-border shadow-2xl flex flex-col"
          >
            {/* Handle + title */}
            <div className="shrink-0 pt-2 pb-3 border-b border-border/60">
              <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/40" />
              <h2 className="text-center font-semibold mt-2">Comments</h2>
            </div>

            <CommentsPanel
              postId={postId}
              authorUsername={authorUsername}
              active={open}
              onUserClick={onUserClick}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  if (typeof document === "undefined") return null
  return createPortal(content, document.body)
}
