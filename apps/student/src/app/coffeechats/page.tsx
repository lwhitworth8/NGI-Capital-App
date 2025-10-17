"use client"

import { useEffect, useMemo, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { getCoffeeAvailability, createCoffeeRequest, listMyCoffeeRequests, type PublicCoffeeSlot } from '@/lib/api'
import { ModuleHeader } from '@ngi/ui/components/layout'

export default function CoffeeChatsPage() {
  const { user } = useUser()
  const [slots, setSlots] = useState<PublicCoffeeSlot[]>([])
  const [mine, setMine] = useState<any[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>('')

  const load = async () => {
    const a = await getCoffeeAvailability()
    setSlots(a.slots)
    try { const m = await listMyCoffeeRequests(); setMine(m) } catch {}
  }

  useEffect(() => { load() }, [])

  const onRequest = async (s: PublicCoffeeSlot) => {
    setBusy(true); setError('')
    try {
      await createCoffeeRequest({ start_ts: s.start_ts, end_ts: s.end_ts, slot_len_min: s.slot_len_min })
      await load()
    } catch (e: any) {
      try { setError(JSON.parse(e.message)?.detail || 'Failed to create request') } catch { setError('Failed to create request') }
    } finally { setBusy(false) }
  }

  const myPending = useMemo(() => mine.find(r => r.status === 'pending'), [mine])

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Fixed header - consistent with Finance module */}
      <ModuleHeader 
        title="Coffee Chats" 
        subtitle={`Hi ${user?.firstName || user?.primaryEmailAddress?.emailAddress}, pick a time below to request a coffee chat. Times are shown in your local timezone.`}
      />
      
      {/* Scrollable content area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-6">

      {error && <div className="text-sm text-red-600">{error}</div>}

      {myPending && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4">
          <div className="text-sm font-medium">Pending request</div>
          <div className="text-sm text-muted-foreground">{new Date(myPending.start_ts).toLocaleString()} - awaiting partner confirmation.</div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="p-3 text-left">Start</th>
              <th className="p-3 text-left">End</th>
              <th className="p-3 text-left">Length</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((s, idx) => (
              <tr key={`${s.start_ts}-${idx}`} className="border-b border-border">
                <td className="p-3">{new Date(s.start_ts).toLocaleString()}</td>
                <td className="p-3">{new Date(s.end_ts).toLocaleString()}</td>
                <td className="p-3">{s.slot_len_min} min</td>
                <td className="p-3">
                  <button className="px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50" disabled={busy || !!myPending} onClick={()=>onRequest(s)}>Request</button>
                </td>
              </tr>
            ))}
            {slots.length === 0 && (
              <tr><td colSpan={4} className="p-3 text-muted-foreground">No available slots. Check back soon.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
      </div>
    </div>
  )
}