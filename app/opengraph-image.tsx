import { ImageResponse } from "next/og"
import { siteConfig } from "@/lib/seo/site"

// Generates the 1200x630 social-share card at /opengraph-image. Prerendered to a
// static file at build time (works in both server and static-export modes).
// Required under `output: export` — forces this route to prerender to a static
// PNG at build time instead of being treated as a dynamic (on-request) route.
export const dynamic = "force-static"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = siteConfig.title

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #0a7d54 0%, #064e36 60%, #042b1f 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 130, fontWeight: 800, letterSpacing: -4 }}>
          {siteConfig.name}
        </div>
        <div
          style={{
            fontSize: 44,
            fontWeight: 500,
            marginTop: 12,
            opacity: 0.92,
            maxWidth: 900,
            textAlign: "center",
          }}
        >
          Chat, meet new people & make friends
        </div>
        <div
          style={{
            fontSize: 28,
            marginTop: 40,
            opacity: 0.7,
          }}
        >
          talkme.fun
        </div>
      </div>
    ),
    { ...size },
  )
}
