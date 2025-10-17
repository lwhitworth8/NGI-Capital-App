"use client"

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { ModuleHeader } from '@ngi/ui/components/layout'

type MyProject = { id:number; project_code?:string; project_name:string; summary?:string; status:'active'|'past' }

export default function MyProjectsPage() {
  const { user } = useUser()
  const email = useMemo(() => user?.primaryEmailAddress?.emailAddress || process.env.NEXT_PUBLIC_MOCK_STUDENT_EMAIL || '', [user?.primaryEmailAddress?.emailAddress])
  const [items, setItems] = useState<MyProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/public/my-projects', { headers: email ? { 'X-Student-Email': email } : undefined })
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        if (!ignore) setItems(data)
      } catch (e: any) {
        if (!ignore) setError(e?.message || 'Failed to load')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    if (email) load(); else { setLoading(false) }
    return () => { ignore = true }
  }, [email])

  const active = items.filter(p => (p.status||'active') === 'active')
  const past = items.filter(p => (p.status||'active') !== 'active')

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Fixed header - consistent with Finance module */}
      <ModuleHeader 
        title="My Projects" 
        subtitle="Your assigned projects and tasks"
      />
      
      {/* Scrollable content area */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {loading && <div className="text-sm text-muted-foreground mt-2">Loading...</div>}
          {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
          <div className="mt-6">
            <h2 className="text-lg font-medium">Active Projects</h2>
            <div className="mt-2 grid md:grid-cols-2 gap-3">
              {active.map(p => (
                <div key={p.id} className="border rounded-xl p-4 bg-card">
                  <div className="text-sm text-muted-foreground">{p.project_code}</div>
                  <div className="text-base font-semibold">{p.project_name}</div>
                  <div className="text-sm text-muted-foreground mt-1">{p.summary || ''}</div>
                  <div className="mt-2">
                    <Link href={`/my-projects/${p.id}`} className="text-blue-600">Open</Link>
                  </div>
                </div>
              ))}
              {!loading && active.length === 0 && (
                <div className="text-sm text-muted-foreground">You have no active projects yet.</div>
              )}
            </div>
          </div>
          <div className="mt-8">
            <h2 className="text-lg font-medium">Past Projects</h2>
            <div className="mt-2 grid md:grid-cols-2 gap-3">
              {past.map(p => (
                <div key={p.id} className="border rounded-xl p-4 bg-card">
                  <div className="text-sm text-muted-foreground">{p.project_code}</div>
                  <div className="text-base font-semibold">{p.project_name}</div>
                  <div className="text-sm text-muted-foreground mt-1">{p.summary || ''}</div>
                  <div className="mt-2">
                    <Link href={`/my-projects/${p.id}`} className="text-blue-600">Open</Link>
                  </div>
                </div>
              ))}
              {!loading && past.length === 0 && (
                <div className="text-sm text-muted-foreground">No past projects.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}