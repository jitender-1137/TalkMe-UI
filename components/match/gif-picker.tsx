"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { buildGiphyUrl } from "@/lib/giphy"

interface GifPickerProps {
  onSelect: (gifUrl: string) => void
  onClose: () => void
}

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState("")
  const [gifs, setGifs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let active = true
    const fetchGifs = async () => {
      setIsLoading(true)
      try {
        const url = buildGiphyUrl(query, { limit: 24 })
        const res = await fetch(url)
        const json = await res.json()
        if (active) {
          const urls = json.data?.map((item: any) => item.images?.fixed_height?.url) || []
          setGifs(urls)
        }
      } catch (err) {
        console.error("Giphy API fetch failed:", err)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    const timer = setTimeout(fetchGifs, query.trim() ? 500 : 0)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query])

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      className="absolute bottom-20 left-4 right-4 md:left-auto md:right-4 z-[100] w-auto max-w-[340px] md:w-[340px] bg-card border border-border rounded-2xl shadow-2xl p-4 overflow-hidden flex flex-col h-[360px]"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground text-sm">Giphy GIFs</h3>
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground font-medium"
        >
          Close
        </button>
      </div>

      <div className="relative mb-3 shrink-0">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs..."
          className="pl-9 h-9 bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary text-sm"
        />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
            <span className="text-xs">Loading GIFs...</span>
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground py-12 text-xs">
            No GIFs found
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {gifs.map((url, i) => (
              <motion.div
                key={url + i}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(url)}
                className="cursor-pointer rounded-xl overflow-hidden h-24 bg-muted relative border border-white/5 hover:border-primary/50 transition-colors"
              >
                <img
                  src={url}
                  alt="GIF"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
