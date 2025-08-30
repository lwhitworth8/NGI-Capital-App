'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/context/AppContext'

export default function SettingsPage() {
  const router = useRouter()
  const { state, logout } = useApp()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    const name = state.user?.name || (typeof window !== 'undefined' ? localStorage.getItem('user_name') || '' : '')
    const em = state.user?.email || (typeof window !== 'undefined' ? localStorage.getItem('user_email') || '' : '')
    setDisplayName(name || 'User')
    setEmail(em || '')
  }, [state.user])

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Account Settings</h1>

      <div className="space-y-6">
        <div className="card-modern p-6">
          <h2 className="text-lg font-semibold mb-4">Profile</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{displayName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{email}</span></div>
          </div>
        </div>

        <div className="card-modern p-6">
          <h2 className="text-lg font-semibold mb-4">Session</h2>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  )
}

