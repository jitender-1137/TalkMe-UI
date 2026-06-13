"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Play, Pause, FileText, Download, Mic, X, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { useImageViewer, useVideoPlayer } from "@/components/providers"
import type { MediaAttachment } from "./types"

interface MessageMediaProps {
  media: MediaAttachment
  isSent: boolean
}

export function MessageMedia({ media, isSent }: MessageMediaProps) {
  const { showImage } = useImageViewer()
  const { playVideo } = useVideoPlayer()
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Sticker support (must check first as it uses type "image" or "sticker" from server)
  if (media.type === "sticker" || media.fileName?.includes("sticker")) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden max-w-[130px] md:max-w-[170px]"
      >
        <img
          src={media.url}
          alt="Shared sticker"
          className="w-full h-auto object-contain select-none pointer-events-none"
        />
      </motion.div>
    )
  }

  // Image with lightbox
  if (media.type === "image") {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => showImage(media.url)}
        className="relative rounded-lg overflow-hidden max-w-[280px] mb-2 cursor-pointer hover:opacity-90 transition-opacity"
      >
        <img
          src={media.url}
          alt="Shared image"
          className="w-full h-auto object-cover"
          style={{
            aspectRatio: media.width && media.height ? `${media.width}/${media.height}` : "4/3",
          }}
        />
      </motion.button>
    )
  }

  // Video with player
  if (media.type === "video") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative rounded-lg overflow-hidden max-w-[280px] mb-2 group cursor-pointer"
        onClick={() => playVideo(media.url, media.thumbnail || undefined)}
      >
        {media.thumbnail ? (
          <img
            src={media.thumbnail}
            alt="Video thumbnail"
            className="w-full h-auto object-cover"
            style={{ aspectRatio: "16/9" }}
          />
        ) : (
          <video
            src={media.url}
            className="w-full h-auto object-cover"
            style={{ aspectRatio: "16/9" }}
            preload="metadata"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Play className="h-6 w-6 text-foreground fill-current ml-0.5" />
          </div>
        </div>
        {media.duration && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 rounded text-xs text-white font-medium">
            {formatDuration(media.duration)}
          </span>
        )}
      </motion.div>
    )
  }

  // Audio with playback
  if (media.type === "audio") {
    const toggleAudio = () => {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause()
        } else {
          audioRef.current.play().catch(() => {
            // Audio play failed, likely no actual audio file
            console.log("[v0] Demo audio - no actual file to play")
          })
        }
        setIsPlaying(!isPlaying)
      }
    }

    const progress = media.duration ? (currentTime / media.duration) * 100 : 0

    return (
      <motion.div
        initial={{ opacity: 0, x: isSent ? 20 : -20 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg mb-2 min-w-[200px]",
          isSent ? "bg-primary-foreground/10" : "bg-muted"
        )}
      >
        <audio
          ref={audioRef}
          src={media.url}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
          onEnded={() => {
            setIsPlaying(false)
            setCurrentTime(0)
          }}
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={toggleAudio}
          className={cn(
            "h-10 w-10 rounded-full shrink-0",
            isSent
              ? "bg-primary-foreground/20 hover:bg-primary-foreground/30"
              : "bg-primary/10 hover:bg-primary/20"
          )}
        >
          {isPlaying ? (
            <Pause className={cn("h-5 w-5", isSent ? "text-primary-foreground" : "text-primary")} />
          ) : (
            <Play className={cn("h-5 w-5", isSent ? "text-primary-foreground" : "text-primary")} />
          )}
        </Button>
        <div className="flex-1 space-y-1">
          <div
            className={cn(
              "h-1 rounded-full overflow-hidden",
              isSent ? "bg-primary-foreground/30" : "bg-border"
            )}
          >
            <motion.div
              className={cn(
                "h-full rounded-full",
                isSent ? "bg-primary-foreground" : "bg-primary"
              )}
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
            />
          </div>
          <span
            className={cn(
              "text-xs",
              isSent ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            {isPlaying
              ? formatDuration(Math.floor(currentTime))
              : formatDuration(media.duration || 0)}
          </span>
        </div>
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
            isSent ? "bg-primary-foreground/20" : "bg-muted"
          )}
        >
          <Mic className={cn("h-4 w-4", isSent ? "text-primary-foreground" : "text-primary")} />
        </div>
      </motion.div>
    )
  }

  // Document with download
  if (media.type === "document") {
    const handleDownload = () => {
      const link = document.createElement("a")
      link.href = media.url
      link.download = media.fileName || "document"
      link.click()
    }

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg mb-2 min-w-[220px]",
          isSent ? "bg-primary-foreground/10" : "bg-muted"
        )}
      >
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
            isSent ? "bg-primary-foreground/20" : "bg-primary/10"
          )}
        >
          <FileText className={cn("h-5 w-5", isSent ? "text-primary-foreground" : "text-primary")} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium truncate",
              isSent ? "text-primary-foreground" : "text-foreground"
            )}
          >
            {media.fileName || "Document"}
          </p>
          {media.fileSize && (
            <p
              className={cn(
                "text-xs",
                isSent ? "text-primary-foreground/70" : "text-muted-foreground"
              )}
            >
              {media.fileSize}
            </p>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleDownload}
          className={cn(
            "h-8 w-8 shrink-0",
            isSent ? "hover:bg-primary-foreground/20" : "hover:bg-muted"
          )}
        >
          <Download
            className={cn("h-4 w-4", isSent ? "text-primary-foreground" : "text-foreground")}
          />
        </Button>
      </motion.div>
    )
  }
  
  return null
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}
