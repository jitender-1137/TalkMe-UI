import type { Metadata, Viewport } from 'next'
import { QueryProvider, ImageViewerProvider, VideoPlayerProvider, CreatePostProvider } from '@/components/providers'
import { PresenceProvider } from '@/components/presence'
import { Toaster } from '@/components/ui/sonner'
import { ZoomPreventer } from '@/components/zoom-preventer'
import { NativeEnv } from '@/components/app-shell/native-env'
import { SharedPostOpener } from '@/components/feed/shared-post-opener'
import { InstallFullscreenPrompt } from '@/components/pwa/install-fullscreen-prompt'
import { PwaRegister } from '@/components/pwa-register'
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
  title: 'TalkMe - Connect & Chat',
  description: 'A premium modern messaging app to connect with friends and discover new people',
  generator: 'v0.app',
  manifest: '/manifest.json',
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
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <body className="font-sans antialiased overflow-hidden overscroll-none touch-manipulation">
        <ZoomPreventer />
        <NativeEnv />
        <PwaRegister />
        <QueryProvider>
          <PresenceProvider>
            <ImageViewerProvider>
              <VideoPlayerProvider>
                <CreatePostProvider>
                  {children}
                  <SharedPostOpener />
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
