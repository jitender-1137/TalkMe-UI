"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { SkipForward, AlertTriangle, Ban, MoreVertical } from "lucide-react"
import type { Stranger } from "./types"

interface StrangerChatHeaderProps {
  stranger: Stranger
  onSkip: () => void
  onReport: () => void
  onBlock: () => void
}

export function StrangerChatHeader({
  stranger,
  onSkip,
  onReport,
  onBlock,
}: StrangerChatHeaderProps) {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-card/95 backdrop-blur-md border-b border-border"
    >
      {/* Stranger info */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="h-10 w-10 border-2 border-primary/30">
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-foreground font-semibold">
              {stranger.anonymousName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-card" />
        </div>
        
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">
            {stranger.anonymousName}
          </span>
          <div className="flex items-center gap-2">
            {stranger.isTyping ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-primary"
              >
                typing...
              </motion.span>
            ) : stranger.isRecording ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-amber-500"
              >
                recording audio...
              </motion.span>
            ) : (
              <span className="text-xs text-muted-foreground">Online now</span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <TooltipProvider>
        <div className="flex items-center gap-1">
          {/* Skip Partner */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="gap-1.5 text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <SkipForward className="h-4 w-4" />
                <span className="hidden sm:inline">Skip</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Skip to next partner</TooltipContent>
          </Tooltip>

          {/* Report Abuse */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
              >
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">Report</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-amber-500">
                  <AlertTriangle className="h-5 w-5" />
                  Report User
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to report this user? Our moderation team will
                  review the conversation and take appropriate action. False reports
                  may result in account restrictions.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onReport}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  Submit Report
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Block User */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Ban className="h-4 w-4" />
                <span className="hidden sm:inline">Block</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <Ban className="h-5 w-5" />
                  Block User
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will end the current chat and prevent you from being matched
                  with this user again. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onBlock}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Block User
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TooltipProvider>
    </motion.header>
  )
}
