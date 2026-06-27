import Link from "next/link"
import { MessageCircle, Users, Newspaper, Compass, Shield, Zap } from "lucide-react"
import { FaqJsonLd } from "@/components/seo/json-ld"
import { EnterAppLink } from "./enter-app-link"
import { siteConfig } from "@/lib/seo/site"

// Server component (NO "use client") — all of this copy ships in the initial
// HTML, so it is fully crawlable. Shared by the homepage gate at "/" and by
// the standalone /welcome route.
//
// The "Open app" CTAs link to "/?app=1": the HomeGate at "/" reads that param
// (or the persisted entry flag) and mounts the real app shell. From /welcome it
// navigates home and opens the app in one click.

export const landingFaqs = [
  {
    question: "Is TalkMe free to use?",
    answer:
      "Yes. TalkMe is completely free to chat, meet new people, and use the news feed. There is no cost to create an account or start a conversation.",
  },
  {
    question: "Do I need to download an app to use TalkMe?",
    answer:
      "No. TalkMe works directly in your web browser. You can also install it as a Progressive Web App on iOS and Android for a full-screen, native-like experience.",
  },
  {
    question: "How does meeting new people work?",
    answer:
      "TalkMe instantly matches you with someone new to talk to. Matches stay anonymous until both people choose to connect further, so you can chat comfortably and safely.",
  },
  {
    question: "Is my data private and secure?",
    answer:
      "Yes. Matchmaking partners stay anonymous, and you control your account at all times. If you delete your account, it enters a 30-day recovery window before being permanently removed.",
  },
]

const features = [
  {
    icon: MessageCircle,
    title: "Real-time messaging",
    body: "Instant, reliable chat with typing indicators, read receipts, and presence — your conversations stay in sync across every device.",
  },
  {
    icon: Compass,
    title: "Meet new people",
    body: "Get matched with new people instantly. TalkMe pairs you with someone to talk to in seconds, so there's always a fresh conversation waiting.",
  },
  {
    icon: Users,
    title: "Friends & connections",
    body: "Build your circle. Add friends, manage connections, and pick up right where you left off with the people who matter.",
  },
  {
    icon: Newspaper,
    title: "Live news feed",
    body: "Share posts and stay in the loop with a personalized feed of updates from everyone you follow.",
  },
  {
    icon: Shield,
    title: "Private by design",
    body: "Your matches stay anonymous until you choose otherwise, and your account is yours — delete it anytime with a 30-day grace period.",
  },
  {
    icon: Zap,
    title: "No download needed",
    body: "TalkMe runs right in your browser and installs as an app on iOS and Android. Open it and start talking — that's it.",
  },
]

export function LandingPage() {
  return (
    <main className="h-screen overflow-y-auto bg-background text-foreground">
      <FaqJsonLd items={landingFaqs} />

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-16 text-center">
        <p className="mb-4 inline-block rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground">
          Free real-time chat &amp; meeting app
        </p>
        <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
          Chat, meet new people &amp; make friends on TalkMe
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl">
          TalkMe is a modern messaging app that lets you talk to friends, get
          matched with new people instantly, and follow a live news feed — all
          in one place, right from your browser.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <EnterAppLink
            className="rounded-xl bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            Start chatting free
          </EnterAppLink>
          <Link
            href="#features"
            className="rounded-xl border border-border bg-card px-7 py-3.5 text-base font-semibold transition hover:bg-secondary"
          >
            See features
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Everything you need to connect
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          One app for messaging friends, meeting strangers, and keeping up with
          your network.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-2xl border border-border bg-card p-6 text-left"
            >
              <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-6" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Start talking in three steps
        </h2>
        <ol className="mx-auto mt-12 grid max-w-3xl gap-8 sm:grid-cols-3">
          {[
            { n: "1", t: "Open TalkMe", d: "Launch it in your browser or install the app — no signup wall to look around." },
            { n: "2", t: "Match or message", d: "Get paired with someone new instantly, or jump straight into chats with friends." },
            { n: "3", t: "Keep the conversation going", d: "Add friends, share posts, and pick up every chat right where you left off." },
          ].map((s) => (
            <li key={s.n} className="text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                {s.n}
              </span>
              <h3 className="mt-4 font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Frequently asked questions
        </h2>
        <dl className="mt-12 divide-y divide-border">
          {landingFaqs.map((f) => (
            <div key={f.question} className="py-6">
              <dt className="text-lg font-semibold">{f.question}</dt>
              <dd className="mt-2 text-muted-foreground">{f.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-24 pt-8 text-center">
        <div className="rounded-3xl border border-border bg-card p-10 sm:p-14">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to meet someone new?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Join TalkMe and start chatting in seconds. It&apos;s free, runs
            anywhere, and there&apos;s always someone to talk to.
          </p>
          <EnterAppLink
            className="mt-8 inline-block rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            Open TalkMe
          </EnterAppLink>
        </div>
        <footer className="mt-12 text-sm text-muted-foreground">
          <Link href="/blog" className="font-medium hover:text-foreground">
            Guides &amp; tips
          </Link>
          <p className="mt-3">
            © {siteConfig.name}. Chat, meet new people &amp; make friends online.
          </p>
        </footer>
      </section>
    </main>
  )
}
