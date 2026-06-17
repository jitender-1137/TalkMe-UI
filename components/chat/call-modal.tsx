'use client'

import { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Lock,
  Maximize2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ChatContact } from "./types"

interface CallModalProps {
  contact: ChatContact
  isOpen: boolean
  onClose: () => void
  onHangup: () => void
  callType: "audio" | "video"
  status: "ringing" | "connecting" | "connected" | "ended"
  duration: number
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  isMuted: boolean
  setIsMuted: (muted: boolean) => void
  isVideoOn: boolean
  setIsVideoOn: (videoOn: boolean) => void
  isSpeakerOn: boolean
  setIsSpeakerOn: (speakerOn: boolean) => void
}

export function CallModal({
  contact,
  isOpen,
  onClose,
  onHangup,
  callType,
  status,
  duration,
  localStream,
  remoteStream,
  isMuted,
  setIsMuted,
  isVideoOn,
  setIsVideoOn,
  isSpeakerOn,
  setIsSpeakerOn,
}: CallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

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
        return "Call ended"
    }
  }

  if (!isOpen) return null

  const showVideoFeed = callType === "video" && isVideoOn

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[130] bg-[#0b141a] text-white flex flex-col justify-between overflow-hidden"
      >
        {/* VIDEO CALL SCREEN */}
        {showVideoFeed ? (
          <div className="absolute inset-0 z-0">
            {remoteStream ? (
              /* Remote Participant Fullscreen Feed */
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              /* Remote Participant Avatar Placeholder */
              <div className="absolute inset-0 bg-[#121b22] flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-[#00a884]/20 animate-ping duration-1000" />
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center border-2 border-white/5 relative z-10">
                    {contact.avatar ? (
                      <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-bold text-white">
                        {contact.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <h2 className="text-xl font-medium">{contact.name}</h2>
                <p className="text-sm text-neutral-400">{getStatusText()}</p>
              </div>
            )}

            {/* Local User PIP Floating View */}
            {localStream && (
              <motion.div
                drag
                dragConstraints={{ left: -300, right: 20, top: -400, bottom: 20 }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute bottom-28 right-4 w-28 h-40 bg-neutral-900 border-2 border-white/20 rounded-2xl overflow-hidden shadow-2xl z-30 cursor-grab active:cursor-grabbing"
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              </motion.div>
            )}
          </div>
        ) : (
          /* AUDIO CALL SCREEN */
          <div className="absolute inset-0 bg-[#121b22] flex flex-col items-center justify-center z-0 px-6">
            {/* Pulsing Ripple Rings */}
            {status === "ringing" && (
              <>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.4 }}
                  animate={{ scale: 1.8, opacity: 0 }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  className="absolute w-44 h-44 rounded-full border-2 border-[#00a884]/30 z-0"
                />
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.4 }}
                  animate={{ scale: 1.8, opacity: 0 }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: 0.6 }}
                  className="absolute w-44 h-44 rounded-full border-2 border-[#00a884]/30 z-0"
                />
              </>
            )}

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center border-2 border-white/10 shadow-2xl">
                {contact.avatar ? (
                  <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-white">
                    {contact.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <h2 className="mt-6 text-2xl font-semibold text-white drop-shadow-md">
                {contact.name}
              </h2>
              <p className={cn(
                "mt-3 text-sm font-medium transition-colors duration-300",
                status === "connected" ? "text-[#00a884]" : "text-neutral-400"
              )}>
                {getStatusText()}
              </p>
            </div>
          </div>
        )}

        {/* TOP BAR OVERLAY */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent z-20">
          <div className="flex items-center gap-2 text-neutral-300 bg-black/20 backdrop-blur-sm rounded-full py-1.5 px-3 border border-white/5">
            <Lock className="h-3.5 w-3.5 text-[#00a884] fill-[#00a884]/20" />
            <span className="text-xs font-medium tracking-wide">End-to-end encrypted</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <Maximize2 className="h-4.5 w-4.5 rotate-45" />
          </Button>
        </div>

        {/* CONTROLS DASHBOARD OVERLAY */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-20 flex flex-col items-center">
          <div className="flex items-center justify-center gap-5 w-full max-w-sm">
            {/* Audio speaker/device toggle */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-12 w-12 rounded-full border border-white/10 transition-all cursor-pointer backdrop-blur-md",
                isSpeakerOn 
                  ? "bg-white text-black hover:bg-neutral-200" 
                  : "bg-black/40 text-neutral-300 hover:bg-white/10"
              )}
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              title={isSpeakerOn ? "Speaker Off" : "Speaker On"}
            >
              {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>

            {/* Video camera toggle */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-12 w-12 rounded-full border border-white/10 transition-all cursor-pointer backdrop-blur-md",
                isVideoOn 
                  ? "bg-black/40 text-neutral-300 hover:bg-white/10"
                  : "bg-white text-black hover:bg-neutral-200"
              )}
              onClick={() => setIsVideoOn(!isVideoOn)}
              title={isVideoOn ? "Video Off" : "Video On"}
            >
              {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>

            {/* Mute microphone toggle */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-12 w-12 rounded-full border border-white/10 transition-all cursor-pointer backdrop-blur-md",
                isMuted 
                  ? "bg-white text-black hover:bg-neutral-200" 
                  : "bg-black/40 text-neutral-300 hover:bg-white/10"
              )}
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            {/* Hangup button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 text-white shrink-0 shadow-lg cursor-pointer transition-all hover:scale-105 active:scale-95"
              onClick={onHangup}
              title="Hang up"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
