"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/nextjs'
import { AuthProvider } from '@/lib/auth'
import { AppProvider } from '@/lib/context/AppContext'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useUser } from '@clerk/nextjs'
import { apiClient } from '@/lib/api'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: (failureCount, error: any) => {
              // Don't retry on authentication errors
              if (error?.response?.status === 401 || error?.response?.status === 403) {
                return false
              }
              return failureCount < 3
            },
          },
          mutations: {
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem={true}
        storageKey="theme_preference"
        disableTransitionOnChange
      >
        <ClerkProvider 
          publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
          signInUrl={`${(process.env.NEXT_PUBLIC_STUDENT_BASE_URL || 'http://localhost:3001').replace(/\/$/, '')}/sign-in`}
          afterSignInUrl="/dashboard"
          afterSignOutUrl={(process.env.NEXT_PUBLIC_STUDENT_BASE_URL || 'http://localhost:3001')}
        >
          <AuthProvider>
            <ThemeHydrator />
            <AppProvider>
              {children}
              <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
            </AppProvider>
          </AuthProvider>
        </ClerkProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

function ThemeHydrator() {
  const { user } = useUser()
  const { setTheme } = useTheme()
  useEffect(() => {
    (async () => {
      try {
        // 1) Honor explicit saved preference first (localStorage)
        const ls = typeof window !== 'undefined' ? localStorage.getItem('theme_preference') : null
        if (ls === 'light' || ls === 'dark' || ls === 'system') {
          setTheme(ls as any)
          return
        }
        // 2) Try backend partner preferences
        try {
          const prefs = await apiClient.getPreferences()
          const t = (prefs?.theme as string) || 'system'
          setTheme(t as any)
          if (typeof window !== 'undefined') {
            localStorage.setItem('theme_preference', t as any)
          }
          return
        } catch {}
        // 3) Fallback to Clerk metadata if present
        const t = (user?.publicMetadata?.theme as string) || 'system'
        setTheme((['light','dark','system'] as string[]).includes(t) ? (t as any) : 'system')
      } catch {}
    })()
  }, [user, setTheme])
  return null
}
