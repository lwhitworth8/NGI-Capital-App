'use client'

import { useEffect, useMemo, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { getMyTimesheet, saveTimesheetEntry, listMyTasks, type ProjectTask } from '@/lib/api'

function startOfWeek(d: Date) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = x.getUTCDay() // 0=Sun
  x.setUTCDate(x.getUTCDate() - day)
  return x
}

export default function TimesheetsPanel({ projectId }: { projectId: number }) {
  const { user } = useUser()
  const email = user?.primaryEmailAddress?.emailAddress || process.env.NEXT_PUBLIC_MOCK_STUDENT_EMAIL || ''
  const [weekStart, setWeekStart] = useState<string>(() => startOfWeek(new Date()).toISOString().slice(0,10))
  const [entries, setEntries] = useState<Record<string, number>>({})
  const [segmentsByDay, setSegmentsByDay] = useState<Record<string, Array<{ start?: string; end?: string; hours: number }>>>({})
  const [tasks, setTasks] = useState<ProjectTask[]>([])
  const [taskId, setTaskId] = useState<number | undefined>(undefined)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  const load = async () => {
    setLoading(true)
    try {
      const ts = await getMyTimesheet(projectId, weekStart)
      const map: Record<string, number> = {}
      const segs: Record<string, Array<{ start?: string; end?: string; hours: number }>> = {}
      const t = await listMyTasks(projectId)
      setTasks(t)
      const currentTask = taskId || (t.length ? t[0].id : undefined)
      if (!taskId && t.length) setTaskId(t[0].id)
      for (const e of ts.entries || []) {
        if (currentTask && e.task_id && Number(e.task_id) !== Number(currentTask)) continue
        const day = e.day
        const hrs = Number(e.hours || 0)
        map[day] = (map[day] || 0) + hrs
        let seg = [] as any[]
        try { seg = Array.isArray(e.segments) ? e.segments : [] } catch {}
        if (!segs[day]) segs[day] = []
        if (seg && seg.length) {
          for (const s of seg) segs[day].push({ start: s.start, end: s.end, hours: Number(s.hours || 0) })
        } else if (hrs) {
          segs[day].push({ hours: hrs })
        }
      }
      setEntries(map)
      setSegmentsByDay(segs)
      setTotal(Number(ts.total_hours || 0))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, weekStart])

  const shiftWeek = (delta: number) => {
    const d = new Date(weekStart + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + 7*delta)
    setWeekStart(startOfWeek(d).toISOString().slice(0,10))
  }

  const save = async (day: string) => {
    const segs = (segmentsByDay[day] || []).filter(s => Number(s.hours || 0) > 0)
    const hours = segs.reduce((a, b) => a + Number(b.hours || 0), 0)
    await saveTimesheetEntry(projectId, weekStart, { task_id: taskId, day, segments: segs, hours, replace: true })
    await load()
  }

  const addSegment = (day: string) => {
    const list = segmentsByDay[day] ? [...segmentsByDay[day]] : []
    list.push({ hours: 0 })
    setSegmentsByDay({ ...segmentsByDay, [day]: list })
  }

  const updateSegment = (day: string, idx: number, field: 'start'|'end'|'hours', value: string) => {
    const list = segmentsByDay[day] ? [...segmentsByDay[day]] : []
    const item = { ...(list[idx] || { hours: 0 }) }
    if (field === 'hours') item.hours = Number(value)
    else (item as any)[field] = value
    list[idx] = item
    setSegmentsByDay({ ...segmentsByDay, [day]: list })
    const sum = list.reduce((a, b) => a + Number(b.hours || 0), 0)
    setEntries({ ...entries, [day]: sum })
  }

  const removeSegment = (day: string, idx: number) => {
    const list = segmentsByDay[day] ? [...segmentsByDay[day]] : []
    list.splice(idx, 1)
    setSegmentsByDay({ ...segmentsByDay, [day]: list })
    const sum = list.reduce((a, b) => a + Number(b.hours || 0), 0)
    setEntries({ ...entries, [day]: sum })
  }

  return (
    <div className="border rounded-xl p-4 bg-card">
      <div className="flex items-center justify-between">
        <div className="font-medium">Timesheets</div>
        <div className="text-sm flex items-center gap-2">
          <button className="px-2 py-1 border rounded" onClick={() => shiftWeek(-1)}>&lt;</button>
          <span>Week starting {weekStart}</span>
          <button className="px-2 py-1 border rounded" onClick={() => shiftWeek(1)}>&gt;</button>
        </div>
      </div>
      <div className="mt-3 text-sm">
        <label className="mr-2">Task:</label>
        <select className="border rounded px-2 py-1" value={taskId || ''} onChange={e => setTaskId(e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">(none)</option>
          {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </div>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1">Day</th>
            <th className="py-1">Segments</th>
            <th className="py-1">Total</th>
            <th className="py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {days.map(d => (
            <tr key={d} className="align-top">
              <td className="py-2 font-medium">{d}</td>
              <td className="py-2">
                <div className="space-y-2">
                  {(segmentsByDay[d] || []).map((s, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input className="w-24 border rounded px-2 py-1" placeholder="Start" value={s.start || ''} onChange={e => updateSegment(d, idx, 'start', e.target.value)} />
                      <input className="w-24 border rounded px-2 py-1" placeholder="End" value={s.end || ''} onChange={e => updateSegment(d, idx, 'end', e.target.value)} />
                      <input className="w-20 border rounded px-2 py-1" type="number" step="0.25" min={0} value={s.hours} onChange={e => updateSegment(d, idx, 'hours', e.target.value)} />
                      <button className="px-2 py-1 border rounded" onClick={() => removeSegment(d, idx)}>Remove</button>
                    </div>
                  ))}
                  <button className="px-2 py-1 border rounded" onClick={() => addSegment(d)}>Add segment</button>
                </div>
              </td>
              <td className="py-2">{entries[d] ?? 0}</td>
              <td className="py-2">
                <button className="px-3 py-1.5 rounded bg-blue-600 text-white" onClick={() => save(d)}>Save</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 text-sm text-muted-foreground">Total: {total}</div>
      {loading && <div className="text-sm text-muted-foreground mt-2">Loading...</div>}
      {!email && <div className="text-xs text-red-600 mt-2">Email not detected; some actions may fail. Please sign in.</div>}
    </div>
  )
}
