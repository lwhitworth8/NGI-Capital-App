"use client"

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { useApp } from '@/lib/context/AppContext'
import { useAuth } from '@/lib/auth'
import { advisoryGetProject, advisoryListStudents, advisoryAddAssignment, advisoryUpdateAssignment, advisoryDeleteAssignment, apiClient, advisoryListCoffeeRequests, advisoryAcceptCoffeeRequest, advisoryCancelCoffeeRequest, advisoryListApplications, advisoryUpdateApplication, advisoryRejectApplication } from '@/lib/api'
import type { AdvisoryProject, AdvisoryStudent } from '@/types'
import Link from 'next/link'
import { Modal } from '@/components/ui/Modal'

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
  const [serverEmail, setServerEmail] = useState('')
  const allowed = (() => {
    if ((process.env.NEXT_PUBLIC_DISABLE_ADVISORY_AUTH || '0') === '1') return true
    const allowAll = (process.env.NEXT_PUBLIC_ADVISORY_ALLOW_ALL || '').toLowerCase() === '1'
    const devAllow = process.env.NODE_ENV !== 'production' && (process.env.NEXT_PUBLIC_ADVISORY_DEV_OPEN || '1') === '1'
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
    const emailLower = (email || '').toLowerCase()
    const serverLower = String(serverEmail || '').toLowerCase()
    return allowAll || devAllow || (!!emailLower && allowedSet.has(emailLower)) || (!!serverLower && allowedSet.has(serverLower))
  })()

  useEffect(() => {
    let alive = true
    ;(async () => {
      try { const me = await apiClient.getProfile(); if (alive) setServerEmail(me?.email || '') } catch {}
    })()
    return () => { alive = false }
  }, [])

  const [fetching, setFetching] = useState(false)
  const [project, setProject] = useState<(AdvisoryProject & { assignments?: any[] }) | null>(null)
  const [students, setStudents] = useState<AdvisoryStudent[]>([])
  const [q, setQ] = useState('')
  const [newAssign, setNewAssign] = useState<{ student_id?: number; role?: string; hours_planned?: number }>({})
  const [coffeeOpen, setCoffeeOpen] = useState(false)
  const [appsOpen, setAppsOpen] = useState(false)
  const [coffee, setCoffee] = useState<any[]>([])
  const [apps, setApps] = useState<any[]>([])
  const [busy, setBusy] = useState(false)
  // Availability (admin global; shown per-project)
  const [avail, setAvail] = useState<Array<{ id:number; admin_email:string; start_ts:string; end_ts:string; slot_len_min:number }>>([])
  const [avStart, setAvStart] = useState('')
  const [avEnd, setAvEnd] = useState('')
  const [avLen, setAvLen] = useState(30)

  const loadAvailability = async () => {
    try {
      const res = await fetch('/api/advisory/coffeechats/availability')
      if (!res.ok) return
      const rows: any[] = await res.json()
      const filtered = serverEmail
        ? rows.filter((r: any) => (r.admin_email || '').toLowerCase() === serverEmail.toLowerCase())
        : rows
      setAvail(filtered)
    } catch {}
  }

  const formatUSD = (val?: number | null) => {
    if (val === null || val === undefined || isNaN(Number(val))) return '-'
    return `$${Number(val).toFixed(2)}`
  }

  const load = async () => {
    if (!id || !allowed) return
    setFetching(true)
    try { setProject(await advisoryGetProject(id)) } finally { setFetching(false) }
  }

  useEffect(() => { load() }, [id, allowed])
  const search = useSearchParams()
  useEffect(() => {
    const o = search?.get('open')
    if (o === 'coffee') { (async()=>{ await loadCoffee(); setCoffeeOpen(true) })() }
    if (o === 'applications') { (async()=>{ await loadApps(); setAppsOpen(true) })() }
  }, [search])
  useEffect(() => { if (allowed) loadAvailability() }, [allowed, serverEmail])

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

  const loadCoffee = async () => {
    const list = await advisoryListCoffeeRequests({ project_id: id })
    setCoffee(list)
  }
  const loadApps = async () => {
    const list = await advisoryListApplications({ project_id: id })
    setApps(list)
  }

  if (authLoading || fetching) return <div className="p-6">Loading.</div>
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
          <div><span className="text-muted-foreground">Timing:</span> {project.start_date || '-'} ? {project.end_date || '-'}</div>
          <div><span className="text-muted-foreground">Commitment:</span> {project.commitment_hours_per_week || 0} hrs/wk - {project.duration_weeks || 0} wks</div>
          <div className="mt-2 pt-2 border-t">
            <div className="font-medium mb-1">Compensation</div>
            <div><span className="text-muted-foreground">Default Rate:</span> {formatUSD(project.default_hourly_rate)} USD</div>
            {project.compensation_notes && (
              <div className="text-muted-foreground text-xs mt-1">{project.compensation_notes}</div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Actions */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Admin</h2>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded border" onClick={async()=>{ await loadCoffee(); setCoffeeOpen(true) }}>Coffee Chats</button>
            <button className="px-3 py-1.5 rounded border" onClick={async()=>{ await loadApps(); setAppsOpen(true) }}>Applications</button>
          </div>
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
            {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} - {s.email}</option>)}
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
              <th className="p-2">Rate</th>
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
                <td className="p-2">{a.hourly_rate != null ? `${formatUSD(a.hourly_rate)} USD` : (project.default_hourly_rate != null ? `${formatUSD(project.default_hourly_rate)} USD` : '-')}</td>
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

      {/* Coffee Chats Modal */}
      <Modal isOpen={coffeeOpen} onClose={()=>setCoffeeOpen(false)} title="Coffee Chats" size="xl">
        <div className="text-sm text-muted-foreground mb-3">Project ID: {id}</div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-border">
                <th className="p-2">Student</th>
                <th className="p-2">Start</th>
                <th className="p-2">End</th>
                <th className="p-2">Status</th>
                <th className="p-2">Owner</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coffee.map(r => (
                <tr key={r.id} className="border-b border-border">
                  <td className="p-2">{r.student_email}</td>
                  <td className="p-2">{new Date(r.start_ts).toLocaleString()}</td>
                  <td className="p-2">{new Date(r.end_ts).toLocaleString()}</td>
                  <td className="p-2">{r.status}</td>
                  <td className="p-2">{r.claimed_by || '-'}</td>
                  <td className="p-2 text-right">
                    <button className="px-2 py-1 text-xs rounded border mr-2" disabled={busy} onClick={async()=>{ setBusy(true); try { await advisoryAcceptCoffeeRequest(r.id); await loadCoffee() } finally { setBusy(false) } }}>Accept</button>
                    <button className="px-2 py-1 text-xs rounded border" disabled={busy} onClick={async()=>{ setBusy(true); try { await advisoryCancelCoffeeRequest(r.id) ; await loadCoffee() } finally { setBusy(false) } }}>Cancel</button>
                  </td>
                </tr>
              ))}
              {coffee.length === 0 && <tr><td className="p-2 text-muted-foreground">No requests for this project.</td></tr>}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* Applications Modal */}
      <Modal isOpen={appsOpen} onClose={()=>setAppsOpen(false)} title="Applications" size="xl">
        <div className="text-sm text-muted-foreground mb-3">Project ID: {id}</div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-border">
                <th className="p-2">Name</th>
                <th className="p-2">Email</th>
                <th className="p-2">Status</th>
                <th className="p-2">Created</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.map(a => (
                <tr key={a.id} className="border-b border-border">
                  <td className="p-2">{a.first_name} {a.last_name}</td>
                  <td className="p-2">{a.email}</td>
                  <td className="p-2">{a.status}</td>
                  <td className="p-2">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="p-2 text-right">
                    <button className="px-2 py-1 text-xs rounded border mr-2" disabled={busy} onClick={async()=>{ setBusy(true); try { await advisoryUpdateApplication(a.id, { status: 'interview' }); await loadApps() } finally { setBusy(false) } }}>Interview</button>
                    <button className="px-2 py-1 text-xs rounded border mr-2" disabled={busy} onClick={async()=>{ setBusy(true); try { await advisoryUpdateApplication(a.id, { status: 'offer' }); await loadApps() } finally { setBusy(false) } }}>Offer</button>
                    <button className="px-2 py-1 text-xs rounded border" disabled={busy} onClick={async()=>{ setBusy(true); try { await advisoryRejectApplication(a.id, 'admin') ; await loadApps() } finally { setBusy(false) } }}>Reject</button>
                  </td>
                </tr>
              ))}
              {apps.length === 0 && <tr><td className="p-2 text-muted-foreground">No applications for this project.</td></tr>}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  )
}




