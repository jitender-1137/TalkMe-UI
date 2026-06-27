import type { Metadata, Viewport } from 'next'
import { QueryProvider, ImageViewerProvider, VideoPlayerProvider, CreatePostProvider, ConfirmProvider } from '@/components/providers'
import { PresenceProvider } from '@/components/presence'
import { Toaster } from '@/components/ui/sonner'
import { ZoomPreventer } from '@/components/zoom-preventer'
import { NativeEnv } from '@/components/app-shell/native-env'
import { SharedPostOpener } from '@/components/feed/shared-post-opener'
import { PendingPostOpener } from '@/components/feed/pending-post-opener'
import { InstallFullscreenPrompt } from '@/components/pwa/install-fullscreen-prompt'
import { PwaRegister } from '@/components/pwa-register'
import { OrganizationJsonLd, WebSiteJsonLd, SoftwareAppJsonLd } from '@/components/seo/json-ld'
import { siteConfig, SITE_URL } from '@/lib/seo/site'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Required for env(safe-area-inset-*) to report real values on notched /
  // Dynamic Island devices — without this every inset resolves to 0 (spec §2).
  viewportFit: 'cover',
  // Android/Chrome: the on-screen keyboard resizes the layout viewport (so a
  // fixed, viewport-height chat container shrinks above the keyboard instead of
  // being overlaid). iOS ignores this — handled via VisualViewport in chat-area.
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f8fa' },
    { media: '(prefers-color-scheme: dark)',  color: '#1a1b1e' },
  ],
}

export const metadata: Metadata = {
  // metadataBase makes every relative OG/canonical URL resolve to an absolute
  // https URL — required for valid social cards and canonical tags.
  metadataBase: new URL(SITE_URL),
  title: {
    default: siteConfig.title,
    // Subpages render as "Page Title · TalkMe" automatically.
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.author, url: SITE_URL }],
  creator: siteConfig.author,
  publisher: siteConfig.author,
  manifest: '/manifest.json',
  // The homepage is the canonical for "/" — prevents duplicate-URL dilution
  // from query strings, hash routes, and www/non-www variants.
  alternates: {
    canonical: '/',
  },
  // Tell crawlers exactly how to index. Defaults are permissive; we just make
  // intent explicit and unlock large image/snippet previews.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    url: SITE_URL,
    locale: siteConfig.locale,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: siteConfig.title,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
    site: siteConfig.twitterHandle,
    creator: siteConfig.twitterHandle,
    images: ['/opengraph-image'],
  },
  category: 'social',
  generator: 'Next.js',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TalkMe',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    apple: '/apple-icon.png',
  },
  // Paste the token from Google Search Console (Settings → Ownership →
  // HTML tag) here to verify the property. Leave empty until you have it.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <body className="font-sans antialiased overflow-hidden overscroll-none touch-manipulation">
        {/* Capture Chrome/Android's `beforeinstallprompt` as EARLY as possible —
            it commonly fires before React mounts, so a listener attached inside a
            component would miss it and the one-tap Install button would never show
            (falling back to manual steps). This inline script runs at parse time,
            stashes the deferred event on window.__tmBip, and emits "tm:bip" so the
            install popup can light up its Install button. See
            components/pwa/install-fullscreen-prompt.tsx. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){window.__tmBip=null;window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__tmBip=e;try{window.dispatchEvent(new Event('tm:bip'))}catch(_){}}); window.addEventListener('appinstalled',function(){window.__tmBip=null;});})();",
          }}
        />
        <OrganizationJsonLd />
        <WebSiteJsonLd />
        <SoftwareAppJsonLd />
        <ZoomPreventer />
        <NativeEnv />
        <PwaRegister />
        <QueryProvider>
          <PresenceProvider>
            <ImageViewerProvider>
              <VideoPlayerProvider>
                <CreatePostProvider>
                  <ConfirmProvider>
                    {children}
                  </ConfirmProvider>
                  <SharedPostOpener />
                  <PendingPostOpener />
                  <InstallFullscreenPrompt />
                  <Toaster />
                </CreatePostProvider>
              </VideoPlayerProvider>
            </ImageViewerProvider>
          </PresenceProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
