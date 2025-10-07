"use client"

import * as React from 'react'
import { Calendar, Clock, RefreshCcw, X, Plus } from 'lucide-react'
import { apiClient } from '@/lib/api'

export function CoffeeChatsPanel({ onClose, projectId }: { onClose: () => void; projectId?: number }){
  const [loading, setLoading] = React.useState(false)
  const [slots, setSlots] = React.useState<Array<{ start_ts:string; end_ts:string; slot_len_min:number; type?:string }>>([])
  const [error, setError] = React.useState<string|undefined>()
  const [blocks, setBlocks] = React.useState<Array<{ id:number; admin_email:string; start_ts:string; end_ts:string; slot_len_min:number }>>([])
  const [form, setForm] = React.useState<{ date:string; start:string; end:string; slot:number }>({ date:'', start:'09:00', end:'17:00', slot:30 })
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(async () =>{
    setLoading(true); setError(undefined)
    try{
      const pub = await apiClient.request<{ slots: Array<{ start_ts:string; end_ts:string; slot_len_min:number }> }>('GET','/public/coffeechats/availability')
      setSlots(pub?.slots || [])
    }catch(e){ setSlots([]) }
    try{
      const av = await apiClient.request<Array<{ id:number; admin_email:string; start_ts:string; end_ts:string; slot_len_min:number }>>('GET','/advisory/coffeechats/availability')
      setBlocks(av || [])
    }catch(e){ setError('Failed to load availability'); setBlocks([]) }
    finally{ setLoading(false) }
  },[])

  React.useEffect(()=>{ load() },[load])

  // Build a calendar grid (7 days x time rows) from slots
  const days = React.useMemo(() => {
    const start = new Date(); start.setHours(0,0,0,0)
    const skeleton = Array.from({ length: 7 }).map((_,i)=>{ const d=new Date(start); d.setDate(d.getDate()+i); return d })
    const m = new Map<string, Array<{ start:Date; end:Date; len:number; type?:string }>>()
    ;(slots||[]).forEach(s => {
      const st = new Date(s.start_ts); const key = st.toDateString()
      const arr = m.get(key) || []; arr.push({ start: st, end: new Date(s.end_ts), len: s.slot_len_min, type: s.type }); m.set(key, arr)
    })
    return skeleton.map(d => ({ date: d, slots: (m.get(d.toDateString())||[]).sort((a,b)=> a.start.getTime()-b.start.getTime()) }))
  },[slots])

  const addBlock = async () => {
    if (!form.date) return
    setSaving(true)
    try{
      const start_ts = `${form.date}T${form.start}:00`
      const end_ts = `${form.date}T${form.end}:00`
      await apiClient.request('POST','/advisory/coffeechats/availability', { start_ts, end_ts, slot_len_min: Number(form.slot) })
      await load()
    }catch(e){ setError('Failed to add availability') }
    finally{ setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 font-semibold"><Calendar className="w-4 h-4"/> Coffee Chats</div>
          <div className="flex items-center gap-2">
            <button className="text-sm inline-flex items-center gap-1 px-2 py-1 border rounded" onClick={load}><RefreshCcw className="w-3 h-3"/> Refresh</button>
            <button className="p-1 rounded hover:bg-accent" onClick={onClose}><X className="w-4 h-4"/></button>
          </div>
        </div>
        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-3">
            <div className="text-sm font-medium">Upcoming Public Slots (7 days)</div>
            {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
            {error && <div className="text-sm text-red-500">{error}</div>}
            {!loading && (
              <div className="grid grid-cols-7 gap-2 text-xs">
                {days.map((d, idx)=> (
                  <div key={idx} className="border border-border rounded-lg overflow-hidden">
                    <div className="px-2 py-1 bg-muted/50 border-b border-border font-medium text-center">
                      {d.date.toLocaleDateString(undefined,{ weekday:'short', month:'short', day:'numeric' })}
                    </div>
                    <div className="p-2 space-y-1 max-h-64 overflow-auto no-scrollbar">
                      {d.slots.map((s,i)=> (
                        <div key={i} className="px-2 py-1 rounded bg-background border border-border flex items-center gap-2">
                          <Clock className="w-3 h-3"/>
                          <span>{s.start.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
                        </div>
                      ))}
                      {d.slots.length===0 && Array.from({length:6}).map((_,i)=> (
                        <div key={i} className="px-2 py-1 rounded border border-dashed border-border text-muted-foreground/60">—</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="text-sm font-medium">Set My Availability</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label className="col-span-2">Date<input type="date" className="mt-1 w-full rounded border border-border bg-background px-2 py-1" value={form.date} onChange={e=> setForm(f=>({...f, date:e.target.value}))} /></label>
              <label>Start<input type="time" className="mt-1 w-full rounded border border-border bg-background px-2 py-1" value={form.start} onChange={e=> setForm(f=>({...f, start:e.target.value}))} /></label>
              <label>End<input type="time" className="mt-1 w-full rounded border border-border bg-background px-2 py-1" value={form.end} onChange={e=> setForm(f=>({...f, end:e.target.value}))} /></label>
              <label className="col-span-2">Slot length (min)<input type="number" min={10} step={5} className="mt-1 w-full rounded border border-border bg-background px-2 py-1" value={form.slot} onChange={e=> setForm(f=>({...f, slot:Number(e.target.value)||30}))} /></label>
              <button onClick={addBlock} disabled={saving || !form.date} className="col-span-2 inline-flex items-center justify-center gap-2 px-3 py-2 rounded border bg-background hover:bg-accent">{saving ? 'Saving...' : (<><Plus className="w-4 h-4"/> Add Block</>)}</button>
            </div>
            <div className="text-xs text-muted-foreground">Blocks apply across open/active projects. Students will only see free slots not overlapping your calendar.</div>
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">My Blocks</div>
              <div className="space-y-2 max-h-56 overflow-auto">
                {(blocks||[]).map(b=> (
                  <div key={b.id} className="text-xs p-2 rounded border border-border">
                    {new Date(b.start_ts).toLocaleString()} → {new Date(b.end_ts).toLocaleTimeString()} · {b.slot_len_min} min
                  </div>
                ))}
                {(blocks||[]).length===0 && <div className="text-xs text-muted-foreground">No blocks set.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
