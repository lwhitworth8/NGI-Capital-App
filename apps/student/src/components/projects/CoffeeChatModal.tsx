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
    setSubmitting(true)
    try {
      const res = await fetch('/api/public/coffeechats/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_ts: selected.start_ts, end_ts: selected.end_ts, slot_len_min: selected.slot_len_min })
      })
      if (res.ok) {
        toast.success('Coffee chat requested! You will receive a calendar invite if accepted.')
        onClose()
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
            className="relative w-full max-w-3xl max-h-[90vh] bg-background rounded-2xl shadow-2xl overflow-hidden border border-border"
          >
            {/* Close */}
            <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/80 hover:bg-accent text-foreground backdrop-blur-sm transition-colors">
              <X className="w-5 h-5" />
            </button>
            {/* Scrollable */}
            <div className="overflow-y-auto max-h-[90vh]">
              {/* Header */}
              <div className="p-8 pb-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-950/30 border-b border-border">
                <div className="flex items-center gap-2 text-foreground">
                  <Calendar className="w-5 h-5" />
                  <h2 className="text-xl font-bold">Coffee Chat</h2>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Pick a time that works for you. Times are shown in your local timezone.</p>
              </div>
              {/* Body */}
              <div className="p-8 space-y-6">
                {loading && <div className="text-sm text-muted-foreground">Loading availability...</div>}
                {error && <div className="text-sm text-red-500">{error}</div>}
                {!loading && !error && (
                  <CalendarGrid slots={slots} selected={selected} onSelect={setSelected} />
                )}
              </div>
              {/* Footer */}
              <div className="p-8 pt-6 bg-muted/30 border-t border-border">
                <div className="flex items-center justify-end gap-3">
                  <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-border bg-background text-foreground font-medium hover:bg-accent transition-colors">Cancel</button>
                  <button onClick={submitRequest} disabled={!selected || submitting} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                    {submitting ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Requesting...</>) : (<><Send className="w-4 h-4"/> Request Chat</>)}
                  </button>
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
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-2 text-xs">
        {days.map((d, idx) => (
          <div key={idx} className="border border-border rounded-lg overflow-hidden">
            <div className="px-2 py-1 bg-muted/50 border-b border-border font-medium text-center">
              {d.date.toLocaleDateString(undefined,{ weekday:'short', month:'short', day:'numeric' })}
            </div>
            <div className="p-2 space-y-1 max-h-64 overflow-auto no-scrollbar">
              {d.items.length > 0 ? (
                d.items.map((s, i) => {
                  const isSel = selected?.start_ts === s.start_ts && selected?.end_ts === s.end_ts
                  return (
                    <button key={i} onClick={()=> onSelect(s)} className={`w-full px-2 py-1 rounded border text-left transition-colors ${isSel ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' : 'border-border hover:bg-accent'}`}>
                      <div className="flex items-center gap-2"><Clock className="w-3 h-3"/><span>{new Date(s.start_ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span></div>
                    </button>
                  )
                })
              ) : (
                // Skeleton hours to keep consistent height even with no slots
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="w-full px-2 py-1 rounded border border-dashed border-border text-muted-foreground/60">
                    —
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Hide scrollbars for WebKit/Firefox/Edge
// Using a global style injected once per component mount
if (typeof document !== 'undefined') {
  const cls = 'no-scrollbar'
  if (!document.getElementById('no-scrollbar-style')){
    const style = document.createElement('style')
    style.id = 'no-scrollbar-style'
    style.innerHTML = `
      .${cls}::-webkit-scrollbar{ display: none; }
      .${cls}{ -ms-overflow-style: none; scrollbar-width: none; }
    `
    document.head.appendChild(style)
  }
}
