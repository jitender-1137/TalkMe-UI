import {
  MessageCircle,
  Compass,
  Zap,
  Newspaper,
  Settings,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  id: string
  label: string
  icon: LucideIcon
  href: string
  badge?: number
}

export const navigationItems: NavItem[] = [
  { id: "chats", label: "Chats", icon: MessageCircle, href: "/chats" },
  { id: "discover", label: "Discover", icon: Compass, href: "/discover" },
  { id: "news", label: "News", icon: Newspaper, href: "/news" },
  { id: "match", label: "Connect", icon: Zap, href: "/match" },
  { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
]
