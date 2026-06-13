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
            refetchOnWindowFocus: true,
            retry: (failureCount, error) => {
              // Do not retry on 401/403/404
              if (
                error &&
                typeof error === 'object' &&
                'status' in error
              ) {
                const status = (error as { status: number }).status
                if (status === 401 || status === 403 || status === 404) return false
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
