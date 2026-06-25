import { NewsDashboard } from "@/components/feed"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "News | talkMe",
  description: "Stay updated with your friends",
  // In-app feed behind auth — renders a thin shell to crawlers. Keep it out of
  // the index so it can't compete with or dilute the landing page at "/".
  robots: { index: false, follow: false },
}

export default function NewsPage() {
  return <NewsDashboard />
}
