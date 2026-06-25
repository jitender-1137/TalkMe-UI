"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export type NewsTab = "feed" | "following" | "me"

const TABS: { key: NewsTab; label: string }[] = [
  { key: "feed", label: "Feed" },
  { key: "following", label: "Following" },
  { key: "me", label: "Me" },
]

interface NewsTabsProps {
  active: NewsTab
  onChange: (tab: NewsTab) => void
}

/** Feed / Following / Me tabs with a short underline centered under the active label. */
export default function NewsTabs({ active, onChange }: NewsTabsProps) {
  return (
    <div className="sticky top-0 z-10 flex items-center border-b border-border bg-background/85 backdrop-blur-xl">
      {TABS.map((tab) => {
        const isActive = tab.key === active
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className="flex flex-1 items-center justify-center py-2.5"
          >
            <span
              className={cn(
                "relative text-[13px] font-semibold transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              {tab.label}
              {isActive && (
                <motion.span
                  layoutId="news-tab-underline"
                  className="absolute -bottom-2 left-0 right-0 h-[2px] rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                />
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
