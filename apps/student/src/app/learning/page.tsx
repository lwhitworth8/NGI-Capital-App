"use client"

import { useEffect } from 'react'

export default function LearningPage() {
  // Optional lightweight telemetry: page view only; no PII
  useEffect(() => {
    const post = async () => {
      try {
        await fetch('/api/public/telemetry/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'page_view', payload: { route: '/learning' } })
        })
      } catch {}
    }
    post()
  }, [])

  return (
    <div className="relative overflow-hidden">
      {/* subtle background */}
      <div className="pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="relative p-8 md:p-16 min-h-[60vh] flex items-center">
        <div className="max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Student Learning - Coming Soon</h1>
          <p className="text-muted-foreground mt-3 text-base md:text-lg">
            We're building a focused learning experience for analysts. Stay tuned in upcoming releases.
          </p>
        </div>
      </div>
    </div>
  )
}
