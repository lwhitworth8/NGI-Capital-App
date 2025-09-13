"use client"

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useApp } from '@/lib/context/AppContext'
import { useAuth } from '@/lib/auth'
import { advisoryGetProject, advisoryListStudents, advisoryAddAssignment, advisoryUpdateAssignment, advisoryDeleteAssignment } from '@/lib/api'
import type { AdvisoryProject, AdvisoryStudent } from '@/types'
import Link from 'next/link'

const BASE_ALLOWED = new Set([
  'lwhitworth@ngicapitaladvisory.com',
  'anurmamade@ngicapitaladvisory.com',
])

export default function AdvisoryProjectDetailPage() {
  const { user, loading: authLoading } = useAuth()
  const { state } = useApp()
  const params = useParams<{ id: string }>()
  const id = Number(params?.id || 0)
  const entityId = useMemo(() => Number(state.currentEntity?.id || 0), [state.currentEntity])
  const allowed = (() => {
    if ((process.env.NEXT_PUBLIC_ADVISORY_ALLOW_ALL || '').toLowerCase() === '1') return true
    const extra = (process.env.NEXT_PUBLIC_ADVISORY_ADMINS || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)
    const allowedSet = new Set<string>([...Array.from(BASE_ALLOWED), ...extra])
    let email = String(user?.email || '')
    if (!email && typeof window !== 'undefined') {
      const anyWin: any = window as any
      email = anyWin?.Clerk?.user?.primaryEmailAddress?.emailAddress
        || anyWin?.Clerk?.user?.emailAddresses?.[0]?.emailAddress
        || ''
      if (!email) {
        try { const u = JSON.parse(localStorage.getItem('user') || 'null'); if (u?.email) email = u.email } catch {}
      }
    }
    email = (email || '').toLowerCase()
    return !!email && allowedSet.has(email)
  })()

  const [fetching, setFetching] = useState(false)
  const [project, setProject] = useState<(AdvisoryProject & { assignments?: any[] }) | null>(null)
  const [students, setStudents] = useState<AdvisoryStudent[]>([])
  const [q, setQ] = useState('')
  const [newAssign, setNewAssign] = useState<{ student_id?: number; role?: string; hours_planned?: number }>({})

  const load = async () => {
    if (!id || !allowed) return
    setFetching(true)
    try { setProject(await advisoryGetProject(id)) } finally { setFetching(false) }
  }

  useEffect(() => { load() }, [id, allowed])

  const searchStudents = async () => {
    if (!entityId) return
    const list = await advisoryListStudents({ entity_id: entityId, q })
    setStudents(list)
  }

  const addAssignment = async () => {
    if (!newAssign.student_id) return
    await advisoryAddAssignment(id, newAssign as any)
    setNewAssign({})
    await load()
  }

  if (authLoading || fetching) return <div className="p-6">Loading…</div>
  if (!allowed) return <div className="p-6">Access restricted.</div>
  if (!project) return <div className="p-6">Not found</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground"><Link href="/ngi-advisory/projects" className="hover:underline">Projects</Link> /</div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{project.project_name}</h1>
          <p className="text-sm text-muted-foreground">{project.client_name}</p>
          {project.slack_channel_id && (
            <div className="mt-1">
              <a
                className="text-sm text-blue-600 hover:underline"
                href={(process.env.NEXT_PUBLIC_SLACK_WORKSPACE_ID && project.slack_channel_id)
                  ? `https://app.slack.com/client/${process.env.NEXT_PUBLIC_SLACK_WORKSPACE_ID}/${project.slack_channel_id}`
                  : undefined}
                target={process.env.NEXT_PUBLIC_SLACK_WORKSPACE_ID ? '_blank' : undefined}
                onClick={(e) => { if (!process.env.NEXT_PUBLIC_SLACK_WORKSPACE_ID) e.preventDefault(); }}
                title={process.env.NEXT_PUBLIC_SLACK_WORKSPACE_ID ? 'Open Slack channel' : 'Set NEXT_PUBLIC_SLACK_WORKSPACE_ID to enable link'}
              >
                Open Slack {project.slack_channel_name ? `(#${project.slack_channel_name})` : ''}
              </a>
            </div>
          )}
        </div>
        <span className="px-2 py-1 rounded border text-xs">{project.status}</span>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 space-y-2">
          <h2 className="font-semibold mb-2">Summary</h2>
          <p className="text-sm text-muted-foreground">{project.summary}</p>
          {project.description && <p className="text-sm whitespace-pre-wrap">{project.description}</p>}
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-1 text-sm">
          <div><span className="text-muted-foreground">Lead:</span> {project.project_lead || '-'}</div>
          <div><span className="text-muted-foreground">Contact:</span> {project.contact_email || '-'}</div>
          <div><span className="text-muted-foreground">Mode:</span> {project.mode}</div>
          <div><span className="text-muted-foreground">Timing:</span> {project.start_date || '-'}  -  {project.end_date || '-'}</div>
          <div><span className="text-muted-foreground">Commitment:</span> {project.commitment_hours_per_week || 0} hrs/wk  |  {project.duration_weeks || 0} wks</div>
        </div>
      </div>

      {/* Assignments */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Assignments</h2>
          <div className="flex items-center gap-2">
            <input className="px-2 py-1 border rounded bg-background text-sm" placeholder="Search students" value={q} onChange={e=>setQ(e.target.value)} />
            <button className="px-3 py-1.5 text-sm rounded border" onClick={searchStudents}>Search</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
          <select className="px-2 py-2 border rounded bg-background" value={String(newAssign.student_id || '')} onChange={e=>setNewAssign(a=>({ ...a, student_id: Number(e.target.value||0) }))}>
            <option value="">Select student</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} — {s.email}</option>)}
          </select>
          <input className="px-2 py-2 border rounded bg-background" placeholder="Role" value={newAssign.role || ''} onChange={e=>setNewAssign(a=>({ ...a, role: e.target.value }))} />
          <input type="number" className="px-2 py-2 border rounded bg-background" placeholder="Hours/week" value={newAssign.hours_planned as any || ''} onChange={e=>setNewAssign(a=>({ ...a, hours_planned: Number(e.target.value||0) }))} />
          <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={addAssignment}>Add</button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-border">
              <th className="p-2">Student</th>
              <th className="p-2">Role</th>
              <th className="p-2">Hours</th>
              <th className="p-2">Active</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(project.assignments||[]).map(a => (
              <tr key={a.id} className="border-b border-border">
                <td className="p-2">{a.name || a.student_id}</td>
                <td className="p-2">{a.role || '-'}</td>
                <td className="p-2">{a.hours_planned || '-'}</td>
                <td className="p-2">{a.active ? 'Yes' : 'No'}</td>
                <td className="p-2 text-right">
                  <button className="px-2 py-1 text-xs rounded border mr-2" onClick={async()=>{ await advisoryUpdateAssignment(a.id, { active: a.active ? 0 : 1 }); await load() }}>{a.active ? 'Deactivate' : 'Activate'}</button>
                  <button className="px-2 py-1 text-xs rounded border" onClick={async()=>{ await advisoryDeleteAssignment(a.id); await load() }}>Remove</button>
                </td>
              </tr>
            ))}
            {(project.assignments||[]).length === 0 && (
              <tr><td className="p-2 text-sm text-muted-foreground" colSpan={5}>No assignments.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
