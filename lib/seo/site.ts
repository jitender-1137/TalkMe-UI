/**
 * Single source of truth for everything SEO-related.
 *
 * The canonical origin is read from NEXT_PUBLIC_SITE_URL so it can differ per
 * environment (preview deploys, staging) without code changes. It MUST be the
 * full https origin with no trailing slash, e.g. https://talkme.fun
 */
const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://talkme.fun"

export const SITE_URL = rawSiteUrl.replace(/\/$/, "")

export const siteConfig = {
  name: "TalkMe",
  // Used as the metadata title template / OG site name.
  legalName: "TalkMe",
  url: SITE_URL,
  // <60 chars is the sweet spot before Google truncates in SERPs.
  title: "TalkMe — Chat, Meet New People & Make Friends",
  tagline: "Connect & Chat",
  // ~150–160 chars. This is your SERP sales pitch — lead with the value.
  description:
    "TalkMe is a free modern messaging app to chat with friends, meet new people, and join the conversation. Real-time chat, news feed, and instant matching — all in one place.",
  // Branded + category keywords this app can realistically rank for.
  keywords: [
    "TalkMe",
    "chat app",
    "messaging app",
    "chat with strangers",
    "meet new people",
    "make new friends online",
    "free chat app",
    "real time chat",
    "online messaging",
    "social chat platform",
    "random chat",
    "instant messaging app",
  ],
  locale: "en_US",
  twitterHandle: "@talkme",
  // Default social-share image (1200x630). Generated dynamically — see app/opengraph-image.tsx.
  ogImage: `${SITE_URL}/opengraph-image`,
  author: "TalkMe",
  themeColor: "#0a7d54",
} as const

/** Absolute URL helper — always feed canonical/OG fields absolute URLs. */
export function absoluteUrl(path = ""): string {
  if (!path) return SITE_URL
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`
}
