"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Play, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Instagram-style inline video player.
 *  - Autoplays muted + loops when scrolled into view; pauses when out of view.
 *  - Tap the video to play/pause (a play glyph shows while paused).
 *  - Mute/unmute button bottom-right (starts muted so autoplay is allowed).
 * Mute state is shared across instances via a module-global so unmuting one
 * video keeps the next one unmuted too — same as the IG feed.
 */

let sharedMuted = true
const muteListeners = new Set<(m: boolean) => void>()
function setSharedMuted(m: boolean) {
  sharedMuted = m
  muteListeners.forEach((fn) => fn(m))
}

export function InstagramVideo({
  src,
  className,
  autoPlayInView = true,
}: {
  src: string
  className?: string
  /** Autoplay (muted) when ≥60% visible. Disable for always-on contexts. */
  autoPlayInView?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(sharedMuted)
  const [playing, setPlaying] = useState(false)
  const manuallyPaused = useRef(false)

  // Keep this instance's mute in sync with the shared (feed-wide) state.
  useEffect(() => {
    const fn = (m: boolean) => setMuted(m)
    muteListeners.add(fn)
    return () => {
      muteListeners.delete(fn)
    }
  }, [])

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted
  }, [muted])

  // Play when in view, pause when out (unless the user paused it by hand).
  useEffect(() => {
    if (!autoPlayInView) return
    const el = videoRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          if (!manuallyPaused.current) el.play().catch(() => {})
        } else {
          el.pause()
        }
      },
      { threshold: [0, 0.6, 1] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [autoPlayInView])

  const togglePlay = useCallback(() => {
    const el = videoRef.current
    if (!el) return
    if (el.paused) {
      manuallyPaused.current = false
      el.play().catch(() => {})
    } else {
      manuallyPaused.current = true
      el.pause()
    }
  }, [])

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setSharedMuted(!sharedMuted)
  }, [])

  return (
    <div className={cn("relative overflow-hidden bg-black", className)}>
      <video
        ref={videoRef}
        src={src}
        className="h-full w-full object-contain"
        loop
        muted={muted}
        playsInline
        preload="metadata"
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={(e) => {
          ;(e.target as HTMLVideoElement).style.display = "none"
        }}
      />

      {/* Pause glyph overlay */}
      {!playing && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play video"
          className="tappable absolute inset-0 grid place-items-center"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-black/45 backdrop-blur-sm">
            <Play className="h-6 w-6 fill-white text-white translate-x-0.5" />
          </span>
        </button>
      )}

      {/* Mute toggle */}
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        className="tappable absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  )
}
