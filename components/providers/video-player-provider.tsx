'use client'

import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, Pause, Volume2, VolumeX, Maximize, Minimize, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

interface VideoPlayerContextType {
  playVideo: (url: string, posterUrl?: string) => void
  stopVideo: () => void
}

const VideoPlayerContext = createContext<VideoPlayerContextType | null>(null)

export function useVideoPlayer() {
  const context = useContext(VideoPlayerContext)
  if (!context) {
    throw new Error('useVideoPlayer must be used within a VideoPlayerProvider')
  }
  return context
}

function formatDuration(seconds: number): string {
  if (isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function VideoPlayerProvider({ children }: { children: React.ReactNode }) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [posterUrl, setPosterUrl] = useState<string | undefined>(undefined)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)

  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Reset states when video changes
  useEffect(() => {
    if (videoUrl) {
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
    }
  }, [videoUrl])

  // Synchronize volume level to video node
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume
    }
  }, [volume])

  // Automatically start playing when video metadata is loaded
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      videoRef.current.play().then(() => {
        setIsPlaying(true)
      }).catch(() => {
        // Autoplay blocked or failed, keep isPlaying false
        setIsPlaying(false)
      })
    }
  }

  const playVideo = (url: string, poster?: string) => {
    setVideoUrl(url)
    setPosterUrl(poster)
  }

  const stopVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause()
    }
    setVideoUrl(null)
    setPosterUrl(undefined)
    setIsPlaying(false)
  }

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
        setIsPlaying(false)
      } else {
        videoRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMute = !isMuted
      setIsMuted(nextMute)
      videoRef.current.muted = nextMute
    }
  }

  const handleSeek = ([value]: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value
      setCurrentTime(value)
    }
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err)
      })
    } else {
      document.exitFullscreen()
    }
  }

  // Handle fullscreen changes via listeners to keep state synced
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoUrl) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          togglePlay()
          resetControlsTimer()
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 5, 0)
            resetControlsTimer()
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 5, duration)
            resetControlsTimer()
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume((v) => {
            const next = Math.min(v + 0.1, 1)
            if (videoRef.current) {
              videoRef.current.volume = next
              videoRef.current.muted = next === 0
            }
            setIsMuted(next === 0)
            return next
          })
          resetControlsTimer()
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume((v) => {
            const next = Math.max(v - 0.1, 0)
            if (videoRef.current) {
              videoRef.current.volume = next
              videoRef.current.muted = next === 0
            }
            setIsMuted(next === 0)
            return next
          })
          resetControlsTimer()
          break
        case 'Escape':
          e.preventDefault()
          stopVideo()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [videoUrl, isPlaying, duration])

  // Controls Visibility Timer
  const resetControlsTimer = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)
  }

  useEffect(() => {
    resetControlsTimer()
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    }
  }, [isPlaying])

  const handleMouseMove = () => {
    resetControlsTimer()
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!videoUrl) return
    const link = document.createElement('a')
    link.href = videoUrl
    link.download = 'video.mp4'
    link.click()
  }

  return (
    <VideoPlayerContext.Provider value={{ playVideo, stopVideo }}>
      {children}
      <AnimatePresence>
        {videoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md select-none"
            onClick={stopVideo}
            onMouseMove={handleMouseMove}
          >
            {/* Main Player Screen */}
            <div 
              ref={containerRef}
              className="relative w-full h-full flex items-center justify-center overflow-hidden"
              onClick={togglePlay}
            >
              <video
                ref={videoRef}
                src={videoUrl}
                poster={posterUrl}
                onClick={(e) => e.stopPropagation()}
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                muted={isMuted}
                className="max-h-full max-w-full object-contain"
                playsInline
              />

              {/* Controls UI overlay */}
              <AnimatePresence>
                {showControls && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/60 flex flex-col justify-between p-4 pointer-events-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Top toolbar */}
                    <div className="flex justify-between items-center w-full pointer-events-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/10 gap-2 h-9"
                        onClick={handleDownload}
                      >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline text-xs">Download</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/10 h-9 w-9 rounded-full"
                        onClick={stopVideo}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>

                    {/* Bottom controls panel */}
                    <div className="flex flex-col gap-3 w-full max-w-4xl mx-auto pointer-events-auto bg-neutral-950/80 backdrop-blur-xs border border-white/5 p-4 rounded-xl shadow-2xl mt-auto">
                      {/* Progress bar */}
                      <div className="flex items-center gap-3 w-full">
                        <span className="text-white text-xs font-mono min-w-[2.5rem]">
                          {formatDuration(currentTime)}
                        </span>
                        <div className="flex-1">
                          <Slider
                            value={[currentTime]}
                            max={duration || 100}
                            step={0.1}
                            onValueChange={handleSeek}
                            className="cursor-pointer py-1"
                          />
                        </div>
                        <span className="text-white text-xs font-mono min-w-[2.5rem]">
                          {formatDuration(duration)}
                        </span>
                      </div>

                      {/* Control buttons bar */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {/* Play/Pause */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/10 h-10 w-10 rounded-full"
                            onClick={togglePlay}
                          >
                            {isPlaying ? <Pause className="h-5.5 w-5.5 fill-white" /> : <Play className="h-5.5 w-5.5 fill-white ml-0.5" />}
                          </Button>

                          <div className="w-px h-6 bg-white/10 mx-1" />

                          {/* Mute & Volume Slider */}
                          <div className="flex items-center gap-1.5 group/volume">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-white hover:bg-white/10 h-10 w-10 rounded-full"
                              onClick={toggleMute}
                            >
                              {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                            </Button>
                            <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-300 flex items-center">
                              <Slider
                                value={[isMuted ? 0 : volume * 100]}
                                max={100}
                                step={1}
                                onValueChange={([val]) => {
                                  const nextVol = val / 100
                                  setVolume(nextVol)
                                  setIsMuted(nextVol === 0)
                                  if (videoRef.current) {
                                    videoRef.current.volume = nextVol
                                    videoRef.current.muted = nextVol === 0
                                  }
                                }}
                                className="w-16 cursor-pointer py-1"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Fullscreen */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/10 h-10 w-10 rounded-full"
                          onClick={toggleFullscreen}
                        >
                          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </VideoPlayerContext.Provider>
  )
}
