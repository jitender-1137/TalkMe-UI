import NewsDashboard from "@/components/news/news-dashboard"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "News | talkMe",
  description: "Stay updated with your friends",
}

export default function NewsPage() {
  return <NewsDashboard />
}
