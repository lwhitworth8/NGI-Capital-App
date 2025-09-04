"use client"

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context/AppContext'
import { useAuth } from '@/lib/auth'
import { advisoryListApplications, advisoryUpdateApplication, advisoryCreateStudent, advisoryListProjects, apiClient } from '@/lib/api'
import type { AdvisoryApplication, AdvisoryProject } from '@/types'

const BASE_ALLOWED = new Set([
  'lwhitworth@ngicapitaladvisory.com',
  'anurmamade@ngicapitaladvisory.com',
])

export default function AdvisoryApplicationsPage() {
  const { state } = useApp()
  const { user, loading } = useAuth()
  const entityId = useMemo(() => Number(state.currentEntity?.id || 0), [state.currentEntity])
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
  const [listLoading, setListLoading] = useState(false)
  const [apps, setApps] = useState<AdvisoryApplication[]>([])
  const [projects, setProjects] = useState<AdvisoryProject[]>([])
  const [filter, setFilter] = useState<{ status?: string; project_id?: number; q?: string }>({})
  const [openId, setOpenId] = useState<number | null>(null)

  const load = async () => {
    if (!entityId || !allowed) return
    setListLoading(true)
    try {
      setApps(await advisoryListApplications({ entity_id: entityId, status: filter.status, project_id: filter.project_id, q: filter.q }))
      setProjects(await advisoryListProjects({ entity_id: entityId }))
    } finally { setListLoading(false) }
  }

  useEffect(() => { load() }, [entityId, allowed])

  const convertToStudent = async (a: AdvisoryApplication) => {
    await advisoryCreateStudent({ entity_id: a.entity_id, first_name: a.first_name, last_name: a.last_name, email: a.email, school: a.school, program: a.program })
    await advisoryUpdateApplication(a.id, { status: 'reviewing' })
    await load()
  }

  const attachToProject = async (a: AdvisoryApplication, project_id: number) => {
    await advisoryUpdateApplication(a.id, { target_project_id: project_id })
    await load()
  }

  if (loading || authCheckLoading) return <div className="p-6">Loading…</div>
  if (!allowed) return <div className="p-6">Access restricted.</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Applications</h1>
        <div className="flex gap-2">
          <select className="px-3 py-2 border rounded bg-background text-sm" value={filter.status || ''} onChange={e=>setFilter(f=>({ ...f, status: e.target.value || undefined }))}>
            <option value="">All Statuses</option>
            {['new','reviewing','interview','offer','rejected','withdrawn'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="px-3 py-2 border rounded bg-background text-sm" value={String(filter.project_id || '')} onChange={e=>setFilter(f=>({ ...f, project_id: e.target.value ? Number(e.target.value) : undefined }))}>
            <option value="">Any Project</option>
            {projects.map(p=> <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
          <input className="px-3 py-2 border rounded bg-background text-sm" placeholder="Search" value={filter.q || ''} onChange={e=>setFilter(f=>({ ...f, q: e.target.value || undefined }))} />
          <button className="px-3 py-2 rounded border" onClick={load}>Apply</button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-border">
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">School</th>
              <th className="p-3">Target Project</th>
              <th className="p-3">Status</th>
              <th className="p-3">Created</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {apps.map(a => (
              <tr key={a.id} className="border-b border-border align-top">
                <td className="p-3">{a.first_name} {a.last_name}</td>
                <td className="p-3">{a.email}</td>
                <td className="p-3">{a.school || '-'}</td>
                <td className="p-3">{projects.find(p=>p.id===a.target_project_id)?.project_name || '-'}</td>
                <td className="p-3">{a.status}</td>
                <td className="p-3">{new Date(a.created_at).toLocaleString()}</td>
                <td className="p-3 text-right">
                  <button className="px-2 py-1 text-xs rounded border" onClick={()=>setOpenId(openId===a.id?null:a.id)}>{openId===a.id ? 'Close' : 'Review'}</button>
                </td>
              </tr>
            ))}
            {apps.length === 0 && !listLoading && (<tr><td className="p-3 text-sm text-muted-foreground" colSpan={7}>No applications.</td></tr>)}
            {listLoading && (<tr><td className="p-3 text-sm text-muted-foreground" colSpan={7}>Loading…</td></tr>)}
          </tbody>
        </table>
      </div>

      {/* Review Drawer */}
      {openId && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={()=>setOpenId(null)}>
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-background border-l border-border shadow-xl" onClick={e=>e.stopPropagation()}>
            {(() => {
              const a = apps.find(x=>x.id===openId)!;
              return (
                <div className="p-6 space-y-4">
                  <h2 className="text-xl font-semibold">Review Application</h2>
                  <div className="text-sm">
                    <div className="font-medium">{a.first_name} {a.last_name}</div>
                    <div className="text-muted-foreground">{a.email} • {a.school || '-'} • {a.program || '-'}</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-muted-foreground">Status:</span> {a.status}</div>
                    <div><span className="text-muted-foreground">Resume:</span> {a.resume_url ? <a className="text-blue-600 hover:underline" href={a.resume_url} target="_blank">Open</a> : '-'}</div>
                    <div><span className="text-muted-foreground">Notes:</span> {a.notes || '-'}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Attach to Project</div>
                    <div className="flex gap-2">
                      <select className="px-3 py-2 border rounded bg-background text-sm" value={String(a.target_project_id || '')} onChange={async e=>{ await attachToProject(a, e.target.value ? Number(e.target.value) : undefined as any); }}>
                        <option value="">None</option>
                        {projects.map(p=> <option key={p.id} value={p.id}>{p.project_name}</option>)}
                      </select>
                      <button className="px-3 py-2 rounded border" onClick={()=>attachToProject(a, a.target_project_id!)}>Save</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={()=>convertToStudent(a)}>Convert to Student</button>
                    <button className="px-4 py-2 rounded border" onClick={()=>setOpenId(null)}>Close</button>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

