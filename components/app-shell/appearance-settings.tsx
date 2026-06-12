"use client"

import { useState, useEffect } from "react"
import { Palette, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"

const THEME_COLORS = [
  { name: "Blue", value: "#3b82f6", css: "oklch(0.58 0.22 250)" },
  { name: "Purple", value: "#8b5cf6", css: "oklch(0.58 0.22 270)" },
  { name: "Pink", value: "#ec4899", css: "oklch(0.58 0.22 320)" },
  { name: "Red", value: "#ef4444", css: "oklch(0.58 0.22 25)" },
  { name: "Orange", value: "#f97316", css: "oklch(0.58 0.22 40)" },
  { name: "Amber", value: "#fbbf24", css: "oklch(0.75 0.15 70)" },
  { name: "Green", value: "#22c55e", css: "oklch(0.6 0.15 150)" },
  { name: "Teal", value: "#14b8a6", css: "oklch(0.6 0.15 180)" },
]

const CHAT_BG_OPTIONS = [
  { name: "Default", value: "bg-background" },
  { name: "Light Gray", value: "bg-slate-50 dark:bg-slate-950" },
  { name: "Soft Blue", value: "bg-blue-50 dark:bg-blue-950" },
  { name: "Soft Green", value: "bg-green-50 dark:bg-green-950" },
  { name: "Soft Purple", value: "bg-purple-50 dark:bg-purple-950" },
]

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme()
  const [selectedColor, setSelectedColor] = useState(THEME_COLORS[0])
  const [selectedChatBg, setSelectedChatBg] = useState(CHAT_BG_OPTIONS[0])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Load saved preferences from localStorage
    const savedColor = localStorage.getItem("theme-color")
    const savedChatBg = localStorage.getItem("chat-bg")
    
    if (savedColor) {
      const color = THEME_COLORS.find(c => c.value === savedColor)
      if (color) setSelectedColor(color)
    }
    
    if (savedChatBg) {
      const bg = CHAT_BG_OPTIONS.find(b => b.value === savedChatBg)
      if (bg) setSelectedChatBg(bg)
    }
  }, [])

  const handleColorChange = (color: typeof THEME_COLORS[0]) => {
    setSelectedColor(color)
    localStorage.setItem("theme-color", color.value)
    
    // Update CSS variable
    document.documentElement.style.setProperty("--primary", color.css)
    document.documentElement.style.setProperty("--accent", color.css)
    document.documentElement.style.setProperty("--ring", color.css)
  }

  const handleChatBgChange = (bg: typeof CHAT_BG_OPTIONS[0]) => {
    setSelectedChatBg(bg)
    localStorage.setItem("chat-bg", bg.value)
    
    // Apply to chat area
    const chatArea = document.querySelector("[data-chat-area]")
    if (chatArea) {
      chatArea.className = cn("flex flex-col h-[100dvh]", bg.value)
    }
  }

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
  }

  if (!mounted) return null

  return (
    <div className="space-y-6">
      {/* Theme Section */}
      <div className="space-y-3 p-4 rounded-lg border border-border bg-card">
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          <Sun className="h-4 w-4" />
          Theme
        </h4>
        <div className="flex gap-3">
          <Button
            variant={theme === "light" ? "default" : "outline"}
            size="sm"
            onClick={() => handleThemeChange("light")}
            className="flex-1 gap-2"
          >
            <Sun className="h-4 w-4" />
            Light
          </Button>
          <Button
            variant={theme === "dark" ? "default" : "outline"}
            size="sm"
            onClick={() => handleThemeChange("dark")}
            className="flex-1 gap-2"
          >
            <Moon className="h-4 w-4" />
            Dark
          </Button>
          <Button
            variant={theme === "system" ? "default" : "outline"}
            size="sm"
            onClick={() => handleThemeChange("system")}
            className="flex-1"
          >
            Auto
          </Button>
        </div>
      </div>

      {/* Primary Color Section */}
      <div className="space-y-3 p-4 rounded-lg border border-border bg-card">
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Primary Color
        </h4>
        <p className="text-xs text-muted-foreground">
          Customize the primary color used throughout the application
        </p>
        <div className="grid grid-cols-4 gap-2">
          {THEME_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => handleColorChange(color)}
              className={cn(
                "h-12 rounded-lg border-2 transition-all duration-200 hover:scale-105",
                selectedColor.value === color.value
                  ? "border-foreground scale-105"
                  : "border-border"
              )}
              style={{ backgroundColor: color.value }}
              title={color.name}
            >
              {selectedColor.value === color.value && (
                <span className="text-white text-lg">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Background Section */}
      <div className="space-y-3 p-4 rounded-lg border border-border bg-card">
        <h4 className="font-semibold text-foreground">Chat Background</h4>
        <p className="text-xs text-muted-foreground">
          Choose the background color for chat conversations
        </p>
        <div className="grid grid-cols-2 gap-3">
          {CHAT_BG_OPTIONS.map((bg) => (
            <button
              key={bg.value}
              onClick={() => handleChatBgChange(bg)}
              className={cn(
                "p-3 rounded-lg border-2 transition-all text-sm font-medium text-center",
                selectedChatBg.value === bg.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className={cn("h-8 rounded mb-2", bg.value)} />
              {bg.name}
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
