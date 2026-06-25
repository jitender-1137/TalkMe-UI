import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo/site"

// Required under `output: export` — prerender /robots.txt to a static file.
export const dynamic = "force-static"

/**
 * /robots.txt — tells crawlers what to index. We expose the public marketing
 * surfaces and explicitly block the authenticated app routes and API: indexing
 * a login-gated SPA shell only produces thin/duplicate pages that dilute the
 * site's quality signal.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/welcome"],
        disallow: [
          "/api/",
          "/reset-password",
          "/news",
          "/settings",
          "/chats",
          "/friends",
          "/discover",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
