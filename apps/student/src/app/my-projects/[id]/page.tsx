"use client"

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import TimesheetsPanel from './timesheets/TimesheetsPanel'

type ProjectTask = { id:number; title:string; description?:string; priority?:string; status?:string; due_date?:string; planned_hours?:number }

export default function ProjectWorkspacePage() {
  const params = useParams<{ id: string }>()
  const pid = Number(params.id)
  const searchParams = useSearchParams()
  const tab = (searchParams.get('tab') || 'overview').toLowerCase()
  const { user } = useUser()
  const email = useMemo(() => user?.primaryEmailAddress?.emailAddress || process.env.NEXT_PUBLIC_MOCK_STUDENT_EMAIL || '', [user?.primaryEmailAddress?.emailAddress])

  const [tasks, setTasks] = useState<ProjectTask[]>([])
  const [meetings, setMeetings] = useState<any[]>([])
  const [resources, setResources] = useState<any[]>([])

  useEffect(() => {
    let ignore = false
    const loadTasks = async () => {
      if (!email) return
      const res = await fetch(`/api/public/projects/${pid}/tasks`, { headers: { 'X-Student-Email': email } })
      if (!res.ok) return
      const data = await res.json()
      if (!ignore) setTasks(data)
    }
    const loadMeetings = async () => {
      const res = await fetch(`/api/public/projects/${pid}/meetings`)
      if (!res.ok) return
      const data = await res.json()
      if (!ignore) setMeetings(data)
    }
    const loadResources = async () => {
      const res = await fetch(`/api/public/projects/${pid}/resources`)
      if (!res.ok) return
      const data = await res.json()
      if (!ignore) setResources(data)
    }
    loadTasks()
    if (tab === 'meetings') loadMeetings()
    if (tab === 'resources') loadResources()
    return () => { ignore = true }
  }, [pid, tab, email])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Project Workspace</h1>
        <div className="flex gap-3 text-sm">
          <Link href={`/my-projects/${pid}?tab=overview`} className={tab==='overview'? 'text-blue-600' : ''}>Overview</Link>
          <Link href={`/my-projects/${pid}?tab=tasks`} className={tab==='tasks'? 'text-blue-600' : ''}>My Tasks</Link>
          <Link href={`/my-projects/${pid}?tab=meetings`} className={tab==='meetings'? 'text-blue-600' : ''}>Meetings</Link>
          <Link href={`/my-projects/${pid}?tab=timesheets`} className={tab==='timesheets'? 'text-blue-600' : ''}>Timesheets</Link>
          <Link href={`/my-projects/${pid}?tab=resources`} className={tab==='resources'? 'text-blue-600' : ''}>Resources</Link>
        </div>
      </div>
      <div className="mt-6">
        {tab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-xl p-4 bg-card">
              <div className="font-medium mb-2">Due Soon</div>
              {tasks.filter(t => !!t.due_date).slice(0,5).map(t => (
                <div key={t.id} className="text-sm py-1 flex justify-between">
                  <span>{t.title}</span>
                  <Link href={`/my-projects/${pid}/tasks/${t.id}`} className="text-blue-600">Open</Link>
                </div>
              ))}
              {tasks.length === 0 && <div className="text-sm text-muted-foreground">No tasks assigned.</div>}
            </div>
            <div className="border rounded-xl p-4 bg-card">
              <div className="font-medium mb-2">This Week</div>
              <div className="text-sm text-muted-foreground">Planned vs Logged hours will appear here.</div>
            </div>
          </div>
        )}
        {tab === 'tasks' && (
          <div className="border rounded-xl p-4 bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1">Title</th>
                  <th className="py-1">Due</th>
                  <th className="py-1">Priority</th>
                  <th className="py-1">Planned</th>
                  <th className="py-1">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => (
                  <tr key={t.id} className="border-t">
                    <td className="py-2">{t.title}</td>
                    <td className="py-2">{t.due_date ? new Date(t.due_date).toLocaleDateString() : '-'}</td>
                    <td className="py-2">{t.priority || '-'}</td>
                    <td className="py-2">{t.planned_hours ?? '-'}</td>
                    <td className="py-2">{t.status || '-'}</td>
                    <td className="py-2"><Link href={`/my-projects/${pid}/tasks/${t.id}`} className="text-blue-600">Open</Link></td>
                  </tr>
                ))}
                {tasks.length === 0 && <tr><td className="py-3 text-muted-foreground">No tasks assigned.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'meetings' && (
          <div className="border rounded-xl p-4 bg-card">
            {meetings.map(m => (
              <div key={m.id} className="py-2 flex justify-between text-sm border-b last:border-none">
                <div>
                  <div className="font-medium">{m.title}</div>
                  <div className="text-muted-foreground">{new Date(m.start_ts).toLocaleString()} – {new Date(m.end_ts).toLocaleString()}</div>
                </div>
                <div>
                  <a className="text-blue-600" href={`https://calendar.google.com/calendar/`} target="_blank">Open in Calendar</a>
                </div>
              </div>
            ))}
            {meetings.length === 0 && <div className="text-sm text-muted-foreground">No meetings.</div>}
          </div>
        )}
        {tab === 'resources' && (
          <div className="border rounded-xl p-4 bg-card">
            {resources.map(r => (
              <div key={r.id} className="py-2 flex justify-between text-sm border-b last:border-none">
                <div>{r.title}</div>
                <div>{r.kind === 'link' ? <a className="text-blue-600" href={r.url_or_path} target="_blank">Open</a> : <a className="text-blue-600" href={`/${r.url_or_path || ''}`} target="_blank">Download</a>}</div>
              </div>
            ))}
            {resources.length === 0 && <div className="text-sm text-muted-foreground">No resources.</div>}
          </div>
        )}
        {tab === 'timesheets' && (
          <TimesheetsPanel projectId={pid} />
        )}
      </div>
    </div>
  )
}

