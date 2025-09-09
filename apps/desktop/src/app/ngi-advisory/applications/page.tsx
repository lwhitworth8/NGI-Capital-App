"use client"

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context/AppContext'
import { useAuth } from '@/lib/auth'
import { advisoryListApplications, advisoryUpdateApplication } from '@/lib/api'
// Kanban columns without full drag-and-drop for now; inline status change

const BASE_ALLOWED = new Set([
  'lwhitworth@ngicapitaladvisory.com',
  'anurmamade@ngicapitaladvisory.com',
])

type AppItem = { id: number; first_name?: string; last_name?: string; email?: string; status: string; created_at?: string }

const STATUSES = ['new','reviewing','interview','offer','rejected','withdrawn']

export default function AdvisoryApplicationsPage() {
  const { state } = useApp()
  const { user, loading } = useAuth()
  const entityId = useMemo(() => Number(state.currentEntity?.id || 0), [state.currentEntity])
  const [appsByStatus, setAppsByStatus] = useState<Record<string, AppItem[]>>({})
  const [fetching, setFetching] = useState(true)
  const [q, setQ] = useState('')
  const [view, setView] = useState<'kanban'|'table'>('kanban')

  const allowed = useMemo(() => {
    const allowAll = (process.env.NEXT_PUBLIC_ADVISORY_ALLOW_ALL || '').toLowerCase() === '1'
    const devAllow = process.env.NODE_ENV !== 'production' && (process.env.NEXT_PUBLIC_ADVISORY_DEV_OPEN || '1') === '1'
    const extra = (process.env.NEXT_PUBLIC_ADVISORY_ADMINS || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)
    const allowedSet = new Set<string>([...Array.from(BASE_ALLOWED), ...extra])
    const emailLower = String(user?.email || '').toLowerCase()
    return allowAll || devAllow || (!!emailLower && allowedSet.has(emailLower))
  }, [user?.email])

  useEffect(() => {
    let ignore = false
    const load = async () => {
      if (!entityId || !allowed) { setFetching(false); return }
      try {
        const list = await advisoryListApplications({ entity_id: entityId, q: q || undefined })
        const grouped: Record<string, AppItem[]> = {}
        for (const s of STATUSES) grouped[s] = []
        for (const a of list) {
          const st = (a.status || 'new').toLowerCase()
          const arr = grouped[st] || (grouped[st] = [])
          arr.push({ id: a.id, first_name: a.first_name, last_name: a.last_name, email: a.email, status: st, created_at: a.created_at })
        }
        if (!ignore) setAppsByStatus(grouped)
      } finally {
        if (!ignore) setFetching(false)
      }
    }
    load(); return () => { ignore = true }
  }, [entityId, allowed, q])

  const onMoveTo = async (appId: number, target: string) => {
    // Find and move locally first
    let from: string | null = null
    for (const s of Object.keys(appsByStatus)) {
      if (appsByStatus[s].some(a => a.id === appId)) { from = s; break }
    }
    if (!from) return
    if (from === target) return
    setAppsByStatus(prev => {
      const out: Record<string, AppItem[]> = {}
      for (const s of Object.keys(prev)) out[s] = prev[s].filter(a => a.id !== appId)
      const item = prev[from].find(a => a.id === appId)!
      out[target] = [{ ...item, status: target }, ...out[target]]
      return out
    })
    try {
      await advisoryUpdateApplication(appId, { status: target })
    } catch {
      // rollback on failure
      setAppsByStatus(prev => {
        const out: Record<string, AppItem[]> = {}
        for (const s of Object.keys(prev)) out[s] = prev[s].filter(a => a.id !== appId)
        const item: AppItem = { id: appId, status: from! }
        out[from!] = [item, ...out[from!]]
        return out
      })
    }
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (!allowed) return <div className="p-6">Access restricted.</div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
          <p className="text-sm text-muted-foreground">Drag cards to update stage</p>
        </div>
        <div className="flex items-center gap-2">
          <input className="px-3 py-2 border rounded-md bg-background" placeholder="Search name/email/school" value={q} onChange={e=>setQ(e.target.value)} />
          <div className="border rounded-md overflow-hidden">
            <button className={`px-3 py-2 text-sm ${view==='kanban'?'bg-muted':''}`} onClick={()=>setView('kanban')}>Kanban</button>
            <button className={`px-3 py-2 text-sm ${view==='table'?'bg-muted':''}`} onClick={()=>setView('table')}>Table</button>
          </div>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {STATUSES.map(st => (
            <Column key={st} title={label(st)} items={appsByStatus[st] || []} onMove={(id,target)=>onMoveTo(id, target)} />
          ))}
        </div>
      ) : (
        <TableView data={appsByStatus} onMove={onMoveTo} />
      )}
    </div>
  )
}

function Column({ title, items, onMove }: { title: string; items: AppItem[]; onMove: (id: number, target: string)=>void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 min-h-[320px]">
      <div className="text-sm font-medium mb-2">{title} <span className="text-muted-foreground">({items.length})</span></div>
      <div className="space-y-2">
        {items.map(it => (<Card key={it.id} item={it} onMove={onMove} />))}
        {items.length === 0 && <div className="text-xs text-muted-foreground">No items</div>}
      </div>
    </div>
  )
}

function Card({ item, onMove }: { item: AppItem; onMove: (id: number, target: string)=>void }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="text-sm font-medium">{(item.first_name||'') + ' ' + (item.last_name||'')}</div>
      <div className="text-xs text-muted-foreground">{item.email}</div>
      <div className="text-xs text-muted-foreground mt-1">{new Date(item.created_at||'').toLocaleString()}</div>
      <div className="mt-2">
        <select className="w-full px-2 py-1 text-sm bg-card border rounded-md" value={item.status} onChange={e=>onMove(item.id, e.target.value)}>
          {STATUSES.map(s => (<option key={s} value={s}>{label(s)}</option>))}
        </select>
      </div>
    </div>
  )
}

function TableView({ data, onMove }: { data: Record<string, AppItem[]>; onMove: (id: number, target: string)=>void }) {
  const rows: AppItem[] = []
  Object.keys(data).forEach(k => rows.push(...(data[k] || [])))
  return (
    <div className="rounded-xl border border-border bg-card overflow-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-3 py-2">Name</th>
            <th className="text-left px-3 py-2">Email</th>
            <th className="text-left px-3 py-2">Applied</th>
            <th className="text-left px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-b border-border">
              <td className="px-3 py-2">{`${r.first_name||''} ${r.last_name||''}`.trim() || '—'}</td>
              <td className="px-3 py-2">{r.email || '—'}</td>
              <td className="px-3 py-2">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
              <td className="px-3 py-2">
                <select className="px-2 py-1 text-sm bg-card border rounded-md" value={r.status} onChange={e=>onMove(r.id, e.target.value)}>
                  {STATUSES.map(s => (<option key={s} value={s}>{label(s)}</option>))}
                </select>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">No applications</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function label(s: string) {
  switch (s) {
    case 'new': return 'NEW'
    case 'reviewing': return 'REVIEWING'
    case 'interview': return 'INTERVIEW'
    case 'offer': return 'OFFER'
    case 'rejected': return 'REJECTED'
    case 'withdrawn': return 'WITHDRAWN'
    default: return s.toUpperCase()
  }
}
