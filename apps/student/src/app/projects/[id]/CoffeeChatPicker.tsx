"use client"

import { useEffect, useMemo, useState } from 'react'
import { getCoffeeAvailability, createCoffeeRequest, listMyCoffeeRequests, type PublicCoffeeSlot } from '@/lib/api'
import { postEvent } from '@/lib/telemetry'

type Req = { id:number; start_ts:string; end_ts:string; status:string; created_at:string; cooldown_until_ts?:string; blacklist_until_ts?:string }

function toPSTDate(ts: string): Date {
  // Create a Date object for the timestamp; JS stores in UTC, we'll format in PT
  return new Date(ts)
}

function formatPST(d: Date, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', ...opts }).format(d)
}

export default function CoffeeChatPicker() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [slots, setSlots] = useState<PublicCoffeeSlot[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string>('')
  const [pending, setPending] = useState<Req | null>(null)

  // Load availability + existing requests
  useEffect(() => {
    let ignore = false
    setLoading(true)
    Promise.all([
      getCoffeeAvailability().catch(()=>({ slots: [] as PublicCoffeeSlot[] })),
      listMyCoffeeRequests().catch(()=>[] as any[]),
    ]).then(([avail, reqs]) => {
      if (ignore) return
      setSlots(avail.slots || [])
      const p = (reqs as Req[]).find(r => (r.status||'').toLowerCase() === 'pending') || null
      setPending(p || null)
    }).catch(() => {
      if (ignore) return
      setError('Could not load availability')
    }).finally(() => setLoading(false))
    return () => { ignore = true }
  }, [])

  const grouped = useMemo(() => {
    const m = new Map<string, PublicCoffeeSlot[]>()
    for (const s of (slots||[])) {
      const d = formatPST(toPSTDate(s.start_ts), { year:'numeric', month:'2-digit', day:'2-digit' }) // MM/DD/YYYY
      const [mm,dd,yyyy] = d.split('/')
      const key = `${yyyy}-${mm}-${dd}`
      if (!m.has(key)) m.set(key, [])
      m.get(key)!.push(s)
    }
    // sort each day's slots by time
    m.forEach(arr => arr.sort((a,b) => new Date(a.start_ts).getTime() - new Date(b.start_ts).getTime()))
    return m
  }, [slots])

  // Build a simple month view from the first slot or today
  const baseDate = useMemo(() => {
    const today = new Date()
    if ((slots||[]).length === 0) return today
    const min = slots.reduce((acc, s) => Math.min(acc, new Date(s.start_ts).getTime()), Number.MAX_SAFE_INTEGER)
    return new Date(min)
  }, [slots])

  const [monthOffset, setMonthOffset] = useState(0)
  const monthDate = useMemo(() => {
    const d = new Date(baseDate)
    d.setDate(1)
    d.setMonth(d.getMonth() + monthOffset)
    return d
  }, [baseDate, monthOffset])

  const days = useMemo(() => {
    const first = new Date(monthDate)
    const year = first.getFullYear()
    const month = first.getMonth()
    const startWeekday = new Date(year, month, 1).getDay() // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: Array<{ key:string; label:string; has:boolean; iso:string } | null> = []
    for (let i=0;i<startWeekday;i++) cells.push(null)
    for (let day=1; day<=daysInMonth; day++) {
      const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      cells.push({ key: iso, label: String(day), has: grouped.has(iso), iso })
    }
    return { cells, title: formatPST(first, { month:'long', year:'numeric' }) }
  }, [monthDate, grouped])

  const onRequest = async (s: PublicCoffeeSlot) => {
    if (pending) { setMessage('You already have a pending request.'); return }
    setSubmitting(true)
    setMessage('')
    try {
      await createCoffeeRequest({ start_ts: s.start_ts, end_ts: s.end_ts, slot_len_min: s.slot_len_min })
      postEvent('project_coffeechat_request', { start_ts: s.start_ts, end_ts: s.end_ts })
      setMessage('Request submitted. You will receive an email invite if accepted.')
      setPending({ id: 0, start_ts: s.start_ts, end_ts: s.end_ts, status: 'pending', created_at: new Date().toISOString() })
    } catch (e:any) {
      setMessage(e?.message || 'Failed to request chat')
    } finally {
      setSubmitting(false)
    }
  }

  const slotsForSelected = useMemo(() => selectedDate && grouped.get(selectedDate) || [], [selectedDate, grouped])

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3" role="region" aria-label="Coffee chat picker">
      <div className="text-sm font-medium">Coffee Chat</div>
      <div className="text-xs text-muted-foreground">Pick a time (All times PT)</div>
      {loading ? (
        <div className="text-xs text-muted-foreground">Loading availability…</div>
      ) : error ? (
        <div className="text-xs text-red-500">{error}</div>
      ) : (
        <>
          {pending && (
            <div className="p-2 text-xs bg-amber-100 text-amber-800 rounded">Pending request for {formatPST(toPSTDate(pending.start_ts), { month:'short', day:'2-digit', hour:'numeric', minute:'2-digit' })}</div>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button className="chip" aria-label="Previous month" onClick={()=>setMonthOffset(o=>o-1)}>&lt;</button>
              <div className="text-sm font-medium" aria-live="polite">{days.title}</div>
              <button className="chip" aria-label="Next month" onClick={()=>setMonthOffset(o=>o+1)}>&gt;</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="text-muted-foreground">{d}</div>)}
              {days.cells.map((c, idx) => (
                c ? (
                  <button key={c.key}
                    aria-label={`Select date ${c.iso}`}
                    aria-disabled={!c.has}
                    disabled={!c.has}
                    onClick={()=>setSelectedDate(c.iso)}
                    className={`p-2 rounded ${c.has ? 'hover:bg-muted' : 'text-muted-foreground'} ${selectedDate===c.iso ? 'ring-2 ring-[hsl(var(--ring))]' : ''}`}
                  >{c.label}</button>
                ) : (<div key={`empty-${idx}`} />)
              ))}
            </div>
          </div>
          {selectedDate && (
            <div className="mt-3">
              <div className="text-xs text-muted-foreground mb-1">Available times on {selectedDate}</div>
              <div className="flex flex-wrap gap-2">
                {slotsForSelected.map((s, i) => (
                  <button key={i} disabled={!!pending || submitting}
                    aria-label={`Request chat at ${formatPST(toPSTDate(s.start_ts), { hour:'numeric', minute:'2-digit' })} PT`}
                    onClick={()=>onRequest(s)}
                    className={`chip ${pending ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >{formatPST(toPSTDate(s.start_ts), { hour:'numeric', minute:'2-digit' })}</button>
                ))}
                {slotsForSelected.length === 0 && (
                  <div className="text-xs text-muted-foreground">No times available on this date.</div>
                )}
              </div>
            </div>
          )}
          {!!message && <div className="text-xs text-foreground">{message}</div>}
        </>
      )}
    </div>
  )
}
