"use client"
import { useClerk } from '@clerk/nextjs'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function ForceLogoutOnLoad(){
  const { signOut } = useClerk()
  const pathname = usePathname() || ''

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const enabled = ((process.env.NEXT_PUBLIC_FORCE_LOGOUT_ON_LOAD || 'true') + '').toLowerCase() === 'true'
      if (!enabled) return
      // Don't trigger on auth flows to avoid loops
      const onAuth = /^\/(auth\/resolve)(\/|$)/.test(pathname)
      if (onAuth) return
      const done = sessionStorage.getItem('ngi_force_logout_done') === '1'
      if (done) return
      sessionStorage.setItem('ngi_force_logout_done', '1')
      try { localStorage.removeItem('user') } catch {}
      // Best-effort backend logout if present
      try { fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } catch {}
      try { signOut().catch(() => {}) } catch {}
      // Redirect to marketing homepage
      window.location.href = '/'
    } catch {}
  }, [pathname, signOut])

  return null
}
