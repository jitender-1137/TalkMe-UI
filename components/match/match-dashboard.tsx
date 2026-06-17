"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useMatchStore } from "./match-store"
import { MatchRadar } from "./match-radar"
import { MatchFiltersPanel } from "./match-filters"
import { StrangerChatScreen } from "./stranger-chat-screen"
import { Play, Square, Users, Zap, Shield } from "lucide-react"
import { useWebSocket } from "@/components/providers"
import { useAuth } from "@/components/app-shell/auth-context"
import {
  useMatchOnlineCount,
  useGetActiveSession,
} from "@/src/api/hooks/useMatch"
import type { StrangerMessage } from "./types"
import Dexie from "dexie"
import { useLiveQuery } from "dexie-react-hooks"

function getSessionDb(sessionId: string) {
  const dbName = `random-chat-${sessionId}`
  const sdb = new Dexie(dbName)
  sdb.version(1).stores({
    messages: "id, timestamp"
  })
  return sdb
}

const saveSessionMessage = async (sessionId: string, msg: any) => {
  try {
    const sdb = getSessionDb(sessionId)
    await sdb.table("messages").put(msg)
  } catch (err) {
    console.error("Failed to save session message:", err)
  }
}

const clearSessionDb = async (sessionId: string) => {
  try {
    await Dexie.delete(`random-chat-${sessionId}`)
  } catch (err) {
    console.error("Failed to clear session DB:", err)
  }
}

