"use client"

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Clock, Send } from 'lucide-react'
import { toast } from 'sonner'

type Slot = { start_ts: string; end_ts: string; slot_len_min: number; type?: string }

export function CoffeeChatModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [slots, setSlots] = useState<Slot[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Slot | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [phase, setPhase] = useState<'idle'|'sending'|'confirmed'>('idle')

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!isOpen) return
      setLoading(true); setError(null)
      try {
        const res = await fetch('/api/public/coffeechats/availability')
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        if (mounted) setSlots(Array.isArray(data?.slots) ? data.slots : [])
      } catch (e) {
        if (mounted) setError('Could not load availability')
      } finally { if (mounted) setLoading(false) }
    }
    load(); return () => { mounted = false }
  }, [isOpen])

  const submitRequest = async () => {
    if (!selected) return
    setSubmitting(true); setPhase('sending')
    try {
      // Try to pass Clerk email header for dev/local where cookies aren't present
      let headers: Record<string,string> = { 'Content-Type': 'application/json' }
      try {
        const clerkUser = (window as any).Clerk?.user
        const email = clerkUser?.primaryEmailAddress?.emailAddress
        if (email) {
          headers['X-Student-Email'] = email
        } else {
          // Fallback for development when not authenticated
          headers['X-Student-Email'] = 'test@berkeley.edu'
        }
      } catch {
        // Fallback for development when not authenticated
        headers['X-Student-Email'] = 'test@berkeley.edu'
      }
      const res = await fetch('/api/public/coffeechats/requests', {
        method: 'POST',
        headers,
        body: JSON.stringify({ start_ts: selected.start_ts, end_ts: selected.end_ts, slot_len_min: selected.slot_len_min })
      })
      if (res.ok) {
        setPhase('confirmed')
        toast.success('Coffee chat requested. Watch your inbox for the calendar invite.')
      } else {
        const err = await res.json().catch(()=>({}))
        toast.error(err?.detail || 'Failed to request coffee chat')
      }
    } catch (e) {
      toast.error('Network error requesting coffee chat')
    } finally { setSubmitting(false) }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-5xl max-h-[85vh] bg-background rounded-2xl shadow-2xl overflow-hidden border border-border"
          >
            {/* Close */}
            <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/80 hover:bg-accent text-foreground backdrop-blur-sm transition-colors">
              <X className="w-5 h-5" />
            </button>
            {/* Scrollable */}
            <div className="overflow-y-auto max-h-[75vh] no-scrollbar">
              {/* Header */}
              <div className="p-8 pb-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-950/30 border-b border-border">
                <div className="flex items-center gap-2 text-foreground">
                  <Calendar className="w-5 h-5" />
                  <h2 className="text-2xl font-bold tracking-tight">Coffee Chat</h2>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Pick a time that works for you. Times are shown in your local timezone.</p>
              </div>
              {/* Body */}
              <div className="p-8 space-y-6">
                {loading && <div className="text-sm text-muted-foreground">Loading availability...</div>}
                {error && <div className="text-sm text-red-500">{error}</div>}
                {!loading && !error && phase !== 'confirmed' && (
                  <CalendarGrid slots={slots} selected={selected} onSelect={setSelected} />
                )}
                {phase === 'sending' && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-10 h-10 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mb-4" />
                    <div className="text-sm text-muted-foreground">Requesting your coffee chat and sending calendar invites…</div>
                  </div>
                )}
                {phase === 'confirmed' && (
                  <div className="space-y-3">
                    <div className="text-lg font-semibold">Coffee Chat Requested</div>
                    <p className="text-sm text-muted-foreground">We’ve queued your chat and sent calendar invites. Please accept the Google Calendar invite emailed to you. If you need to reschedule, email the project lead at least 24 hours in advance.</p>
                  </div>
                )}
              </div>
              {/* Footer */}
              <div className="p-8 pt-6 bg-muted/30 border-t border-border">
                <div className="flex items-center justify-end gap-3">
                  {phase !== 'confirmed' ? (
                    <>
                      <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-border bg-background text-foreground font-medium hover:bg-accent transition-colors">Cancel</button>
                      <button onClick={submitRequest} disabled={!selected || submitting} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                        {submitting ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Requesting...</>) : (<><Send className="w-4 h-4"/> Request Chat</>)}
                      </button>
                    </>
                  ) : (
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors">Close</button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function CalendarGrid({ slots, selected, onSelect }: { slots: Slot[]; selected: Slot | null; onSelect: (s: Slot)=>void }){
  // Build next 7 days skeleton and overlay slots
  const days = (() => {
    const start = new Date()
    start.setHours(0,0,0,0)
    const skeleton = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start); d.setDate(d.getDate()+i); return { key: d.toDateString(), date: d }
    })
    const map = new Map<string, Slot[]>()
    slots.forEach(s => { const k = new Date(s.start_ts).toDateString(); const arr = map.get(k)||[]; arr.push(s); map.set(k, arr) })
    return skeleton.map(s => ({ date: s.date, items: (map.get(s.key)||[]).sort((a,b)=> new Date(a.start_ts).getTime()-new Date(b.start_ts).getTime()) }))
  })()
  const fmt = (d: Date) => {
    const day = d.toLocaleDateString(undefined,{ weekday:'short' })
    const mon = d.toLocaleDateString(undefined,{ month:'short' })
    const n = d.getDate()
    const suf = (n%10===1 && n%100!==11)?'st':(n%10===2 && n%100!==12)?'nd':(n%10===3 && n%100!==13)?'rd':'th'
    return `${day}, ${mon} ${n}${suf}`
  }
  // Determine the max number of visible rows across days so columns align to same height
  const maxRows = Math.max(6, ...days.map(d => d.items.length))
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card/50 p-3">
        <div className="grid grid-cols-7 gap-2 text-xs">
          {days.map((d, idx) => (
            <div key={idx} className="border border-border rounded-lg overflow-hidden">
              <div className="px-2 py-1 bg-muted/50 border-b border-border font-semibold text-center whitespace-nowrap">
                {fmt(d.date)}
              </div>
            <div className="p-2 space-y-1">
              {d.items.length > 0 ? (
                d.items.map((s, i) => {
                  const isSel = selected?.start_ts === s.start_ts && selected?.end_ts === s.end_ts
                  return (
                    <button key={i} onClick={()=> onSelect(s)} className={`w-full px-2 py-1 rounded-lg border text-left transition-all shadow-sm hover:shadow ${isSel ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' : 'border-border hover:bg-accent'}`}>
                    <div className="flex items-center gap-2"><Clock className="w-3 h-3"/><span className="font-medium">{new Date(s.start_ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span></div>
                    </button>
                  )
                })
              ) : (
                // Skeleton hours to keep consistent height even with no slots
                Array.from({ length: maxRows }).map((_, i) => (
                  <div key={i} className="w-full px-2 py-1 rounded-lg border border-dashed border-border text-muted-foreground/60">
                    —
                  </div>
                ))
              )}
              {/* Add placeholders if this day has fewer items than maxRows to keep equal height */}
              {d.items.length > 0 && d.items.length < maxRows && Array.from({ length: maxRows - d.items.length }).map((_,i)=> (
                <div key={`pad-${i}`} className="w-full px-2 py-1 rounded-lg border border-dashed border-border text-transparent select-none">—</div>
              ))}
            </div>
          </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Hide scrollbars globally for elements tagged with no-scrollbar
if (typeof document !== 'undefined') {
  const id = 'no-scrollbar-style'
  if (!document.getElementById(id)){
    const style = document.createElement('style')
    style.id = id
    style.innerHTML = `.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`
    document.head.appendChild(style)
  }
}
