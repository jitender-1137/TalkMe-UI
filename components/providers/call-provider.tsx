'use client'

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Phone, PhoneOff, Video, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWebSocket } from "./websocket-provider"
import { useProfile } from "@/src/api/hooks/useProfile"
import { CallModal } from "../chat/call-modal"
import { toast } from "sonner"
import type { ChatContact } from "../chat/types"

// Sound synthesis helper using Web Audio API to avoid external static files
class RingtoneManager {
  private ctx: AudioContext | null = null
  private osc1: OscillatorNode | null = null
  private osc2: OscillatorNode | null = null
  private gainNode: GainNode | null = null
  private intervalId: any = null

  startOutgoing() {
    this.stop()
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const playRing = () => {
        if (!this.ctx) return
        const now = this.ctx.currentTime
        this.osc1 = this.ctx.createOscillator()
        this.osc2 = this.ctx.createOscillator()
        this.gainNode = this.ctx.createGain()

        // Ringback dual frequency: 440Hz + 480Hz
        this.osc1.frequency.value = 440
        this.osc2.frequency.value = 480

        this.osc1.connect(this.gainNode)
        this.osc2.connect(this.gainNode)
        this.gainNode.connect(this.ctx.destination)

        this.gainNode.gain.setValueAtTime(0, now)
        this.gainNode.gain.linearRampToValueAtTime(0.12, now + 0.1)
        this.gainNode.gain.setValueAtTime(0.12, now + 1.8)
        this.gainNode.gain.linearRampToValueAtTime(0, now + 2.0)

        this.osc1.start(now)
        this.osc2.start(now)
        this.osc1.stop(now + 2.0)
        this.osc2.stop(now + 2.0)
      }

      playRing()
      this.intervalId = setInterval(playRing, 4000)
    } catch (e) {
      console.error("Failed to start outgoing ringtone:", e)
    }
  }

  startIncoming() {
    this.stop()
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const playRing = () => {
        if (!this.ctx) return
        const now = this.ctx.currentTime
        this.osc1 = this.ctx.createOscillator()
        this.gainNode = this.ctx.createGain()

        // UK style double ring: 400Hz
        this.osc1.frequency.value = 400
        this.osc1.connect(this.gainNode)
        this.gainNode.connect(this.ctx.destination)

        // beep beep ... beep beep
        this.gainNode.gain.setValueAtTime(0, now)
        this.gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05)
        this.gainNode.gain.setValueAtTime(0.15, now + 0.35)
        this.gainNode.gain.linearRampToValueAtTime(0, now + 0.4)

        this.gainNode.gain.linearRampToValueAtTime(0.15, now + 0.55)
        this.gainNode.gain.setValueAtTime(0.15, now + 0.85)
        this.gainNode.gain.linearRampToValueAtTime(0, now + 0.9)

        this.osc1.start(now)
        this.osc1.stop(now + 1.2)
      }

      playRing()
      this.intervalId = setInterval(playRing, 2500)
    } catch (e) {
      console.error("Failed to start incoming ringtone:", e)
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    try {
      if (this.osc1) {
        this.osc1.stop()
        this.osc1 = null
      }
      if (this.osc2) {
        this.osc2.stop()
        this.osc2 = null
      }
      if (this.ctx) {
        this.ctx.close()
        this.ctx = null
      }
    } catch (e) {
      // ignore
    }
  }
}

interface ActiveCall {
  callId: string
  chatId: string
  contact: ChatContact
  callType: "audio" | "video"
  status: "ringing" | "connecting" | "connected" | "ended"
  incoming: boolean
  duration?: number
}

interface CallContextType {
  activeCall: ActiveCall | null
  makeCall: (chatId: string, contact: ChatContact, type: "audio" | "video") => void
  acceptCall: () => void
  declineCall: () => void
  endCall: () => void
  isMuted: boolean
  setIsMuted: (muted: boolean) => void
  isVideoOn: boolean
  setIsVideoOn: (videoOn: boolean) => void
  isSpeakerOn: boolean
  setIsSpeakerOn: (speakerOn: boolean) => void
  localStream: MediaStream | null
  remoteStream: MediaStream | null
}

