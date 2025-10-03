"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { ClerkProvider } from '@clerk/nextjs'
import { AuthProvider } from '@/lib/auth'
import { AppProvider } from '@/lib/context/AppContext'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useUser, useClerk } from '@clerk/nextjs'
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
          mutations: { retry: 1 },
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
          afterSignInUrl="/admin/dashboard"
          afterSignOutUrl={(process.env.NEXT_PUBLIC_STUDENT_BASE_URL || 'http://localhost:3001')}
        >
          <AuthProvider>
            <ThemeHydrator />
            <AppProvider>
              <AuthGate>
                {children}
              </AuthGate>
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
        setTheme((['light', 'dark', 'system'] as string[]).includes(t) ? (t as any) : 'system')
      } catch {}
    })()
  }, [user, setTheme])
  return null
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser()
  const { signOut } = useClerk()
  const [authVerified, setAuthVerified] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Dev/E2E bypass
  const devBypass = (process.env.NODE_ENV !== 'production') && ((process.env.NEXT_PUBLIC_ADVISORY_DEV_OPEN || '1') === '1')
  
  // Check if current route is public (doesn't require auth)
  const isPublicRoute = typeof window !== 'undefined' && (
    window.location.pathname === '/sign-in' ||
    window.location.pathname.startsWith('/sign-in/') ||
    window.location.pathname === '/login' ||
    window.location.pathname === '/'
  )
  
  useEffect(() => {
    // Skip auth check for public routes
    if (isPublicRoute) {
      setVerifying(false)
      setAuthVerified(true)
      return
    }
    
    if (!isLoaded) {
      return
    }
    
    if (!isSignedIn && !devBypass) {
      setVerifying(false)
      setAuthVerified(false)
      // Let Clerk handle the redirect
      return
    }
    
    // Verify backend auth only for authenticated users on protected routes
    const verifyAuth = async () => {
      try {
        setVerifying(true)
        setError(null)
        
        // Get Clerk token
        const token = await user?.getToken?.()
        if (!token && !devBypass) {
          throw new Error('No authentication token available')
        }
        
        // Verify with backend
        const profile = await apiClient.getProfile()
        if (!profile || !profile.email) {
          throw new Error('Unable to load user profile')
        }
        
        setAuthVerified(true)
        setVerifying(false)
      } catch (err: any) {
        console.error('Auth verification failed:', err)
        setError(err?.message || 'Authentication failed')
        setVerifying(false)
        
        // If auth fails, sign out and redirect
        if (!devBypass) {
          setTimeout(() => {
            signOut({ redirectUrl: process.env.NEXT_PUBLIC_STUDENT_BASE_URL || 'http://localhost:3001' })
          }, 2000)
        }
      }
    }
    
    if (devBypass) {
      setAuthVerified(true)
      setVerifying(false)
    } else {
      verifyAuth()
    }
  }, [isLoaded, isSignedIn, user, devBypass, signOut, isPublicRoute])
  
  // Public routes - render immediately
  if (isPublicRoute) {
    return (
      <>
        {children}
        <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
      </>
    )
  }
  
  // Loading Clerk
  if (!isLoaded) {
    return <LoadingScreen message="Initializing Authentication" />
  }
  
  // Not signed in - let Clerk handle redirect
  if (!isSignedIn && !devBypass) {
    return <LoadingScreen message="Redirecting to Sign In" />
  }
  
  // Verifying backend auth
  if (verifying) {
    return <LoadingScreen message="Verifying Your Account" />
  }
  
  // Auth error
  if (error && !devBypass) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border border-destructive rounded-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Authentication Error</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <p className="text-xs text-muted-foreground">Redirecting to sign in...</p>
        </div>
      </div>
    )
  }
  
  // Authenticated and verified
  if (!authVerified && !devBypass) {
    return <LoadingScreen message="Loading Your Workspace" />
  }
  
  return (
    <>
      {children}
      <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
    </>
  )
}

function LoadingScreen({ message }: { message: string }) {
  const [dots, setDots] = useState('.')
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '.') return '..'
        if (prev === '..') return '...'
        return '.'
      })
    }, 500)
    
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center">
        <div className="inline-block w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium text-foreground">
          {message}
          <span className="inline-block w-8 text-left">{dots}</span>
        </p>
      </div>
    </div>
  )
}

