'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from '@/components/theme-provider'
import { useState } from 'react'
import { WebSocketProvider } from './websocket-provider'
import { CallProvider } from './call-provider'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            // Realtime freshness comes from STOMP — refetching every query on
            // each window focus / network reconnect produced request bursts
            // that drained the backend rate limiter (429s). Disable both.
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: (failureCount, error) => {
              // Do not retry on auth/permission/not-found, and never retry on
              // 429 — retrying a rate-limited request only deepens the flood.
              if (
                error &&
                typeof error === 'object' &&
                'status' in error
              ) {
                const status = (error as { status: number }).status
                if (
                  status === 401 ||
                  status === 403 ||
                  status === 404 ||
                  status === 429
                )
                  return false
              }
              return failureCount < 2
            },
          },
          mutations: {
            retry: false,
          },
        },
      })
  )

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider>
          <CallProvider>
            {children}
          </CallProvider>
        </WebSocketProvider>
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        )}
      </QueryClientProvider>
    </ThemeProvider>
  )
}
