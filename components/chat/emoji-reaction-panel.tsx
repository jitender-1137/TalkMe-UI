'use client'

import { useState } from "react"
import { cn } from "@/lib/utils"

/** Categorized emoji set for message reactions (no external dependency). */
export const REACTION_CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    icon: "😀",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊",
      "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "😋", "😛", "😜", "🤪",
      "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏",
      "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕",
      "🥳", "🥺", "😎", "🤓", "🧐", "😕", "😟", "🙁", "😮", "😯", "😲", "😳",
      "🥵", "🥶", "😱", "😨", "😰", "😥", "😢", "😭", "😤", "😠", "😡", "🤬",
      "🤯", "😈", "👿", "💀", "🤡", "👻", "👽", "🤖", "😺", "😸", "😻", "🙀",
    ],
  },
  {
    label: "Gestures",
    icon: "👍",
    emojis: [
      "👍", "👎", "👊", "✊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🙏", "🤝",
      "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇",
      "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "💪", "🦾", "🖕", "✍️", "💅", "🤳",
    ],
  },
  {
    label: "Hearts",
    icon: "❤️",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤", "🤍", "💔", "❣️", "💕",
      "💞", "💓", "💗", "💖", "💘", "💝", "💟", "❤️‍🔥", "❤️‍🩹", "💯", "💢", "💥",
      "💫", "💦", "💨", "🔥", "⭐", "🌟", "✨", "⚡",
    ],
  },
  {
    label: "Animals",
    icon: "🐶",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮",
      "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦄", "🐝", "🦋", "🐢", "🐙",
      "🦀", "🐬", "🐳", "🐟", "🦖", "🌸", "🌹", "🌻", "🌴", "🌵", "🍀", "🍁",
    ],
  },
  {
    label: "Food",
    icon: "🍔",
    emojis: [
      "🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍒", "🍑",
      "🥭", "🍍", "🥥", "🥝", "🍅", "🌽", "🌶️", "🍔", "🍟", "🍕", "🌭", "🥪",
      "🌮", "🌯", "🍣", "🍜", "🍩", "🍪", "🎂", "🍰", "🍫", "🍬", "🍿", "☕",
      "🍺", "🍻", "🥂", "🍷", "🥤", "🧋", "🍦", "🎉",
    ],
  },
  {
    label: "Activities",
    icon: "⚽",
    emojis: [
      "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸", "🥅", "🏒",
      "🏏", "🥊", "🥋", "⛳", "🎯", "🎮", "🎲", "🎸", "🎺", "🎻", "🥁", "🎤",
      "🎧", "🏆", "🥇", "🥈", "🥉", "🎬", "🎨", "🚀", "✈️", "🚗", "🎁", "🎈",
    ],
  },
  {
    label: "Symbols",
    icon: "✅",
    emojis: [
      "✅", "❌", "❓", "❗", "‼️", "⁉️", "💤", "🆗", "🆕", "🔝", "🔞", "♻️",
      "✔️", "☑️", "➕", "➖", "✖️", "➗", "💲", "💰", "🔔", "🔕", "🎵", "🎶",
      "👀", "🗯️", "💬", "💭", "🕐", "⏰", "🌈", "☀️", "🌙", "⛄", "🎃", "💩",
    ],
  },
]

interface EmojiReactionPanelProps {
  onSelect: (emoji: string) => void
  className?: string
}

/** Full emoji picker used for the "+" / "more reactions" affordance. */
export function EmojiReactionPanel({ onSelect, className }: EmojiReactionPanelProps) {
  const [cat, setCat] = useState(0)

  return (
    <div
      className={cn(
        "w-[19rem] max-w-[90vw] bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden",
        className,
      )}
    >
      {/* Category tabs */}
      <div className="flex items-center gap-1 px-2 pt-2 pb-1.5 border-b border-border/60 overflow-x-auto [&::-webkit-scrollbar]:hidden">
        {REACTION_CATEGORIES.map((c, i) => (
          <button
            key={c.label}
            type="button"
            onClick={() => setCat(i)}
            title={c.label}
            className={cn(
              "h-8 w-8 shrink-0 rounded-lg text-lg flex items-center justify-center transition-colors cursor-pointer",
              i === cat ? "bg-primary/15 ring-1 ring-primary/30" : "hover:bg-muted",
            )}
          >
            {c.icon}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="p-2 h-56 overflow-y-auto overscroll-contain">
        <div className="grid grid-cols-8 gap-0.5">
          {REACTION_CATEGORIES[cat].emojis.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onSelect(e)}
              className="h-8 w-8 rounded-lg text-xl flex items-center justify-center hover:bg-muted active:scale-90 transition-transform cursor-pointer"
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
