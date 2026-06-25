import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo/site"

// Required under `output: export` — prerender /sitemap.xml to a static file.
export const dynamic = "force-static"

/**
 * /sitemap.xml — the list of canonical, indexable URLs we want Google to crawl.
 * Keep this to genuinely public, content-bearing pages only. lastModified is a
 * fixed build-time date here; bump it when the page content meaningfully changes
 * so crawlers re-fetch.
 */
const lastModified = new Date("2026-06-25")

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      // "/" serves the crawlable landing page (and swaps to the app for
      // returning visitors). /welcome mirrors it but canonicalizes to "/", so
      // it is intentionally omitted here to avoid duplicate-URL signals.
      url: SITE_URL,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
  ]
}
