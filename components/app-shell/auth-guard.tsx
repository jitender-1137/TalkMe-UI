"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useAuth } from "./auth-context"
import { MessageCircle, Lock, Users, Newspaper, Settings, Compass } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
  tab: string
}

const tabInfo: Record<string, { icon: React.ElementType; title: string; description: string }> = {
  chats: {
    icon: MessageCircle,
    title: "Chats",
    description: "Connect with friends and start conversations",
  },
  friends: {
    icon: Users,
    title: "Friends",
    description: "View your friend list and manage connections",
  },
  news: {
    icon: Newspaper,
    title: "News Feed",
    description: "Stay updated with posts from your network",
  },
  settings: {
    icon: Settings,
    title: "Settings",
    description: "Manage your profile and preferences",
  },
  discover: {
    icon: Compass,
    title: "Discover",
    description: "Find new people and explore communities",
  },
}

export function AuthGuard({ children, tab }: AuthGuardProps) {
  const { isAuthenticated, isGuest, openLoginModal, openSignupModal } = useAuth()

  const isGuestBlocked = isAuthenticated && isGuest

  if (isAuthenticated && !isGuestBlocked) {
    return <>{children}</>
  }

  const info = tabInfo[tab] || tabInfo.chats
  const Icon = info.icon

  const title = isGuestBlocked ? "Account required" : "Sign in required"
  const description = isGuestBlocked
    ? `Guest sessions cannot access the ${info.title.toLowerCase()} page. Please register or sign in with a full account to unlock this feature.`
    : `Please sign in to access ${info.title.toLowerCase()} and unlock all features`

  return (
    <div className="flex flex-col h-[100dvh] overflow-y-auto pb-32 md:pb-4">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-bold text-foreground">{info.title}</h1>
            <p className="text-sm text-muted-foreground">{info.description}</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center"
        >
          <div className="bg-card rounded-2xl border border-border shadow-lg p-8">
            {/* Lock Icon */}
            <div className="flex items-center justify-center h-20 w-20 rounded-full bg-primary/10 mx-auto mb-6">
              <Lock className="h-10 w-10 text-primary" />
            </div>

            {/* Text */}
            <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
            <p className="text-muted-foreground mb-6">
              {description}
            </p>

            {/* Buttons */}
            <div className="space-y-3">
              <Button
                onClick={openLoginModal}
                className="w-full h-11"
              >
                Sign In
              </Button>
              <Button
                onClick={openSignupModal}
                variant="outline"
                className="w-full h-11"
              >
                Create Account
              </Button>
            </div>

            {/* Features */}
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-4">
                With an account you can:
              </p>
              <ul className="text-sm text-left space-y-2">
                {[
                  "Send and receive messages",
                  "Add friends and connections",
                  "Customize your profile",
                  "Save your chat history",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* TalkMe Branding */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              T
            </div>
            <span className="text-sm font-medium text-muted-foreground">TalkMe</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
