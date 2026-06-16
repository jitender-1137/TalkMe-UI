'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, RotateCcw, Send, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CameraModalProps {
  isOpen: boolean
  onClose: () => void
  onCapture: (file: File) => void
}

export function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Track stream references to ensure cleanup is guaranteed
  useEffect(() => {
    streamRef.current = stream
  }, [stream])

  useEffect(() => {
    if (isOpen && !capturedFile) {
      navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: false 
      })
      .then((mediaStream) => {
        setStream(mediaStream)
        setError(null)
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      })
      .catch((err) => {
        console.error("Camera access error:", err)
        setError("Could not access camera. Please check permissions or ensure no other app is using it.")
      })
    }

    return () => {
      // Clean up stream tracks on unmount or close
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [isOpen, capturedFile, facingMode])

  const toggleFacingMode = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  const handleCapture = () => {
    if (!videoRef.current) return

    const video = videoRef.current
    const canvas = document.createElement('canvas')
    const width = video.videoWidth || 640
    const height = video.videoHeight || 480
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (ctx) {
      // Mirror picture to match mirrored preview only if using front camera
      if (facingMode === 'user') {
        ctx.translate(width, 0)
        ctx.scale(-1, 1)
      }
      ctx.drawImage(video, 0, 0, width, height)
      ctx.setTransform(1, 0, 0, 1, 0, 0) // Reset transform
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' })
          setCapturedFile(file)
          setPreviewUrl(URL.createObjectURL(blob))
          
          // Stop stream tracks
          if (stream) {
            stream.getTracks().forEach(track => track.stop())
            setStream(null)
          }
        }
      }, 'image/jpeg', 0.9)
    }
  }

  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setCapturedFile(null)
    setPreviewUrl(null)
  }

  const handleSend = () => {
    if (capturedFile) {
      onCapture(capturedFile)
      handleClose()
    }
  }

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setStream(null)
    setCapturedFile(null)
    setPreviewUrl(null)
    setError(null)
    setFacingMode('user')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] bg-black flex items-center justify-center">
          {/* Modal Container - Full screen */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-neutral-950 z-10"
          >
            {/* Viewport content (Fullscreen background) */}
            <div className="absolute inset-0 w-full h-full bg-neutral-950 flex items-center justify-center overflow-hidden">
              {error ? (
                <div className="flex flex-col items-center gap-2 p-6 text-center text-red-400 z-30">
                  <AlertCircle className="h-10 w-10 shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              ) : previewUrl ? (
                /* Static Captured Photo Preview */
                <img
                  src={previewUrl}
                  alt="Captured review"
                  className="w-full h-full object-cover"
                />
              ) : (
                /* Live Video Feed */
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
              )}
            </div>

            {/* Floating Header Overlay */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent z-20">
              <h3 className="text-sm font-semibold text-white drop-shadow-md">
                {previewUrl ? 'Preview Captured Photo' : 'Take Photo'}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-10 w-10 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Floating Controls panel Overlay at Bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-center min-h-[7.5rem] z-20">
              {error ? (
                <Button onClick={handleClose} variant="secondary" className="z-30">
                  Close Camera
                </Button>
              ) : previewUrl ? (
                /* Review Photo Mode Controls */
                <div className="flex gap-4 w-full max-w-md justify-between px-4 z-30">
                  <Button
                    onClick={handleRetake}
                    variant="outline"
                    className="bg-black/40 border-white/20 text-white hover:bg-white/10 hover:text-white gap-2 backdrop-blur-sm shadow-lg"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Retake
                  </Button>
                  <Button
                    onClick={handleSend}
                    className="bg-[#00a884] hover:bg-[#008f72] text-white gap-2 font-medium px-6 shadow-lg"
                  >
                    <Send className="h-4 w-4 fill-white" />
                    Send Photo
                  </Button>
                </div>
              ) : (
                /* Live Capture Mode Controls */
                <div className="flex items-center justify-center gap-8 w-full max-w-xs z-30">
                  <div className="w-10 h-10" /> {/* Spacer to balance layout */}
                  <button
                    onClick={handleCapture}
                    className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all group shadow-lg"
                    title="Capture Photo"
                  >
                    <div className="w-11 h-11 bg-white rounded-full group-hover:bg-neutral-200 transition-colors" />
                  </button>
                  <Button
                    onClick={toggleFacingMode}
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    title="Switch Camera"
                  >
                    <RefreshCw className="h-6 w-6" />
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
