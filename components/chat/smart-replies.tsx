"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles } from "lucide-react"
import { instantSuggestions, rankSuggestions } from "@/lib/smart-reply/engine"

interface SmartRepliesProps {
  /** Text of the last incoming message (null/empty → greeting seeds). */
  lastIncoming: string | null
  /** Fill the composer with the picked suggestion (user can still edit). */
  onPick: (text: string) => void
}

/**
 * Suggestion chips shown above the composer. Renders instant heuristic chips
 * immediately, then swaps in semantically-ranked ones once the in-browser model
 * resolves. Fully client-side.
 */
export function SmartReplies({ lastIncoming, onPick }: SmartRepliesProps) {
  const [chips, setChips] = useState<string[]>([])
  // Bumped on every input change so a slow rank() can't overwrite newer chips.
  const reqId = useRef(0)

  useEffect(() => {
    const id = ++reqId.current
    const key = (lastIncoming || "").trim()

    // 1) Instant heuristics — no delay.
    setChips(instantSuggestions(key))

    // 2) Debounced semantic refinement (skip for the empty/greeting case).
    if (!key) return
    const t = setTimeout(() => {
      rankSuggestions(key, 8)
        .then((refined) => {
          if (id === reqId.current && refined.length) setChips(refined)
        })
        .catch(() => {
          /* model offline/unsupported — keep the instant chips */
        })
    }, 150)
    return () => clearTimeout(t)
  }, [lastIncoming])

  if (chips.length === 0) return null

  return (
    <div
      className="flex items-center gap-1.5 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary/60" aria-hidden />
      <AnimatePresence mode="popLayout" initial={false}>
        {chips.map((text) => (
          <motion.button
            key={text}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.12 }}
            onClick={() => onPick(text)}
            className="shrink-0 whitespace-nowrap rounded-full border border-border bg-muted/60 px-3.5 py-1.5
                       text-[13px] font-medium text-foreground hover:bg-muted hover:border-primary/40
                       active:scale-95 transition-all cursor-pointer"
          >
            {text}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}
