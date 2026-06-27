import type { Metadata } from "next"
import Link from "next/link"
import { blogPosts } from "@/lib/blog/posts"
import { BreadcrumbJsonLd } from "@/components/seo/json-ld"
import { absoluteUrl } from "@/lib/seo/site"

// Server-rendered blog index — a crawlable hub that links to every article and
// builds topical authority around "chat / meet new people" themes.
export const metadata: Metadata = {
  title: "Guides — Chatting, Meeting People & Online Safety",
  description:
    "Guides and tips on chatting online, meeting new people, random chat, and staying safe — from the team behind TalkMe.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "TalkMe Guides — Chatting & Meeting People Online",
    description:
      "Guides on chatting online, meeting new people, random chat, and online safety.",
    url: absoluteUrl("/blog"),
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
}

export default function BlogIndexPage() {
  return (
    <main className="h-screen overflow-y-auto bg-background text-foreground">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: absoluteUrl("/") },
          { name: "Guides", url: absoluteUrl("/blog") },
        ]}
      />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <nav className="mb-8 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>{" "}
          / <span className="text-foreground">Guides</span>
        </nav>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Guides &amp; tips
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Everything about chatting online, meeting new people, and staying safe
          while you do it.
        </p>

        <ul className="mt-12 space-y-8">
          {blogPosts.map((post) => (
            <li key={post.slug}>
              <article className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-xl font-semibold">
                  <Link href={`/blog/${post.slug}`} className="hover:underline">
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {post.description}
                </p>
                <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <time dateTime={post.date}>
                    {new Date(post.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                  <span aria-hidden>·</span>
                  <span>{post.readingTimeMins} min read</span>
                </div>
                <Link
                  href={`/blog/${post.slug}`}
                  className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
                >
                  Read guide →
                </Link>
              </article>
            </li>
          ))}
        </ul>

        <div className="mt-16 rounded-2xl border border-border bg-card p-8 text-center">
          <h2 className="text-2xl font-bold">Ready to start chatting?</h2>
          <p className="mt-2 text-muted-foreground">
            Meet new people on TalkMe — free, anonymous, and right in your
            browser.
          </p>
          <a
            href="/app"
            className="mt-6 inline-block rounded-xl bg-primary px-7 py-3 font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Open TalkMe
          </a>
        </div>
      </div>
    </main>
  )
}
