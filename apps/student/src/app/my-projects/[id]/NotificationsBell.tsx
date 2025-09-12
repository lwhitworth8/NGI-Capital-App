"use client"

import { useEffect, useState } from 'react'
import { listMyTasks, listProjectMeetings, type ProjectTask } from '@/lib/api'

export default function NotificationsBell({ projectId }: { projectId: number }) {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [items, setItems] = useState<Array<{ id:string; text:string }>>([])
  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        const [tasks, meetings] = await Promise.all([
          listMyTasks(projectId).catch(()=>[]),
          listProjectMeetings(projectId).catch(()=>[]),
        ])
        const now = Date.now()
        const dayMs = 24*60*60*1000
        const notif: Array<{id:string; text:string}> = []
        ;(tasks as ProjectTask[]).forEach(t => {
          const due = t.due_date ? Date.parse(t.due_date) : 0
          if ((t.status||'').toLowerCase()==='review') notif.push({ id: `t-review-${t.id}`, text: `Task "${t.title}" awaiting review` })
          if (due && due < now) notif.push({ id: `t-overdue-${t.id}`, text: `Task "${t.title}" is overdue` })
        })
        ;(meetings as any[]).forEach(m => {
          const start = m.start_ts ? Date.parse(m.start_ts) : 0
          if (start && start - now < dayMs && start > now) notif.push({ id: `m-soon-${m.id}`, text: `Meeting soon: ${m.title} (${new Date(m.start_ts).toLocaleString()})` })
        })
        if (!ignore) {
          setItems(notif)
          setCount(notif.length)
        }
      } catch {}
    }
    load()
    const id = setInterval(load, 60_000)
    return () => { ignore = true; clearInterval(id) }
  }, [projectId])
  return (
    <div className="relative">
      <button className="chip" aria-label="Notifications" onClick={()=>setOpen(o=>!o)}>
        🔔 {count>0 && <span className="ml-1 text-xs bg-red-600 text-white rounded-full px-1">{count}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg p-3 z-50">
          <div className="font-medium mb-2">Notifications</div>
          <div className="text-sm space-y-2 max-h-72 overflow-auto">
            {items.map(n => (
              <div key={n.id} className="border-b last:border-none pb-2">{n.text}</div>
            ))}
            {items.length===0 && <div className="text-muted-foreground">No notifications</div>}
          </div>
        </div>
      )}
    </div>
  )
}