const CallContext = createContext<CallContextType | null>(null)

export function useCall() {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error("useCall must be used within CallProvider")
  return ctx
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { registerHandler, sendEvent } = useWebSocket()
  const { data: ownProfile } = useProfile()
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null)
  
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isSpeakerOn, setIsSpeakerOn] = useState(false)

  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  const ringtoneManagerRef = useRef<RingtoneManager | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const activeCallRef = useRef<ActiveCall | null>(null)
  const isSettingDescriptionRef = useRef(false)
  const queuedCandidatesRef = useRef<RTCIceCandidateInit[]>([])


  // Sync ref to allow callbacks to read state without stale closures
  useEffect(() => {
    activeCallRef.current = activeCall
  }, [activeCall])

  // Initialize ringtone manager
  useEffect(() => {
    ringtoneManagerRef.current = new RingtoneManager()
    return () => ringtoneManagerRef.current?.stop()
  }, [])

  // WebRTC Cleanup Helper
  const cleanupWebRTC = useCallback(() => {
    ringtoneManagerRef.current?.stop()
    
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
      setLocalStream(null)
    }
    setRemoteStream(null)

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    isSettingDescriptionRef.current = false
    queuedCandidatesRef.current = []
  }, [localStream])

  // Helper to process remote candidates queued before remote description was set
  const processQueuedCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current
    if (pc && pc.remoteDescription && queuedCandidatesRef.current.length > 0) {
      const candidates = [...queuedCandidatesRef.current]
      queuedCandidatesRef.current = []
      for (const candidate of candidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (e) {
          console.warn("Error adding queued IceCandidate:", e)
        }
      }
    }
  }, [])

  // End Call Callback
  const endCall = useCallback(() => {
    const call = activeCallRef.current
    if (call) {
      sendEvent("call_end", { chatId: call.chatId, callId: call.callId })
      setActiveCall((prev) => (prev ? { ...prev, status: "ended" } : null))
      setTimeout(() => setActiveCall(null), 1000)
    }
    cleanupWebRTC()
  }, [sendEvent, cleanupWebRTC])

  // Decline Call Callback
  const declineCall = useCallback(() => {
    const call = activeCallRef.current
    if (call) {
      sendEvent("call_decline", { chatId: call.chatId, callId: call.callId })
      setActiveCall(null)
    }
    cleanupWebRTC()
  }, [sendEvent, cleanupWebRTC])

  // Setup WebRTC connection
  const setupWebRTC = useCallback(async (call: ActiveCall, isInitiator: boolean) => {
    try {
      cleanupWebRTC()

      // 1. Get local stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: call.callType === "video",
        audio: true,
      })
      setLocalStream(stream)

      // 2. Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      })
      peerConnectionRef.current = pc

      // Add local tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))

      // Listen for remote tracks
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0])
        }
      }

      // Exchange ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendEvent("call_candidate", {
            chatId: call.chatId,
            callId: call.callId,
            candidate: event.candidate,
          })
        }
      }

      if (isInitiator) {
        // Create WebRTC Offer
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        sendEvent("call_offer", {
          chatId: call.chatId,
          callId: call.callId,
          sdp: offer,
        })
      }
    } catch (err) {
      console.error("Error setting up WebRTC:", err)
      toast.error("Failed to access camera or microphone")
      // fallback to mock call
      setActiveCall((prev) => (prev ? { ...prev, status: "connected" } : null))
    }
  }, [sendEvent, cleanupWebRTC])

  // Accept Call Callback
  const acceptCall = useCallback(async () => {
    const call = activeCallRef.current
    if (!call) return

    ringtoneManagerRef.current?.stop()
    setActiveCall((prev) => (prev ? { ...prev, status: "connecting" } : null))

    sendEvent("call_accept", { chatId: call.chatId, callId: call.callId })
    await setupWebRTC(call, false)
  }, [sendEvent, setupWebRTC])

  // Make Call Callback
  const makeCall = useCallback((chatId: string, contact: ChatContact, type: "audio" | "video") => {
    const callId = Math.random().toString(36).substring(7)
    const newCall: ActiveCall = {
      callId,
      chatId,
      contact,
      callType: type,
      status: "ringing",
      incoming: false,
    }
    
    setIsMuted(false)
    setIsVideoOn(type === "video")
    setIsSpeakerOn(false)
    setActiveCall(newCall)

    ringtoneManagerRef.current?.startOutgoing()

    sendEvent("call_invite", {
      chatId,
      callId,
      callerId: ownProfile?.id,
      callerName: ownProfile?.name || ownProfile?.username || "Friend",
      callerAvatar: ownProfile?.avatar || "",
      callType: type,
    })

    // Auto-timeout call after 45s if unanswered
    setTimeout(() => {
      const current = activeCallRef.current
      if (current && current.callId === callId && current.status === "ringing") {
        toast.info("No answer")
        endCall()
      }
    }, 45000)
  }, [ownProfile, sendEvent, endCall])

  // WebSockets Call Events Handlers
  useEffect(() => {
    const unbindInvite = registerHandler("call_invite", (payload) => {
      if (payload.callerId === ownProfile?.id) return

      const current = activeCallRef.current
      if (current && current.status !== "ended") {
        // Already in call, send busy signal
        sendEvent("call_busy", { chatId: payload.chatId, callId: payload.callId })
        return
      }

      const incomingCall: ActiveCall = {
        callId: payload.callId,
        chatId: payload.chatId,
        contact: {
          id: payload.chatId,
          name: payload.callerName,
          avatar: payload.callerAvatar || undefined,
          activity: "online",
        },
        callType: payload.callType,
        status: "ringing",
        incoming: true,
      }

      setIsMuted(false)
      setIsVideoOn(payload.callType === "video")
      setIsSpeakerOn(false)
      setActiveCall(incomingCall)

      ringtoneManagerRef.current?.startIncoming()
    })

    const unbindAccept = registerHandler("call_accept", async (payload) => {
      const current = activeCallRef.current
      if (current && current.callId === payload.callId) {
        ringtoneManagerRef.current?.stop()
        setActiveCall((prev) => (prev ? { ...prev, status: "connecting" } : null))
        await setupWebRTC(current, true)
      }
    })

    const unbindDecline = registerHandler("call_decline", (payload) => {
      const current = activeCallRef.current
      if (current && current.callId === payload.callId) {
        toast.info("Call declined")
        cleanupWebRTC()
        setActiveCall(null)
      }
    })

    const unbindBusy = registerHandler("call_busy", (payload) => {
      const current = activeCallRef.current
      if (current && current.callId === payload.callId) {
        toast.error("User is busy")
        cleanupWebRTC()
        setActiveCall(null)
      }
    })

    const unbindEnd = registerHandler("call_end", (payload) => {
      const current = activeCallRef.current
      if (current && current.callId === payload.callId) {
        cleanupWebRTC()
        setActiveCall((prev) => (prev ? { ...prev, status: "ended" } : null))
        setTimeout(() => setActiveCall(null), 1000)
      }
    })

    // WebRTC Signaling handlers
    const unbindOffer = registerHandler("call_offer", async (payload) => {
      const pc = peerConnectionRef.current
      if (pc && pc.signalingState === "stable" && !isSettingDescriptionRef.current) {
        try {
          isSettingDescriptionRef.current = true
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          sendEvent("call_answer", {
            chatId: payload.chatId,
            callId: payload.callId,
            sdp: answer,
          })
          await processQueuedCandidates()
        } catch (e) {
          console.error("Error handling call_offer:", e)
        } finally {
          isSettingDescriptionRef.current = false
        }
      }
    })

    const unbindAnswer = registerHandler("call_answer", async (payload) => {
      const pc = peerConnectionRef.current
      if (pc && pc.signalingState === "have-local-offer" && !isSettingDescriptionRef.current) {
        try {
          isSettingDescriptionRef.current = true
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          setActiveCall((prev) => (prev ? { ...prev, status: "connected" } : null))
          await processQueuedCandidates()
        } catch (e) {
          console.error("Error handling call_answer:", e)
        } finally {
          isSettingDescriptionRef.current = false
        }
      }
    })

    const unbindCandidate = registerHandler("call_candidate", async (payload) => {
      const pc = peerConnectionRef.current
      if (pc && payload.candidate) {
        if (pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
            setActiveCall((prev) => (prev ? { ...prev, status: "connected" } : null))
          } catch (e) {
            console.warn("Error adding IceCandidate:", e)
          }
        } else {
          queuedCandidatesRef.current.push(payload.candidate)
        }
      }
    })

    return () => {
      unbindInvite()
      unbindAccept()
      unbindDecline()
      unbindBusy()
      unbindEnd()
      unbindOffer()
      unbindAnswer()
      unbindCandidate()
    }
  }, [ownProfile?.id, registerHandler, sendEvent, setupWebRTC, cleanupWebRTC, processQueuedCandidates])

  // Call duration counter
  useEffect(() => {
    if (!activeCall || activeCall.status !== "connected") return
    let duration = 0
    const interval = setInterval(() => {
      duration += 1
      setActiveCall((prev) => (prev && prev.status === "connected" ? { ...prev, duration } : prev))
    }, 1000)
    return () => clearInterval(interval)
  }, [activeCall?.status])

  // Toggle Mute Track
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted
      })
    }
  }, [isMuted, localStream])

  // Toggle Video Track
  useEffect(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOn
      })
    }
  }, [isVideoOn, localStream])

  return (
    <CallContext.Provider
      value={{
        activeCall,
        makeCall,
        acceptCall,
        declineCall,
        endCall,
        isMuted,
        setIsMuted,
        isVideoOn,
        setIsVideoOn,
        isSpeakerOn,
        setIsSpeakerOn,
        localStream,
        remoteStream,
      }}
    >
      {children}

      {/* Floating Incoming Call Notification Banner (WhatsApp Web style) */}
      <AnimatePresence>
        {activeCall && activeCall.incoming && activeCall.status === "ringing" && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 left-4 right-4 md:left-auto md:right-10 z-[120] max-w-sm w-full bg-[#121b22] text-white border border-white/10 shadow-2xl rounded-2xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center shrink-0 border border-white/5">
                {activeCall.contact.avatar ? (
                  <img
                    src={activeCall.contact.avatar}
                    alt={activeCall.contact.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-white">
                    {activeCall.contact.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold truncate text-white">
                  {activeCall.contact.name}
                </h4>
                <p className="text-xs text-neutral-400">
                  Incoming {activeCall.callType === "video" ? "video" : "voice"} call...
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={declineCall}
                size="icon"
                className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 text-white shrink-0 shadow-lg cursor-pointer"
                title="Decline call"
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
              <Button
                onClick={acceptCall}
                size="icon"
                className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-lg cursor-pointer"
                title="Accept call"
              >
                {activeCall.callType === "video" ? (
                  <Video className="h-5 w-5 fill-white" />
                ) : (
                  <Phone className="h-5 w-5 fill-white" />
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Call Window Modal */}
      {activeCall &&
        (activeCall.status === "connected" ||
          activeCall.status === "connecting" ||
          (activeCall.status === "ringing" && !activeCall.incoming)) && (
          <CallModal
            contact={activeCall.contact}
            isOpen={true}
            onClose={endCall}
            callType={activeCall.callType}
            status={activeCall.status}
            duration={activeCall.duration || 0}
            localStream={localStream}
            remoteStream={remoteStream}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            isVideoOn={isVideoOn}
            setIsVideoOn={setIsVideoOn}
            isSpeakerOn={isSpeakerOn}
            setIsSpeakerOn={setIsSpeakerOn}
          />
        )}
    </CallContext.Provider>
  )
}
