import { siteConfig, absoluteUrl } from "@/lib/seo/site"

/**
 * JSON-LD structured data. This is how you become eligible for rich results and
 * how Google understands *what* TalkMe is (an app), *who* publishes it (an org),
 * and what your brand site-search looks like. Rendered as a plain <script> so it
 * is present in the server HTML for crawlers.
 *
 * Validate output with https://search.google.com/test/rich-results
 */
function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Content is fully static & trusted — safe to inline.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: siteConfig.legalName,
        url: siteConfig.url,
        logo: absoluteUrl("/icon-512.png"),
        description: siteConfig.description,
        sameAs: [
          // Add real profile URLs here — these strengthen entity recognition.
          // "https://twitter.com/talkme",
          // "https://www.instagram.com/talkme",
        ],
      }}
    />
  )
}

export function WebSiteJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: siteConfig.name,
        url: siteConfig.url,
        description: siteConfig.description,
        inLanguage: "en",
      }}
    />
  )
}

export function SoftwareAppJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: siteConfig.name,
        applicationCategory: "SocialNetworkingApplication",
        operatingSystem: "Web, iOS, Android",
        url: siteConfig.url,
        description: siteConfig.description,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      }}
    />
  )
}

export function FaqJsonLd({
  items,
}: {
  items: { question: string; answer: string }[]
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((it) => ({
          "@type": "Question",
          name: it.question,
          acceptedAnswer: { "@type": "Answer", text: it.answer },
        })),
      }}
    />
  )
}
