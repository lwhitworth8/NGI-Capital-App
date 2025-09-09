"use client"
import { useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useUser } from '@clerk/nextjs'

export function ThemeHydrator(){
  const { user } = useUser()
  const { setTheme } = useTheme()
  useEffect(() => {
    try {
      const t = (user?.publicMetadata?.theme as string) || 'system'
      setTheme(t)
    } catch {}
  }, [user, setTheme])
  return null
}

