"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StrangerMessage } from "./types"

interface SafeModeMediaProps {
  message: StrangerMessage
  onReveal: () => void
  onHide: () => void
}

export function SafeModeMedia({ message, onReveal, onHide }: SafeModeMediaProps) {
  const media = message.media
  
  if (!media) return null
  
  const isBlurred = media.isBlurred

  return (
    <div className="relative rounded-lg overflow-hidden bg-muted">
      <motion.div
        className="relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Media preview */}
        <div className="relative aspect-video min-w-[200px] max-w-[280px]">
          {media.type === "image" ? (
            <img
              src={media.thumbnail || media.url}
              alt="Shared media"
              className={cn(
                "w-full h-full object-cover transition-all duration-500",
                isBlurred && "blur-xl scale-110"
              )}
            />
          ) : (
            <video
              src={media.url}
              className={cn(
                "w-full h-full object-cover transition-all duration-500",
                isBlurred && "blur-xl scale-110"
              )}
              muted
              playsInline
            />
          )}
          
          {/* Blur overlay with reveal button */}
          <AnimatePresence>
            {isBlurred && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col items-center gap-3 p-4"
                >
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="text-sm font-medium">Media Hidden</span>
                  </div>
                  
                  <p className="text-xs text-center text-muted-foreground max-w-[180px]">
                    This content is hidden for your safety until you choose to view it
                  </p>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onReveal}
                    className="gap-2 mt-2 border-amber-400/50 text-amber-400 hover:bg-amber-400/10 hover:text-amber-300"
                  >
                    <Eye className="h-4 w-4" />
                    Reveal Content
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Re-blur button when revealed */}
          {!isBlurred && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute bottom-2 right-2"
            >
              <Button
                size="sm"
                variant="ghost"
                onClick={onHide}
                className="h-7 px-2 text-xs bg-black/50 hover:bg-black/70 text-white"
              >
                <EyeOff className="h-3 w-3 mr-1" />
                Hide
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
