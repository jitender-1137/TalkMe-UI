'use client'

import React, { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { 
  PhoneOff, 
  Maximize2, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ChatContact } from "./types"

interface MinimizedCallWidgetProps {
  contact: ChatContact
  callType: "audio" | "video"
  status: "ringing" | "connecting" | "connected" | "ended"
  duration: number
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  isMuted: boolean
  setIsMuted: (muted: boolean) => void
  isVideoOn: boolean
  setIsVideoOn: (videoOn: boolean) => void
  onMaximize: () => void
  onHangup: () => void
}

export function MinimizedCallWidget({
  contact,
  callType,
  status,
  duration,
  localStream,
  remoteStream,
  isMuted,
  setIsMuted,
  isVideoOn,
  setIsVideoOn,
  onMaximize,
  onHangup,
}: MinimizedCallWidgetProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const [hovered, setHovered] = useState(false)

  // Bind local webcam feed to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream, isVideoOn])

  // Bind remote peer webcam feed to remote video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // Always play the remote audio via a dedicated element (the remote <video>
  // only exists in video mode), so the peer's voice keeps playing when the call
  // is minimized — including voice calls and video-off.
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream
      remoteAudioRef.current.play().catch(() => {})
    }
  }, [remoteStream])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getStatusText = () => {
    switch (status) {
      case "ringing":
        return "Ringing..."
      case "connecting":
        return "Connecting..."
      case "connected":
        return formatDuration(duration)
      case "ended":
        return "Ended"
    }
  }

  const isVideoMode = callType === "video" && isVideoOn

  if (isVideoMode) {
    // VIDEO PIP WIDGET
    return (
      <motion.div
        drag
        dragElastic={0.1}
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="fixed bottom-24 right-4 z-[120] w-48 h-64 bg-[#121b22] border border-white/10 rounded-2xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing select-none"
      >
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
        {/* Remote Video Stream */}
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover pointer-events-none"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#121b22] gap-2 p-3">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center border border-white/5">
              {contact.avatar ? (
                <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-white">
                  {contact.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-white truncate max-w-full">{contact.name}</span>
            <span className="text-[10px] text-neutral-400">{getStatusText()}</span>
          </div>
        )}

        {/* Local Stream Overlay (Tiny picture-in-picture) */}
        {localStream && (
          <div className="absolute bottom-2 right-2 w-14 h-20 bg-neutral-900 border border-white/20 rounded-lg overflow-hidden z-10">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          </div>
        )}

        {/* Hover Controls Overlay */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/50 z-20 flex flex-col justify-between p-3 pointer-events-none"
        >
          {/* Top Bar (Status & Maximize) */}
          <div className="flex items-center justify-between w-full pointer-events-auto">
            <span className="text-[10px] font-medium bg-black/40 px-2 py-0.5 rounded-full text-white">
              {getStatusText()}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onMaximize}
              className="h-7 w-7 text-white hover:bg-white/20 rounded-full"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Bottom Bar (Mute & Hangup) */}
          <div className="flex items-center justify-center gap-3 w-full pointer-events-auto">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-full border border-white/10 transition-all cursor-pointer",
                isMuted ? "bg-white text-black hover:bg-neutral-200" : "bg-black/40 text-white hover:bg-white/15"
              )}
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg cursor-pointer"
              onClick={onHangup}
            >
              <PhoneOff className="h-4.5 w-4.5" />
            </Button>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  // AUDIO PIP WIDGET (Compact Pill)
  return (
    <motion.div
      drag
      dragElastic={0.1}
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed bottom-24 right-4 z-[120] w-72 h-14 bg-[#121b22]/95 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-between px-3 py-1.5 shadow-2xl cursor-grab active:cursor-grabbing select-none"
    >
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center border border-white/5 shrink-0">
          {contact.avatar ? (
            <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-white">
              {contact.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-white truncate">{contact.name}</span>
          <span className="text-[10px] text-[#00a884] font-medium">{getStatusText()}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Toggle Mute */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 rounded-full border border-white/10 transition-all cursor-pointer",
            isMuted ? "bg-white text-black hover:bg-neutral-200" : "bg-black/40 text-neutral-300 hover:bg-white/15"
          )}
          onClick={(e) => {
            e.stopPropagation()
            setIsMuted(!isMuted)
          }}
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>

        {/* Maximize */}
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation()
            onMaximize()
          }}
          className="h-8 w-8 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>

        {/* Hangup */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            onHangup()
          }}
        >
          <PhoneOff className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  )
}