export function MatchDashboard() {
  const {
    status,
    filters,
    stranger,
    searchTime,
    setStatus,
    setFilters,
    setStranger,
    clearMessages,
    resetMatch,
    incrementSearchTime,
  } = useMatchStore()

  const { user } = useAuth()
  const { registerHandler, sendEvent } = useWebSocket()
  const [onlineUsers, setOnlineUsers] = useState(1247)

  // API queries
  const { data: onlineCount } = useMatchOnlineCount()
  const { data: activeSession } = useGetActiveSession()

  // Track online users count
  useEffect(() => {
    if (typeof onlineCount === "number") {
      setOnlineUsers(onlineCount)
    }
  }, [onlineCount])

  // Restore active session on mount
  useEffect(() => {
    if (activeSession && status === "idle") {
      setStranger({
        id: activeSession.partner?.id || "stranger",
        anonymousName: activeSession.partner?.username || "Stranger",
        interests: Array.from(activeSession.partner?.interests || []),
        chatId: activeSession.chatId,
        sessionId: activeSession.id,
        isGuest: activeSession.partner?.isGuest || false,
      })
      setStatus("matched")
    }
  }, [activeSession, status, setStranger, setStatus])

  // Sync search time counter
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (status === "searching") {
      interval = setInterval(() => {
        incrementSearchTime()
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [status, incrementSearchTime])

  // General WebSocket matchmaking event handlers
  useEffect(() => {
    if (!registerHandler) return

    const unbindWaiting = registerHandler("WAITING", () => {
      console.log("[Matchmaker] WAITING received")
      setStatus("searching")
    })

    const unbindMatchFound = registerHandler("MATCH_FOUND", (payload: any) => {
      console.log("[Matchmaker] MATCH_FOUND received:", payload)
      if (payload) {
        setStranger({
          id: payload.partner?.id || "stranger",
          anonymousName: payload.partner?.username || "Stranger",
          interests: Array.from(payload.partner?.interests || []),
          chatId: payload.sessionId,
          sessionId: payload.sessionId,
          isGuest: payload.partner?.isGuest || false,
        })
        setStatus("matched")
        clearMessages()
      }
    })

    const unbindDisconnect = registerHandler("STRANGER_DISCONNECTED", (payload: any) => {
      console.log("[Matchmaker] STRANGER_DISCONNECTED received")
      if (stranger?.sessionId) {
        clearSessionDb(stranger.sessionId)
      }
      setStatus("disconnected")
    })

    const unbindMatchEnded = registerHandler("MATCH_ENDED", (payload: any) => {
      console.log("[Matchmaker] MATCH_ENDED received")
      if (stranger?.sessionId) {
        clearSessionDb(stranger.sessionId)
      }
      resetMatch()
    })

    return () => {
      unbindWaiting()
      unbindMatchFound()
      unbindDisconnect()
      unbindMatchEnded()
    }
  }, [registerHandler, stranger?.sessionId, setStranger, setStatus, clearMessages, resetMatch])

  // Session-specific WebSocket message event handlers
  useEffect(() => {
    if (!registerHandler || !stranger?.sessionId) return
    const sessionId = stranger.sessionId

    const unbindMsgReceived = registerHandler("MESSAGE_RECEIVED", (payload: any) => {
      console.log("[Matchmaker] MESSAGE_RECEIVED received:", payload)
      if (payload) {
        saveSessionMessage(sessionId, {
          id: payload.id,
          content: payload.content,
          timestamp: payload.timestamp,
          time: new Date(payload.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isFromStranger: true
        })
      }
    })

    const unbindGifReceived = registerHandler("GIF_RECEIVED", (payload: any) => {
      console.log("[Matchmaker] GIF_RECEIVED received:", payload)
      if (payload) {
        saveSessionMessage(sessionId, {
          id: payload.id,
          content: "",
          timestamp: payload.timestamp,
          time: new Date(payload.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isFromStranger: true,
          media: payload.media ? { ...payload.media, isBlurred: true } : undefined
        })
      }
    })

    const unbindImgReceived = registerHandler("IMAGE_RECEIVED", (payload: any) => {
      console.log("[Matchmaker] IMAGE_RECEIVED received:", payload)
      if (payload) {
        saveSessionMessage(sessionId, {
          id: payload.id,
          content: "",
          timestamp: payload.timestamp,
          time: new Date(payload.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isFromStranger: true,
          media: payload.media ? { ...payload.media, isBlurred: true } : undefined
        })
      }
    })

    const unbindImgReq = registerHandler("IMAGE_REQUEST_RECEIVED", (payload: any) => {
      console.log("[Matchmaker] IMAGE_REQUEST_RECEIVED received")
      saveSessionMessage(sessionId, {
        id: `req-${Date.now()}`,
        content: "__IMAGE_REQUEST__",
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isFromStranger: true
      })
    })

    const unbindImgAccepted = registerHandler("IMAGE_REQUEST_ACCEPTED", (payload: any) => {
      console.log("[Matchmaker] IMAGE_REQUEST_ACCEPTED received")
      saveSessionMessage(sessionId, {
        id: `acc-${Date.now()}`,
        content: "__IMAGE_ACCEPT__",
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isFromStranger: true
      })
    })

    const unbindImgDeclined = registerHandler("IMAGE_REQUEST_DECLINED", (payload: any) => {
      console.log("[Matchmaker] IMAGE_REQUEST_DECLINED received")
      saveSessionMessage(sessionId, {
        id: `rej-${Date.now()}`,
        content: "__IMAGE_REJECT__",
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isFromStranger: true
      })
    })

    return () => {
      unbindMsgReceived()
      unbindGifReceived()
      unbindImgReceived()
      unbindImgReq()
      unbindImgAccepted()
      unbindImgDeclined()
    }
  }, [registerHandler, stranger?.sessionId])

  // Reactive message list from IndexedDB using useLiveQuery
  const messages = useLiveQuery(async () => {
    if (!stranger?.sessionId) return []
    const sdb = getSessionDb(stranger.sessionId)
    return await sdb.table("messages").orderBy("timestamp").toArray()
  }, [stranger?.sessionId]) || []

  const formatMsg = (id: string, content: string, isFromStranger: boolean, media?: any) => {
    const timestamp = Date.now()
    const time = new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
    return {
      id,
      content,
      timestamp,
      time,
      isFromStranger,
      media
    }
  }

  const startSearch = () => {
    setStatus("searching")
    clearMessages()
    setStranger(null)
    sendEvent("START_MATCHING", {})
  }

  const stopSearch = () => {
    sendEvent("EXIT_CHAT", {})
    resetMatch()
  }

  const handleSendMessage = useCallback(
    (content: string, type: "text" | "image" = "text", media?: any) => {
      if (!stranger?.sessionId) return
      const sessionId = stranger.sessionId

      if (content === "__IMAGE_REQUEST__") {
        sendEvent("REQUEST_IMAGE", {})
        saveSessionMessage(sessionId, formatMsg(`req-${Date.now()}`, "__IMAGE_REQUEST__", false))
      } else if (content === "__IMAGE_ACCEPT__") {
        sendEvent("ACCEPT_IMAGE_REQUEST", {})
      } else if (content === "__IMAGE_REJECT__") {
        sendEvent("DECLINE_IMAGE_REQUEST", {})
      } else {
        if (type === "image") {
          const isGif = media?.url?.includes("giphy") || media?.url?.includes(".gif")
          const mediaPayload = media ? { ...media, isBlurred: true } : undefined
          if (isGif) {
            sendEvent("SEND_GIF", { media: mediaPayload })
            saveSessionMessage(sessionId, formatMsg(`gif-${Date.now()}`, "", false, mediaPayload))
          } else {
            sendEvent("SEND_IMAGE", { media: mediaPayload })
            saveSessionMessage(sessionId, formatMsg(`img-${Date.now()}`, "", false, mediaPayload))
          }
        } else {
          sendEvent("SEND_MESSAGE", { content })
          saveSessionMessage(sessionId, formatMsg(`msg-${Date.now()}`, content, false))
        }
      }
    },
    [stranger, sendEvent]
  )

  const handleSkip = () => {
    if (stranger?.sessionId) {
      clearSessionDb(stranger.sessionId)
    }
    setStatus("searching")
    setStranger(null)
    clearMessages()
    sendEvent("NEW_CHAT", {})
  }

  const handleReport = () => {
    handleSkip()
  }

  const handleBlock = () => {
    handleExit()
  }

  const handleExit = () => {
    if (stranger?.sessionId) {
      sendEvent("EXIT_CHAT", {})
      clearSessionDb(stranger.sessionId)
    }
    resetMatch()
  }

  const formatSearchTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleRevealMedia = async (messageId: string) => {
    if (!stranger?.sessionId) return
    try {
      const sdb = getSessionDb(stranger.sessionId)
      const msg = await sdb.table("messages").get(messageId)
      if (msg && msg.media) {
        msg.media.isBlurred = false
        await sdb.table("messages").put(msg)
      }
    } catch (err) {
      console.error("Failed to reveal media:", err)
    }
  }

  const handleHideMedia = async (messageId: string) => {
    if (!stranger?.sessionId) return
    try {
      const sdb = getSessionDb(stranger.sessionId)
      const msg = await sdb.table("messages").get(messageId)
      if (msg && msg.media) {
        msg.media.isBlurred = true
        await sdb.table("messages").put(msg)
      }
    } catch (err) {
      console.error("Failed to hide media:", err)
    }
  }

  // Render chat screen when matched or disconnected
  if ((status === "matched" || status === "disconnected") && stranger) {
    return (
      <StrangerChatScreen
        stranger={stranger}
        messages={messages}
        onSendMessage={handleSendMessage}
        onSkip={handleSkip}
        onReport={handleReport}
        onBlock={handleBlock}
        onExit={handleExit}
        onRevealMedia={handleRevealMedia}
        onHideMedia={handleHideMedia}
      />
    )
  }

  // Show radar/search view
  return (
    <div className="flex flex-col h-full overflow-y-auto pb-6 md:pb-4">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Match & Discover</h1>
            <p className="text-sm text-muted-foreground">Find your next conversation</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <Users className="h-3 w-3" />
              {onlineUsers.toLocaleString()} online
            </Badge>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Radar section */}
          <div className="flex flex-col items-center gap-6">
            <MatchRadar isSearching={status === "searching"} />

            {/* Search status */}
            <AnimatePresence mode="wait">
              {status === "searching" ? (
                <motion.div
                  key="searching"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="flex items-center gap-2 text-primary">
                    <Zap className="h-4 w-4 animate-pulse" />
                    <span className="font-medium">Searching for a match...</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Time elapsed: {formatSearchTime(searchTime)}
                  </span>
                  <Button
                    variant="outline"
                    onClick={stopSearch}
                    className="mt-2 gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                  >
                    <Square className="h-4 w-4" />
                    Cancel Search
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center gap-4"
                >
                  <Button
                    size="lg"
                    onClick={startSearch}
                    className="gap-2 px-8 py-6 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
                  >
                    <Play className="h-5 w-5" />
                    Start Matching
                  </Button>
                  <p className="text-sm text-muted-foreground text-center max-w-xs">
                    Click to find a random stranger who shares your interests
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Filters section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Match Preferences</h2>
              <Badge variant="secondary" className="gap-1">
                <Shield className="h-3 w-3" />
                Safe Mode On
              </Badge>
            </div>
            <MatchFiltersPanel
              filters={filters}
              onFilterChange={setFilters}
              disabled={status === "searching"}
            />
          </div>

          {/* Tips section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: Shield,
                title: "Stay Safe",
                description: "Never share personal info with strangers",
              },
              {
                icon: Users,
                title: "Be Respectful",
                description: "Treat others how you want to be treated",
              },
              {
                icon: Zap,
                title: "Have Fun",
                description: "Discover new perspectives and cultures",
              },
            ].map((tip, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-4 rounded-xl bg-card/50 border border-border/50"
              >
                <tip.icon className="h-6 w-6 text-primary mb-2" />
                <h3 className="font-medium text-foreground">{tip.title}</h3>
                <p className="text-sm text-muted-foreground">{tip.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
