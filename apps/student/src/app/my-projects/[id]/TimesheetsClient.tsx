"use client"

import { useEffect, useMemo, useState } from 'react'
import { getMyTimesheet, saveTimesheetEntry } from '@/lib/api'

function startOfWeekPT(d: Date): Date {
  // Create a PT-based start of week (Sunday)
  const dt = new Date(d)
  // Normalize to local then adjust day
  const day = dt.getDay()
  const diff = dt.getDate() - day
  const res = new Date(dt)
  res.setDate(diff)
  res.setHours(0,0,0,0)
  return res
}

function fmtISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth()+1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export default function TimesheetsClient({ projectId }: { projectId: number }) {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeekPT(new Date()))
  const [entries, setEntries] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  const days: { iso: string; label: string; date: Date }[] = useMemo(() => {
    const res: any[] = []
    for (let i=0; i<7; i++) {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      res.push({ date: d, iso: fmtISODate(d), label: d.toLocaleDateString(undefined, { weekday: 'short', month: '2-digit', day: '2-digit' }) })
    }
    return res
  }, [weekStart])

  const weekKey = useMemo(() => fmtISODate(weekStart), [weekStart])

  const load = async () => {
    setLoading(true)
    try {
      const ts = await getMyTimesheet(projectId, weekKey)
      const map: Record<string, number> = {}
      for (const d of days) map[d.iso] = 0
      for (const e of (ts.entries || [])) {
        if (e.day) map[e.day] = Number(e.hours || 0)
      }
      setEntries(map)
    } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [projectId, weekKey])

  const totalHours = Object.values(entries || {}).reduce((a,b)=>a + (Number(b)||0), 0)

  const changeWeek = (delta: number) => {
    const ns = new Date(weekStart)
    ns.setDate(weekStart.getDate() + delta*7)
    setWeekStart(startOfWeekPT(ns))
  }

  const onSaveDay = async (iso: string) => {
    setSaving(s => ({ ...s, [iso]: true }))
    try {
      const hours = Number(entries[iso] || 0)
      await saveTimesheetEntry(projectId, weekKey, { day: iso, hours })
      alert('Saved')
    } catch (e: any) {
      alert('Save failed: ' + (e?.message || ''))
    } finally {
      setSaving(s => ({ ...s, [iso]: false }))
    }
  }

  return (
    <div className="border rounded-xl p-4 bg-card text-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium">Timesheets</div>
        <div className="flex items-center gap-2">
          <button className="chip" onClick={()=>changeWeek(-1)}>{'<'}</button>
          <div aria-live="polite">Week of {weekStart.toLocaleDateString()}</div>
          <button className="chip" onClick={()=>changeWeek(1)}>{'>'}</button>
        </div>
      </div>
      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1">Day</th>
              <th className="py-1">Hours</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {days.map(d => (
              <tr key={d.iso} className="border-t">
                <td className="py-2">{d.label}</td>
                <td className="py-2">
                  <input
                    type="number"
                    min={0}
                    step={0.25}
                    value={Number(entries[d.iso] || 0)}
                    onChange={e=>setEntries(prev => ({ ...prev, [d.iso]: Number(e.target.value) }))}
                    className="border rounded px-2 py-1 w-28"
                  />
                </td>
                <td className="py-2">
                  <button className="px-3 py-1 rounded bg-primary text-primary-foreground" disabled={!!saving[d.iso]} onClick={()=>onSaveDay(d.iso)}>
                    {saving[d.iso] ? 'Saving…' : 'Save'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t">
              <td className="py-2 font-medium">Total</td>
              <td className="py-2 font-medium">{totalHours.toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  )
}

