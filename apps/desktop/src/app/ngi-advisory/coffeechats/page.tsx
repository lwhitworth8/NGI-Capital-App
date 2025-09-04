"use client"

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context/AppContext'
import { useAuth } from '@/lib/auth'
import { advisoryListCoffeechats, advisorySyncCoffeechats, apiClient } from '@/lib/api'
import type { AdvisoryCoffeeChat } from '@/types'

const BASE_ALLOWED = new Set([
  'lwhitworth@ngicapitaladvisory.com',
  'anurmamade@ngicapitaladvisory.com',
])

export default function AdvisoryCoffeechatsPage() {
  const { state } = useApp()
  const { user, loading } = useAuth()
  const entityId = useMemo(() => Number(state.currentEntity?.id || 0), [state.currentEntity])
    const [authCheckLoading, setAuthCheckLoading] = useState(true)
  const [serverEmail, setServerEmail] = useState('')
  const allowed = (() => {
    if ((process.env.NEXT_PUBLIC_ADVISORY_ALLOW_ALL || '').toLowerCase() === '1') return true
    const devAllow = process.env.NODE_ENV !== 'production' && (process.env.NEXT_PUBLIC_ADVISORY_DEV_OPEN || '1') === '1'
    const extra = (process.env.NEXT_PUBLIC_ADVISORY_ADMINS || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)
    const allowedSet = new Set<string>([...Array.from(BASE_ALLOWED), ...extra])
    let email = String(user?.email || '')
    if (!email && typeof window !== 'undefined') {
      const anyWin: any = window as any
      email = anyWin?.Clerk?.user?.primaryEmailAddress?.emailAddress
        || anyWin?.Clerk?.user?.emailAddresses?.[0]?.emailAddress
        || ''
      if (!email) {
        try { const u = JSON.parse(localStorage.getItem('user') || 'null'); if (u?.email) email = u.email } catch {}
      }
    }
    const emailLower = (email || '').toLowerCase()
    const serverLower = (serverEmail || '').toLowerCase()
    return devAllow || (!!emailLower && allowedSet.has(emailLower)) || (!!serverLower && allowedSet.has(serverLower))
  })()

  useEffect(() => {
    let mounted = true
    const check = async () => {
      try {
        const anyWin: any = typeof window !== 'undefined' ? (window as any) : {}
        const localEmail = String(
          user?.email
          || anyWin?.Clerk?.user?.primaryEmailAddress?.emailAddress
          || anyWin?.Clerk?.user?.emailAddresses?.[0]?.emailAddress
          || (JSON.parse((typeof window !== 'undefined' ? localStorage.getItem('user') || 'null' : 'null')) || {}).email
          || ''
        ).toLowerCase()
        if (!localEmail && !serverEmail) {
          try { const me = await apiClient.getProfile(); if (mounted) setServerEmail(me?.email || '') } catch {}
        }
      } finally { if (mounted) setAuthCheckLoading(false) }
    }
    check(); return () => { mounted = false }
  }, [user?.email, serverEmail])
  const [items, setItems] = useState<AdvisoryCoffeeChat[]>([])
  const [filter, setFilter] = useState<{ status?: string; provider?: string }>({})

  const load = async () => {
    if (!entityId || !allowed) return
    const res = await advisoryListCoffeechats({ entity_id: entityId, status: filter.status as any, provider: filter.provider as any })
    setItems(res)
  }

  useEffect(() => { load() }, [entityId, allowed])

  const onSync = async () => {
    await advisorySyncCoffeechats()
    await load()
  }

  if (loading || authCheckLoading) return <div className="p-6">Loading…</div>
  if (!allowed) return <div className="p-6">Access restricted.</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Coffee Chats</h1>
        <div className="flex gap-2">
          <select className="px-3 py-2 border rounded bg-background text-sm" value={filter.provider || ''} onChange={e=>setFilter(f=>({ ...f, provider: e.target.value || undefined }))}>
            <option value="">All Providers</option>
            {['calendly','manual','other'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="px-3 py-2 border rounded bg-background text-sm" value={filter.status || ''} onChange={e=>setFilter(f=>({ ...f, status: e.target.value || undefined }))}>
            <option value="">All Statuses</option>
            {['scheduled','completed','canceled'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="px-3 py-2 rounded border" onClick={load}>Apply</button>
          <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={onSync}>Sync</button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-border">
              <th className="p-3">Invitee</th>
              <th className="p-3">Email</th>
              <th className="p-3">Start</th>
              <th className="p-3">End</th>
              <th className="p-3">Status</th>
              <th className="p-3">Provider</th>
              <th className="p-3">Topic</th>
            </tr>
          </thead>
          <tbody>
            {items.map(i => (
              <tr key={i.id} className="border-b border-border">
                <td className="p-3">{i.invitee_name || '-'}</td>
                <td className="p-3">{i.invitee_email || '-'}</td>
                <td className="p-3">{i.scheduled_start ? new Date(i.scheduled_start).toLocaleString() : '-'}</td>
                <td className="p-3">{i.scheduled_end ? new Date(i.scheduled_end).toLocaleString() : '-'}</td>
                <td className="p-3">{i.status}</td>
                <td className="p-3">{i.provider}</td>
                <td className="p-3">{i.topic || '-'}</td>
              </tr>
            ))}
            {items.length === 0 && (<tr><td className="p-3 text-sm text-muted-foreground" colSpan={7}>No coffee chats.</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

