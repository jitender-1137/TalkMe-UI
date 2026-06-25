import { HomeGate } from "@/components/home/home-gate"
import { LandingPage } from "@/components/landing/landing-page"

// "/" server-renders the crawlable landing page, then HomeGate swaps in the app
// for returning visitors / CTA clicks. `LandingPage` is rendered on the server
// and passed in, so its full marketing HTML ships in the initial response.
export default function Page() {
  return <HomeGate landing={<LandingPage />} />
}
