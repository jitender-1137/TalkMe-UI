import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { QueryProvider, ImageViewerProvider, VideoPlayerProvider, CreatePostProvider } from '@/components/providers'
import { PresenceProvider } from '@/components/presence'
import { Toaster } from 'sonner'
import { ZoomPreventer } from '@/components/zoom-preventer'
import { PwaRegister } from '@/components/pwa-register'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        <PwaRegister />
        <QueryProvider>
          <PresenceProvider>
            <ImageViewerProvider>
              <VideoPlayerProvider>
                <CreatePostProvider>
                  {children}
                  <Toaster position="top-center" richColors closeButton />
                </CreatePostProvider>
              </VideoPlayerProvider>
            </ImageViewerProvider>
          </PresenceProvider>
        </QueryProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
