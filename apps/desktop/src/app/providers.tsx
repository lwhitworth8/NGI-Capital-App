"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { ClerkProvider, useClerk, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs'
import { AuthProvider } from '@/lib/auth'
import { AppProvider } from '@/lib/context/AppContext'
import { useState, useEffect } from 'react'

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
        defaultTheme="light"
        enableSystem={false}
        storageKey="theme_preference"
        disableTransitionOnChange
      >
        <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
          {/* Gate the entire app behind Clerk auth to avoid pre-auth API calls */}
          <SignedIn>
            <AuthProvider>
              <ForceReauthOnLoad />
              <AppProvider>
                {children}
                <Toaster 
                  position="top-right" 
                  toastOptions={{
                    duration: 5000,
                  }}
                />
              </AppProvider>
            </AuthProvider>
          </SignedIn>
          <SignedOut>
            <RedirectToSignIn />
          </SignedOut>
        </ClerkProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

// Forces a fresh sign-in when a tab/window is opened.
// This avoids stale sessions causing 403/insufficient-permissions flicker.
function ForceReauthOnLoad() {
  // "use client" context is inherited; this file is already client-side
  const { signOut } = useClerk()
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      // Default disabled to avoid unexpected redirects when navigating between routes
      const enabled = (process.env.NEXT_PUBLIC_FORCE_REAUTH_ON_LOAD || 'false').toLowerCase() === 'true'
      if (!enabled) return
      const onAuthRoute = /^\/(sign-in|sign-up)/.test(window.location.pathname)
      const done = sessionStorage.getItem('ngi_force_reauth_done') === '1'
      if (done || onAuthRoute) return
      sessionStorage.setItem('ngi_force_reauth_done', '1')
      // Clear any app-local state
      try { localStorage.removeItem('user') } catch {}
      // Clear backend HttpOnly cookie session
      try { fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } catch {}
      // Sign out of Clerk (best effort)
      try { signOut().catch(() => {}) } catch {}
      // Redirect to Clerk sign-in
      window.location.href = '/sign-in'
    } catch {}
  }, [signOut])
  return null
}
