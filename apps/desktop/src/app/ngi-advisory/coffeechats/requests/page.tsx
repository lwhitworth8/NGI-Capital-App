"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import {
  advisoryListCoffeeRequests,
  advisoryAcceptCoffeeRequest,
  advisoryProposeCoffeeRequest,
  advisoryCancelCoffeeRequest,
  advisoryCompleteCoffeeRequest,
  advisoryNoShowCoffeeRequest,
  advisoryExpireCoffeeRequests,
} from '@/lib/api'
import type { AdvisoryCoffeeRequest } from '@/types'

export default function AdvisoryCoffeeRequestsPage() {
  const { loading } = useAuth()
  const [items, setItems] = useState<AdvisoryCoffeeRequest[]>([])
  const [filter, setFilter] = useState<{ status?: string }>({})
  const [busy, setBusy] = useState(false)
  const [propose, setPropose] = useState<{ id: number; start_ts: string; end_ts: string } | null>(null)

  const load = async () => {
    const list = await advisoryListCoffeeRequests({ status: filter.status })
    setItems(list)
  }

  useEffect(() => { load() }, [])

  const act = async (fn: () => Promise<any>) => { setBusy(true); try { await fn(); await load() } finally { setBusy(false) } }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Coffee Chat Requests</h1>
        <div className="flex gap-2 items-center">
          <select className="px-3 py-2 border rounded bg-background text-sm" value={filter.status || ''}
            onChange={e=>setFilter(f=>({ ...f, status: e.target.value || undefined }))}>
            <option value="">All Statuses</option>
            {['pending','accepted','completed','canceled','no_show','expired'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="px-3 py-2 rounded border" onClick={load}>Apply</button>
          <button className="px-3 py-2 rounded border" onClick={()=>act(advisoryExpireCoffeeRequests)}>Run Expiry</button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-border">
              <th className="p-3">Student</th>
              <th className="p-3">Start</th>
              <th className="p-3">End</th>
              <th className="p-3">Status</th>
              <th className="p-3">Owner</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(i => (
              <tr key={i.id} className="border-b border-border">
                <td className="p-3">{i.student_email}</td>
                <td className="p-3">{new Date(i.start_ts).toLocaleString()}</td>
                <td className="p-3">{new Date(i.end_ts).toLocaleString()}</td>
                <td className="p-3">{i.status}</td>
                <td className="p-3">{i.claimed_by || '-'}</td>
                <td className="p-3 flex gap-2">
                  <button className="px-2 py-1 rounded border" disabled={busy} onClick={()=>act(()=>advisoryAcceptCoffeeRequest(i.id))}>Accept</button>
                  <button className="px-2 py-1 rounded border" disabled={busy} onClick={()=>setPropose({ id: i.id, start_ts: i.start_ts, end_ts: i.end_ts })}>Propose</button>
                  <button className="px-2 py-1 rounded border" disabled={busy} onClick={()=>act(()=>advisoryCancelCoffeeRequest(i.id))}>Cancel</button>
                  <button className="px-2 py-1 rounded border" disabled={busy} onClick={()=>act(()=>advisoryCompleteCoffeeRequest(i.id))}>Complete</button>
                  <button className="px-2 py-1 rounded border" disabled={busy} onClick={()=>act(()=>advisoryNoShowCoffeeRequest(i.id))}>No?show</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (<tr><td className="p-3 text-muted-foreground" colSpan={6}>No requests.</td></tr>)}
          </tbody>
        </table>
      </div>

      {propose && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="text-sm font-medium">Propose New Time</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input type="datetime-local" className="px-3 py-2 border rounded bg-background text-sm" value={propose.start_ts}
              onChange={e=>setPropose(p=>p ? ({ ...p, start_ts: e.target.value }) : p)} />
            <input type="datetime-local" className="px-3 py-2 border rounded bg-background text-sm" value={propose.end_ts}
              onChange={e=>setPropose(p=>p ? ({ ...p, end_ts: e.target.value }) : p)} />
            <button className="px-3 py-2 rounded bg-blue-600 text-white" disabled={busy}
              onClick={()=>propose && act(()=>advisoryProposeCoffeeRequest(propose.id, { start_ts: propose.start_ts, end_ts: propose.end_ts })).then(()=>setPropose(null))}>Save</button>
            <button className="px-3 py-2 rounded border" onClick={()=>setPropose(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

