import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { blogPosts, getPost } from "@/lib/blog/posts"
import {
  ArticleJsonLd,
  BreadcrumbJsonLd,
  FaqJsonLd,
} from "@/components/seo/json-ld"
import { absoluteUrl } from "@/lib/seo/site"

// Pre-build a page for every known post; reject unknown slugs (no on-demand
// rendering) so the route works under static export too.
export const dynamicParams = false

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return {}
  const url = absoluteUrl(`/blog/${post.slug}`)
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url,
      publishedTime: post.date,
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  const url = absoluteUrl(`/blog/${post.slug}`)

  return (
    <main className="h-screen overflow-y-auto bg-background text-foreground">
      <ArticleJsonLd
        title={post.title}
        description={post.description}
        url={url}
        datePublished={post.date}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: absoluteUrl("/") },
          { name: "Guides", url: absoluteUrl("/blog") },
          { name: post.title, url },
        ]}
      />
      {post.faqs && post.faqs.length > 0 && <FaqJsonLd items={post.faqs} />}

      <article className="mx-auto max-w-2xl px-6 py-16">
        <nav className="mb-8 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>{" "}
          /{" "}
          <Link href="/blog" className="hover:text-foreground">
            Guides
          </Link>
        </nav>

        <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
          {post.title}
        </h1>
        <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
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

        <div className="mt-10 space-y-5">
          {post.blocks.map((block, i) => {
            if (block.type === "h2") {
              return (
                <h2
                  key={i}
                  className="pt-4 text-2xl font-bold tracking-tight"
                >
                  {block.text}
                </h2>
              )
            }
            if (block.type === "ul") {
              return (
                <ul
                  key={i}
                  className="list-disc space-y-2 pl-6 text-muted-foreground"
                >
                  {block.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              )
            }
            return (
              <p key={i} className="leading-relaxed text-muted-foreground">
                {block.text}
              </p>
            )
          })}
        </div>

        {post.faqs && post.faqs.length > 0 && (
          <section className="mt-14">
            <h2 className="text-2xl font-bold tracking-tight">
              Frequently asked questions
            </h2>
            <dl className="mt-6 divide-y divide-border">
              {post.faqs.map((f) => (
                <div key={f.question} className="py-5">
                  <dt className="font-semibold">{f.question}</dt>
                  <dd className="mt-2 text-muted-foreground">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <div className="mt-14 rounded-2xl border border-border bg-card p-8 text-center">
          <h2 className="text-xl font-bold">Start chatting on TalkMe</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Meet new people instantly — free, anonymous, no download.
          </p>
          <a
            href="/app"
            className="mt-5 inline-block rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Open TalkMe
          </a>
        </div>

        <div className="mt-10">
          <Link href="/blog" className="text-sm font-semibold text-primary hover:underline">
            ← All guides
          </Link>
        </div>
      </article>
    </main>
  )
}
