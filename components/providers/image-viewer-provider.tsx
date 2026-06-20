'use client'

import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion'
import { X, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react'
import { downloadFile } from '@/lib/download'
import { Button } from '@/components/ui/button'

interface ImageViewerContextType {
  showImage: (url: string) => void
  closeImage: () => void
}

const ImageViewerContext = createContext<ImageViewerContextType | null>(null)

export function useImageViewer() {
  const context = useContext(ImageViewerContext)
  if (!context) {
    throw new Error('useImageViewer must be used within an ImageViewerProvider')
  }
  return context
}

export function ImageViewerProvider({ children }: { children: React.ReactNode }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  // True during an active 2-finger pinch — disables framer drag so panning
  // doesn't fight the zoom gesture.
  const [isPinching, setIsPinching] = useState(false)
  
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Pinch-to-zoom (touch) state. scaleRef avoids stale closures inside the
  // native touch listeners; the pinch refs hold the gesture's starting values.
  const scaleRef = useRef(1)
  const isPinchingRef = useRef(false)
  const pinchStartDistRef = useRef(0)
  const pinchStartScaleRef = useRef(1)

  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  // Reset zoom on image change or close
  useEffect(() => {
    setScale(1)
    x.set(0)
    y.set(0)
  }, [imageUrl, x, y])

  // Pinch-to-zoom on touch devices. Attached natively (not via React props) so
  // we can preventDefault on touchmove and block the browser's page pinch-zoom.
  useEffect(() => {
    const el = containerRef.current
    if (!el || !imageUrl) return

    const dist = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.hypot(dx, dy)
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        isPinchingRef.current = true
        setIsPinching(true)
        pinchStartDistRef.current = dist(e.touches)
        pinchStartScaleRef.current = scaleRef.current
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!isPinchingRef.current || e.touches.length !== 2) return
      e.preventDefault() // stop the browser zooming the whole page
      if (pinchStartDistRef.current <= 0) return
      const ratio = dist(e.touches) / pinchStartDistRef.current
      const next = Math.min(Math.max(pinchStartScaleRef.current * ratio, 1), 5)
      setScale(next)
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isPinchingRef.current = false
        setIsPinching(false)
        // Snap pan back to center when fully zoomed out.
        if (scaleRef.current <= 1) {
          animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 })
          animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 })
        }
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [imageUrl, x, y])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setImageUrl(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const showImage = (url: string) => {
    setImageUrl(url)
  }

  const closeImage = () => {
    setImageUrl(null)
  }

  const handleZoomIn = () => {
    setScale(s => Math.min(s + 0.5, 5))
  }

  const handleZoomOut = () => {
    setScale(s => {
      const next = Math.max(s - 0.5, 1)
      if (next === 1) {
        animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 })
        animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 })
      }
      return next
    })
  }

  const handleReset = () => {
    setScale(1)
    animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 })
    animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 })
  }

  const handleWheel = (e: React.WheelEvent) => {
    const delta = -e.deltaY
    setScale(s => {
      const factor = delta > 0 ? 0.25 : -0.25
      const next = Math.min(Math.max(s + factor, 1), 5)
      if (next === 1) {
        animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 })
        animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 })
      }
      return next
    })
  }

  const handleDoubleClick = () => {
    if (scale > 1) {
      handleReset()
    } else {
      setScale(2.5)
    }
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!imageUrl) return
    void downloadFile(imageUrl, 'image')
  }

  return (
    <ImageViewerContext.Provider value={{ showImage, closeImage }}>
      {children}
      <AnimatePresence>
        {imageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md select-none"
            onClick={closeImage}
          >
            {/* Top Toolbar / Control Bar */}
            <div 
              className="absolute top-4 left-0 right-0 z-10 flex items-center justify-between px-6 pointer-events-none"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 pointer-events-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10 gap-2 h-9"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">Download</span>
                </Button>
              </div>

              {/* Center WhatsApp-style floating control panel */}
              <div className="flex items-center gap-2 bg-neutral-900/80 backdrop-blur-md border border-white/10 rounded-full py-1 px-3 pointer-events-auto shadow-lg">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 h-8 w-8 rounded-full disabled:opacity-30"
                  onClick={handleZoomOut}
                  disabled={scale <= 1}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-white text-xs font-mono min-w-[3rem] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 h-8 w-8 rounded-full disabled:opacity-30"
                  onClick={handleZoomIn}
                  disabled={scale >= 5}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <div className="w-px h-4 bg-white/20 mx-1" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 h-8 w-8 rounded-full"
                  onClick={handleReset}
                  title="Reset zoom"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 pointer-events-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 h-9 w-9 rounded-full"
                  onClick={closeImage}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Viewport for Drag & Scroll */}
            <div
              ref={containerRef}
              className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none"
              onWheel={handleWheel}
              onClick={closeImage}
            >
              <motion.div
                drag={scale > 1 && !isPinching}
                dragMomentum={false}
                dragElastic={0.1}
                style={{
                  x,
                  y,
                  scale,
                  cursor: scale > 1 ? 'grab' : 'default',
                }}
                whileTap={{ cursor: scale > 1 ? 'grabbing' : 'default' }}
                onDoubleClick={handleDoubleClick}
                onClick={(e) => e.stopPropagation()}
                className="relative max-h-[85vh] max-w-[85vw] flex items-center justify-center"
              >
                <img
                  src={imageUrl}
                  alt="Zoomable user image"
                  className="max-h-[85vh] max-w-[85vw] object-contain pointer-events-none rounded-xs shadow-2xl border border-white/5"
                  draggable={false}
                />
              </motion.div>
            </div>

            {/* Instructions Overlay */}
            <div className="absolute bottom-4 text-center pointer-events-none text-white/40 text-xs hidden sm:block">
              Scroll to zoom • Double-click to toggle zoom • Drag to pan when zoomed
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ImageViewerContext.Provider>
  )
}
