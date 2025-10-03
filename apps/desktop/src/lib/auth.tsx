'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from './api'
import { Partner } from '@/types'
import { toast } from 'sonner'
import { useUser, useClerk } from '@clerk/nextjs'

interface AuthContextType {
  user: Partner | null
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<Partner | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { user: clerkUser, isLoaded } = useUser()
  const { openSignIn, signOut } = useClerk()

  useEffect(() => {
    const hydrate = async () => {
      try {
        if (isLoaded && clerkUser) {
          console.log('AuthProvider: Loading user data for', clerkUser.primaryEmailAddress?.emailAddress)
          
          // Normalize Clerk -> Partner-like shape for existing UI
          const p: Partner = {
            id: 0 as any,
            name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || (clerkUser.username || 'User'),
            email: clerkUser.primaryEmailAddress?.emailAddress || '',
            ownership_percentage: 0 as any,
          } as any
          setUser(p)
          
          // Enrich from backend /auth/me (Clerk-authenticated)
          try {
            const anyApi: any = apiClient as any
            const profile = anyApi.getCurrentUser ? await anyApi.getCurrentUser() : await apiClient.getProfile()
            if (profile && profile.email) {
              console.log('AuthProvider: Successfully loaded backend profile')
              setUser(profile)
            }
          } catch (err) {
            console.warn('AuthProvider: Could not load backend profile, using Clerk data', err)
            // Keep the Clerk-based user object if backend fails
          }
        } else if (isLoaded && !clerkUser) {
          console.log('AuthProvider: No Clerk user, clearing state')
          setUser(null)
        }
      } catch (err) {
        console.error('AuthProvider: Hydration error', err)
        setUser(null)
      } finally {
        if (isLoaded) {
          setLoading(false)
        }
      }
    }
    hydrate()
  }, [clerkUser, isLoaded])

  const login = async (_email: string, _password: string): Promise<boolean> => {
    // Unified auth: defer to Clerk sign-in
    try {
      openSignIn?.({})
      toast.info('Redirecting to secure sign-in...')
    } catch {
      // Fallback hard redirect
      const base = (process.env.NEXT_PUBLIC_STUDENT_BASE_URL || 'http://localhost:3001').replace(/\/$/, '')
      try { window.location.assign(`${base}/sign-in`) } catch { router.push(`${base}/sign-in`) }
    }
    return false
  }

  const logout = async () => {
    try { await apiClient.logout() } catch {}
    try { await signOut?.({ redirectUrl: (process.env.NEXT_PUBLIC_STUDENT_BASE_URL || 'http://localhost:3001') as string }) } catch {}
    setUser(null)
    toast.info('Signed out')
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
