import type { Metadata } from "next"
import { LandingPage } from "@/components/landing/landing-page"
import { siteConfig, absoluteUrl } from "@/lib/seo/site"

// Standalone, always-crawlable landing route. Mirrors the homepage content so
// there is a stable indexable URL even though "/" swaps to the app for
// returning users. Canonical points at "/" to consolidate ranking signal.
export const metadata: Metadata = {
  title: "Chat, Meet New People & Make Friends Online",
  description:
    "TalkMe is a free real-time chat app to message friends, meet new people through instant matching, and follow a live news feed. Start chatting in seconds — no download required.",
  alternates: { canonical: "/" },
  openGraph: {
    title: `${siteConfig.name} — Chat, Meet New People & Make Friends`,
    description:
      "Free real-time chat app to message friends, meet new people, and join the conversation.",
    url: absoluteUrl("/welcome"),
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
}

export default function WelcomePage() {
  return <LandingPage />
}
