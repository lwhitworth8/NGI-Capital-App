"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { advisoryListStudents, advisoryUpdateStudent, advisorySoftDeleteStudent, advisoryGetStudentTimeline, advisoryOverrideStudentStatus, advisoryCreateStudentAssignment, advisoryListProjects, advisoryListArchivedStudents, advisoryRestoreStudent, apiClient } from '@/lib/api'
import type { AdvisoryStudent } from '@/types'

const BASE_ALLOWED = new Set([
  'lwhitworth@ngicapitaladvisory.com',
  'anurmamade@ngicapitaladvisory.com',
])


export default function AdvisoryStudentsPage() {
  const { user, loading } = useAuth()
  const [listLoading, setListLoading] = useState(false)
  const [students, setStudents] = useState<AdvisoryStudent[]>([])
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all'|'active'|'alumni'|'prospect'|'paused'>('all')
  const [sort, setSort] = useState<'default'|'last_activity_desc'|'name_asc'|'grad_year_asc'|'grad_year_desc'>('last_activity_desc')
  const [hasResume, setHasResume] = useState<'all'|'yes'|'no'>('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<AdvisoryStudent | null>(null)
  const [timeline, setTimeline] = useState<{ applications: any[]; coffeechats: any[]; onboarding: any[] } | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignProjectId, setAssignProjectId] = useState<number | null>(null)
  const [assignHours, setAssignHours] = useState<number | undefined>(undefined)
  const [projects, setProjects] = useState<any[]>([])
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [overrideStatus, setOverrideStatus] = useState<'active'|'alumni'|'__clear'>('__clear')
  const [overrideReason, setOverrideReason] = useState('')
  const [scrollTop, setScrollTop] = useState(0)
  const [view, setView] = useState<'active'|'archived'>('active')
  const [archived, setArchived] = useState<Array<{ id:number; original_id:number; email:string; deleted_at:string; deleted_by?:string; snapshot?: any }>>([])
  const [archPage, setArchPage] = useState(1)

    const [authCheckLoading, setAuthCheckLoading] = useState(true)
  const [serverEmail, setServerEmail] = useState('')
  const allowed = (() => {
    if ((process.env.NEXT_PUBLIC_ADVISORY_ALLOW_ALL || '').toLowerCase() === '1') return true
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
    const serverLower = (serverEmail || '').toLowerCase()
    return devAllow || (!!emailLower && allowedSet.has(emailLower)) || (!!serverLower && allowedSet.has(serverLower))
  })()

  useEffect(() => {
    let mounted = true
    const check = async () => {
      try {
        const anyWin: any = typeof window !== 'undefined' ? (window as any) : {}
        const localEmail = String(
          user?.email
          || anyWin?.Clerk?.user?.primaryEmailAddress?.emailAddress
          || anyWin?.Clerk?.user?.emailAddresses?.[0]?.emailAddress
          || (JSON.parse((typeof window !== 'undefined' ? localStorage.getItem('user') || 'null' : 'null')) || {}).email
          || ''
        ).toLowerCase()
        if (!localEmail && !serverEmail) {
          try { const me = await apiClient.getProfile(); if (mounted) setServerEmail(me?.email || '') } catch {}
        }
      } finally { if (mounted) setAuthCheckLoading(false) }
    }
    check(); return () => { mounted = false }
  }, [user?.email, serverEmail])

  const load = async () => {
    if (!allowed) return
    setListLoading(true)
    try {
      if (view === 'active') {
        const params: any = {q: q || undefined, page, page_size: 100 }
        if (statusFilter !== 'all') params.status = statusFilter
        if (sort && sort !== 'default') params.sort = sort
        if (hasResume !== 'all') params.has_resume = hasResume === 'yes' ? 1 : 0
        setStudents(await advisoryListStudents(params))
      } else {
        setArchived(await advisoryListArchivedStudents({ q: q || undefined, page: archPage, page_size: 100 }))
      }
    }
    finally { setListLoading(false) }
  }

  useEffect(() => { load() }, [allowed, statusFilter, sort, hasResume, page, view, archPage])

  // When selecting a student, load timeline and supporting lists
  useEffect(() => {
    (async () => {
      if (!selected) return
      try {
        const tl = await advisoryGetStudentTimeline(selected.id)
        setTimeline(tl)
      } catch { setTimeline(null) }
      try {
        const projs = await advisoryListProjects({ status: 'active' } as any)
        setProjects(projs as any)
      } catch { setProjects([]) }
    })()
  }, [selected?.id])


  if (loading || authCheckLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Students</h1>
        <p className="text-sm text-muted-foreground mt-2">Loading…</p>
      </div>

    )
  }
  if (!allowed) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Students</h1>
        <p className="text-sm text-muted-foreground mt-2">Access restricted.</p>
      </div>
    )
  }

  return (
    <>
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Students</h1>
        </div>
              </div>

      {/* View Toggle + Actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 mr-3">
          <button className={`px-3 py-2 rounded-md border ${view==='active'?'bg-primary text-primary-foreground':''}`} onClick={()=>{ setView('active'); setPage(1) }}>Active</button>
          <button className={`px-3 py-2 rounded-md border ${view==='archived'?'bg-primary text-primary-foreground':''}`} onClick={()=>{ setView('archived'); setArchPage(1) }}>Archived</button>
        </div>
        <input className="px-3 py-2 border rounded-md bg-background" placeholder="Search" value={q} onChange={e=>setQ(e.target.value)} />
        <select className="px-3 py-2 border rounded-md bg-background" value={statusFilter} onChange={e=>{ setStatusFilter(e.target.value as any); setPage(1) }}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="alumni">Alumni</option>
          <option value="prospect">Prospect</option>
          <option value="paused">Paused</option>
        </select>
        <select className="px-3 py-2 border rounded-md bg-background" value={sort} onChange={e=>{ setSort(e.target.value as any); setPage(1) }}>
          <option value="last_activity_desc">Last Activity</option>
          <option value="name_asc">Name (A-Z)</option>
          <option value="grad_year_asc">Grad Year (Asc)</option>
          <option value="grad_year_desc">Grad Year (Desc)</option>
        </select>
        <select className="px-3 py-2 border rounded-md bg-background" value={hasResume} onChange={e=>{ setHasResume(e.target.value as any); setPage(1) }}>
          <option value="all">All</option>
          <option value="yes">Has Resume</option>
          <option value="no">No Resume</option>
        </select>
        <button className="px-3 py-2 rounded-md border" onClick={() => { setPage(1); load() }}>Search</button>
      </div>

      {/* Active List */}
      {view === 'active' && (
      <div className="rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-border">
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">School</th>
              <th className="p-3">Program</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s.id} className="border-b border-border hover:bg-muted/30 cursor-pointer" onClick={()=>setSelected(s)}>
                <td className="p-3">{s.first_name} {s.last_name}</td>
                <td className="p-3">{s.email}</td>
                <td className="p-3">{s.school || '-'}</td>
                <td className="p-3">{s.program || '-'}</td>
                <td className="p-3">{(s.status_effective || s.status || '').toString()}</td>
                <td className="p-3 text-right">
                  <button className="px-2 py-1 text-xs rounded border mr-2" onClick={async(e)=>{ e.stopPropagation(); await advisoryUpdateStudent(s.id, { status: s.status === 'active' ? 'paused' : 'active' }); await load() }}>{s.status==='active'?'Pause':'Activate'}</button>
                  <button className="px-2 py-1 text-xs rounded border" onClick={async(e)=>{ e.stopPropagation(); await advisorySoftDeleteStudent(s.id); await load() }}>Archive</button>
                </td>
              </tr>
            ))}
            {students.length === 0 && !listLoading && (
              <tr><td className="p-3 text-sm text-muted-foreground" colSpan={6}>No students found.</td></tr>
            )}
            {listLoading && (
              <tr><td className="p-3 text-sm text-muted-foreground" colSpan={6}>Loading…</td></tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {/* Archived (simple view with restore) */}
      {view === 'archived' && (
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h2 className="text-sm font-medium">Archived Students</h2>
          <div className="flex items-center gap-2">
            <button className="px-2 py-1 text-xs rounded border" onClick={async()=>{ setArchived(await advisoryListArchivedStudents({ q: q || undefined, page: archPage, page_size: 100 })) }}>Refresh</button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-border">
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Deleted At</th>
              <th className="p-3">Deleted By</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {archived.map(a => (
              <tr key={a.id} className="border-b border-border">
                <td className="p-3">{a.snapshot?.first_name || ''} {a.snapshot?.last_name || ''}</td>
                <td className="p-3">{a.email}</td>
                <td className="p-3">{a.deleted_at ? new Date(a.deleted_at).toLocaleString() : '-'}</td>
                <td className="p-3">{a.deleted_by || '-'}</td>
                <td className="p-3 text-right">
                  <button className="px-2 py-1 text-xs rounded border" onClick={async()=>{ await advisoryRestoreStudent(a.original_id); setArchived(await advisoryListArchivedStudents({ q: q || undefined, page: archPage, page_size: 100 })) }}>Restore</button>
                </td>
              </tr>
            ))}
            {archived.length === 0 && (
              <tr><td className="p-3 text-sm text-muted-foreground" colSpan={5}>No archived students.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2">
        <button className="px-2 py-1 text-sm rounded border" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
        <div className="text-xs text-muted-foreground">Page {page}</div>
        <button className="px-2 py-1 text-sm rounded border" onClick={()=>setPage(p=>p+1)}>Next</button>
      </div>

      
    </div>
    {/* Detail Drawer */}
    {selected && (
      <div className="fixed inset-0 bg-black/30 z-40" onClick={()=>setSelected(null)}>
        <div className="absolute right-0 top-0 bottom-0 w-full max-w-4xl bg-background border-l border-border shadow-xl overflow-auto" onClick={e=>e.stopPropagation()}>
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">{selected.first_name} {selected.last_name}</h2>
                <div className="text-sm text-muted-foreground">{selected.email}</div>
                <div className="text-xs text-muted-foreground mt-1">Status: {(selected.status_effective || selected.status)}{selected.status_override ? ' (override)' : ''}</div>
                {selected.resume_url ? <div className="text-xs mt-1"><a className="underline" href={selected.resume_url} target="_blank">Resume</a></div> : null}
                {selected.last_activity_at ? <div className="text-xs text-muted-foreground mt-1">Last Activity: {new Date(selected.last_activity_at).toLocaleString()}</div> : null}
              </div>
              <div className="flex items-center gap-2">
                <button className="px-2 py-1 text-xs rounded border" onClick={()=>{ setOverrideOpen(true); setOverrideStatus(selected.status_override ? (selected.status_override as any) : '__clear'); setOverrideReason('') }}>Status Override</button>
                <button className="px-2 py-1 text-xs rounded border" onClick={()=>{ setAssignOpen(true); setAssignProjectId(null); setAssignHours(undefined) }}>Assign to Project</button>
              </div>
            </div>

            {/* Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-1 md:col-span-1">
                <h3 className="font-medium">Applications</h3>
                <div className="mt-2 space-y-1">
                  {(timeline?.applications||[]).map(a => (
                    <div key={a.id} className="text-xs text-muted-foreground">#{a.id} → P{a.project_id} • {a.status} • {new Date(a.created_at).toLocaleString()}</div>
                  ))}
                  {(!timeline || (timeline.applications||[]).length===0) && <div className="text-xs text-muted-foreground">None</div>}
                </div>
              </div>
              <div className="col-span-1 md:col-span-1">
                <h3 className="font-medium">Coffee Chats</h3>
                <div className="mt-2 space-y-1">
                  {(timeline?.coffeechats||[]).map(c => (
                    <div key={c.id} className="text-xs text-muted-foreground">{c.provider} {c.status} • {c.scheduled_start ? new Date(c.scheduled_start).toLocaleString() : '-'}</div>
                  ))}
                  {(!timeline || (timeline.coffeechats||[]).length===0) && <div className="text-xs text-muted-foreground">None</div>}
                </div>
              </div>
              <div className="col-span-1 md:col-span-1">
                <h3 className="font-medium">Onboarding</h3>
                <div className="mt-2 space-y-1">
                  {(timeline?.onboarding||[]).map(o => (
                    <div key={o.id} className="text-xs text-muted-foreground">T{o.template_id} • {o.status} • {new Date(o.created_at).toLocaleString()}</div>
                  ))}
                  {(!timeline || (timeline.onboarding||[]).length===0) && <div className="text-xs text-muted-foreground">None</div>}
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button className="px-3 py-2 rounded-md border" onClick={()=>setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Assign Dialog */}
    {assignOpen && selected && (
      <div className="fixed inset-0 bg-black/30 z-50" onClick={()=>setAssignOpen(false)}>
        <div className="absolute inset-0 grid place-items-center" onClick={e=>e.stopPropagation()}>
          <div className="w-full max-w-lg bg-background border border-border rounded-xl p-4 space-y-3">
            <div className="text-base font-semibold">Assign to Project</div>
            <select className="w-full px-3 py-2 border rounded-md bg-background" value={assignProjectId ?? ''} onChange={e=>setAssignProjectId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Select project</option>
              {projects.map((p:any) => (
                <option key={p.id} value={p.id}>{p.project_name} • open roles: {p.open_roles ?? '-'}</option>
              ))}
            </select>
            <input className="w-full px-3 py-2 border rounded-md bg-background" type="number" placeholder="Hours/week (optional)" value={assignHours ?? ''} onChange={e=>setAssignHours(e.target.value ? Number(e.target.value) : undefined)} />
            <div className="flex items-center justify-end gap-2">
              <button className="px-3 py-2 rounded-md border" onClick={()=>setAssignOpen(false)}>Cancel</button>
              <button className="px-3 py-2 rounded-md bg-blue-600 text-white" onClick={async()=>{
                if (!assignProjectId) return;
                const chosen = projects.find((p:any)=>p.id===assignProjectId)
                if (chosen && typeof chosen.open_roles === 'number' && chosen.open_roles <= 0) {
                  const ok = window.confirm('No open analyst roles available for this project. Proceed anyway and assign?')
                  if (!ok) return
                }
                await advisoryCreateStudentAssignment(selected.id, { project_id: assignProjectId, hours_planned: assignHours })
                setAssignOpen(false)
                // refresh timeline
                try { setTimeline(await advisoryGetStudentTimeline(selected.id)) } catch {}
              }}>Assign</button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Status Override Dialog */}
    {overrideOpen && selected && (
      <div className="fixed inset-0 bg-black/30 z-50" onClick={()=>setOverrideOpen(false)}>
        <div className="absolute inset-0 grid place-items-center" onClick={e=>e.stopPropagation()}>
          <div className="w-full max-w-lg bg-background border border-border rounded-xl p-4 space-y-3">
            <div className="text-base font-semibold">Status Override</div>
            <select className="w-full px-3 py-2 border rounded-md bg-background" value={overrideStatus} onChange={e=>setOverrideStatus(e.target.value as any)}>
              <option value="__clear">Use computed (clear override)</option>
              <option value="active">Active</option>
              <option value="alumni">Alumni</option>
            </select>
            {overrideStatus !== '__clear' && (
              <textarea className="w-full px-3 py-2 border rounded-md bg-background" placeholder="Reason (for audit)" value={overrideReason} onChange={e=>setOverrideReason(e.target.value)} />
            )}
            <div className="flex items-center justify-end gap-2">
              <button className="px-3 py-2 rounded-md border" onClick={()=>setOverrideOpen(false)}>Cancel</button>
              <button className="px-3 py-2 rounded-md bg-blue-600 text-white" onClick={async()=>{
                if (overrideStatus === '__clear') {
                  await advisoryOverrideStudentStatus(selected.id, { clear: true })
                } else {
                  await advisoryOverrideStudentStatus(selected.id, { status: overrideStatus as any, reason: overrideReason || undefined })
                }
                setOverrideOpen(false)
                await load()
              }}>Save</button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
