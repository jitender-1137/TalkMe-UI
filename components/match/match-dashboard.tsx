"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useMatchStore } from "./match-store"
import { MatchRadar } from "./match-radar"
import { MatchFiltersPanel } from "./match-filters"
import { StrangerChatScreen } from "./stranger-chat-screen"
import { Play, Square, Users, Zap, Shield } from "lucide-react"
import type { StrangerMessage, Stranger } from "./types"

// Mock data for demonstration
const mockStrangers: Stranger[] = [
  { id: "1", anonymousName: "Mystery Fox", interests: ["Music", "Gaming", "Technology"] },
  { id: "2", anonymousName: "Cosmic Bear", interests: ["Travel", "Photography", "Art"] },
  { id: "3", anonymousName: "Silent Wolf", interests: ["Movies", "Books", "Food"] },
]

const generateMockResponse = (strangerId: string): string => {
  const responses = [
    "Hey! Nice to meet you!",
    "How's your day going?",
    "That's interesting! Tell me more.",
    "I love that too!",
    "What brings you here today?",
  ]
  return responses[Math.floor(Math.random() * responses.length)]
}

export function MatchDashboard() {
  const {
    status,
    filters,
    stranger,
    messages,
    searchTime,
    setStatus,
    setFilters,
    setStranger,
    addMessage,
    revealMedia,
    clearMessages,
    resetMatch,
    incrementSearchTime,
  } = useMatchStore()

  const [onlineUsers, setOnlineUsers] = useState(1247)

  // Simulate search time counter
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (status === "searching") {
      interval = setInterval(() => {
        incrementSearchTime()
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [status, incrementSearchTime])

  // Simulate finding a match
  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (status === "searching" && searchTime > 3) {
      const randomDelay = Math.random() * 3000 + 2000
      timeout = setTimeout(() => {
        const randomStranger = mockStrangers[Math.floor(Math.random() * mockStrangers.length)]
        setStranger(randomStranger)
        setStatus("matched")
        clearMessages()
      }, randomDelay)
    }
    return () => clearTimeout(timeout)
  }, [status, searchTime, setStranger, setStatus, clearMessages])

  // Simulate online users fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineUsers((prev) => prev + Math.floor(Math.random() * 20) - 10)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const startSearch = () => {
    setStatus("searching")
  }

  const stopSearch = () => {
    resetMatch()
  }

  const handleSendMessage = useCallback((content: string) => {
    const newMessage: StrangerMessage = {
      id: Date.now().toString(),
      content,
      timestamp: Date.now(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isFromStranger: false,
    }
    addMessage(newMessage)

    // Simulate stranger response
    if (stranger) {
      const typingStranger = { ...stranger, isTyping: true }
      setStranger(typingStranger)
      
      setTimeout(() => {
        const responseMessage: StrangerMessage = {
          id: (Date.now() + 1).toString(),
          content: generateMockResponse(stranger.id),
          timestamp: Date.now(),
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isFromStranger: true,
        }
        addMessage(responseMessage)
        setStranger({ ...stranger, isTyping: false })
      }, 1500 + Math.random() * 2000)
    }
  }, [addMessage, stranger, setStranger])

  const handleSkip = () => {
    setStatus("searching")
    setStranger(null)
    clearMessages()
  }

  const handleReport = () => {
    console.log("Reported user:", stranger?.id)
    handleSkip()
  }

  const handleBlock = () => {
    console.log("Blocked user:", stranger?.id)
    resetMatch()
  }

  const formatSearchTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Show chat screen when matched
  if (status === "matched" && stranger) {
    return (
      <StrangerChatScreen
        stranger={stranger}
        messages={messages}
        onSendMessage={handleSendMessage}
        onSkip={handleSkip}
        onReport={handleReport}
        onBlock={handleBlock}
        onRevealMedia={revealMedia}
      />
    )
  }

  // Show radar/search view
  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24 md:pb-4">
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
