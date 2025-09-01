'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from './api'
import { Partner } from '@/types'
import { toast } from 'sonner'

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

  useEffect(() => {
    // Initialize from server session (cookie-based)
    const initAuth = async () => {
      try {
        // Prefer getCurrentUser if available (tests mock this); fall back to getProfile
        const anyApi: any = apiClient as any
        const profile = anyApi.getCurrentUser ? await anyApi.getCurrentUser() : await apiClient.getProfile()
        setUser(profile)
        localStorage.setItem('user', JSON.stringify(profile))
      } catch (error) {
        // Not authenticated
        localStorage.removeItem('user')
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)
      
      const res = await apiClient.login({ email, password })
      if ((res as any)?.access_token) {
        try { localStorage.setItem('auth_token', (res as any).access_token) } catch {}
        try { (globalThis as any).localStorage?.setItem?.('auth_token', (res as any).access_token) } catch {}
      }
      const anyApi: any = apiClient as any
      const me = anyApi.getCurrentUser ? await anyApi.getCurrentUser() : await apiClient.getProfile()
      setUser(me)
      localStorage.setItem('user', JSON.stringify(me))

      toast.success(`Welcome back, ${me.name}!`)
      return true
      
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Login failed')
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await apiClient.logout()
    } catch {}
    setUser(null)
    try { localStorage.removeItem('user') } catch {}
    try { localStorage.removeItem('auth_token') } catch {}
    try { (globalThis as any).localStorage?.removeItem?.('auth_token') } catch {}
    // Attempt Clerk sign-out and hard redirect to sign-in to avoid loops
    try {
      const anyWin: any = window as any
      if (anyWin?.Clerk?.signOut) {
        await anyWin.Clerk.signOut({ redirectUrl: '/sign-in' })
      }
    } catch {}
    try { window.location.replace('/sign-in') } catch { router.replace('/sign-in') }
    toast.info('Logged out successfully')
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
