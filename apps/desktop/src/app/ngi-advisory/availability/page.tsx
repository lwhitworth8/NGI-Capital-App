"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { advisoryListCoffeeAvailability, advisoryAddCoffeeAvailability, advisoryDeleteCoffeeAvailability } from '@/lib/api'

type Block = Awaited<ReturnType<typeof advisoryListCoffeeAvailability>>[number]

export default function AdvisoryAvailabilityPage() {
  const { loading } = useAuth()
  const [blocks, setBlocks] = useState<Block[]>([])
  const [form, setForm] = useState<{ start_ts: string; end_ts: string; slot_len_min: number }>({ start_ts: '', end_ts: '', slot_len_min: 30 })
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const list = await advisoryListCoffeeAvailability()
    setBlocks(list)
  }

  useEffect(() => { load() }, [])

  const onAdd = async () => {
    if (!form.start_ts || !form.end_ts) return
    setBusy(true)
    try {
      await advisoryAddCoffeeAvailability(form)
      setForm({ start_ts: '', end_ts: '', slot_len_min: 30 })
      await load()
    } finally { setBusy(false) }
  }

  const onDelete = async (id: number) => {
    setBusy(true)
    try { await advisoryDeleteCoffeeAvailability(id); await load() } finally { setBusy(false) }
  }

  if (loading) return <div className="p-6">Loading…</div>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Coffee Chat Availability</h1>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="text-sm font-medium">Add Availability Block</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input type="datetime-local" className="px-3 py-2 border rounded bg-background text-sm" value={form.start_ts}
            onChange={e=>setForm(f=>({...f, start_ts: e.target.value}))} />
          <input type="datetime-local" className="px-3 py-2 border rounded bg-background text-sm" value={form.end_ts}
            onChange={e=>setForm(f=>({...f, end_ts: e.target.value}))} />
          <select className="px-3 py-2 border rounded bg-background text-sm" value={form.slot_len_min}
            onChange={e=>setForm(f=>({...f, slot_len_min: parseInt(e.target.value||'30',10)}))}>
            {[15,30].map(n=> <option key={n} value={n}>{n} minutes</option>)}
          </select>
          <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={onAdd} disabled={busy}>Add</button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-border">
              <th className="p-3">Owner</th>
              <th className="p-3">Start</th>
              <th className="p-3">End</th>
              <th className="p-3">Slot</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map(b => (
              <tr key={b.id} className="border-b border-border">
                <td className="p-3">{b.admin_email}</td>
                <td className="p-3">{new Date(b.start_ts).toLocaleString()}</td>
                <td className="p-3">{new Date(b.end_ts).toLocaleString()}</td>
                <td className="p-3">{b.slot_len_min} min</td>
                <td className="p-3">
                  <button className="px-2 py-1 rounded border" onClick={()=>onDelete(b.id)} disabled={busy}>Delete</button>
                </td>
              </tr>
            ))}
            {blocks.length === 0 && (<tr><td colSpan={5} className="p-3 text-muted-foreground">No availability blocks.</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

