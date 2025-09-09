"use client"

import { useEffect, useState } from 'react'

export default function LearningPage() {
  const [notify, setNotify] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        const res = await fetch('/api/public/profile')
        if (res.ok) {
          const data = await res.json()
          if (!ignore) setNotify(!!data?.learning_notify)
        }
      } catch {}
    }
    load()
    return () => { ignore = true }
  }, [])
  const toggle = async () => {
    const v = !notify
    setNotify(v)
    setSaving(true)
    try {
      await fetch('/api/public/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ learning_notify: v }) })
    } catch {}
    setSaving(false)
  }
  return (
    <div className="p-6">
      <div className="rounded-2xl border border-border bg-card p-8">
        <h1 className="text-3xl font-bold tracking-tight">NGI Learning Center - Coming Soon</h1>
        <p className="text-muted-foreground mt-2">Foundations of M&A, PE/VC, valuation, and diligence. Launching Q4.</p>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={toggle} className={`px-4 py-2 rounded-md text-sm ${notify ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`} disabled={saving}>
            {saving ? 'Saving...' : (notify ? 'Notifications enabled' : 'Notify me when live')}
          </button>
          <a className="text-sm underline" href="/projects">Explore projects</a>
        </div>
      </div>
    </div>
  )
}
