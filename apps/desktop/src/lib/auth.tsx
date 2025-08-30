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
    // Check for existing auth on mount
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        const savedUser = localStorage.getItem('user')
        
        if (token && savedUser) {
          const userData = JSON.parse(savedUser)
          setUser(userData)
          apiClient.setAuthToken(token)
        }
      } catch (error) {
        // Clear invalid auth data
        localStorage.removeItem('auth_token')
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
      
      const response = await apiClient.login({ email, password })
      
      // Store user data
      const userData: Partner = {
        id: '0',
        name: response.partner?.name || response.partner_name || 'Partner',
        email: response.partner?.email || email,
        ownership_percentage: response.partner?.ownership_percentage || response.ownership_percentage || 50,
        capital_account_balance: 0,
        is_active: true,
        created_at: new Date().toISOString()
      }
      
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
      
      toast.success(`Welcome back, ${userData.name}!`)
      return true
      
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Login failed')
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    apiClient.logout()
    setUser(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    router.push('/login')
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