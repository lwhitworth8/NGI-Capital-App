"use client"

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context/AppContext'
import { useAuth } from '@/lib/auth'
import { advisoryListOnboardingTemplates, advisoryListOnboardingInstances, advisoryCreateOnboardingInstance, advisoryMarkOnboardingStep, advisoryListStudents, advisoryListProjects, apiClient } from '@/lib/api'

const BASE_ALLOWED = new Set([
  'lwhitworth@ngicapitaladvisory.com',
  'anurmamade@ngicapitaladvisory.com',
])

export default function AdvisoryOnboardingPage() {
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

  const [templates, setTemplates] = useState<{ id: number; name: string }[]>([])
  const [instances, setInstances] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [newInstance, setNewInstance] = useState<{ student_id?: number; template_id?: number; project_id?: number }>({})

  const load = async () => {
    if (!entityId || !allowed) return
    const [t, i, s, p] = await Promise.all([
      advisoryListOnboardingTemplates(),
      advisoryListOnboardingInstances(),
      advisoryListStudents({ entity_id: entityId }),
      advisoryListProjects({ entity_id: entityId })
    ])
    setTemplates(t)
    setInstances(i)
    setStudents(s)
    setProjects(p)
  }

  useEffect(() => { load() }, [entityId, allowed])

  const startOnboarding = async () => {
    if (!newInstance.student_id || !newInstance.template_id) return
    await advisoryCreateOnboardingInstance(newInstance as any)
    setNewInstance({})
    await load()
  }

  const toggleStep = async (iid: number, stepKey: string, current: string) => {
    const next = current === 'completed' ? 'pending' : 'completed'
    await advisoryMarkOnboardingStep(iid, stepKey, { status: next as any })
    await load()
  }

  if (loading || authCheckLoading) return <div className="p-6">Loading…</div>
  if (!allowed) return <div className="p-6">Access restricted.</div>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Onboarding</h1>

      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="text-sm font-medium">Start Onboarding</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select className="px-3 py-2 border rounded bg-background text-sm" value={String(newInstance.student_id || '')} onChange={e=>setNewInstance(n=>({ ...n, student_id: e.target.value ? Number(e.target.value) : undefined }))}>
            <option value="">Select student</option>
            {students.map((s:any)=> <option key={s.id} value={s.id}>{s.first_name} {s.last_name} — {s.email}</option>)}
          </select>
          <select className="px-3 py-2 border rounded bg-background text-sm" value={String(newInstance.template_id || '')} onChange={e=>setNewInstance(n=>({ ...n, template_id: e.target.value ? Number(e.target.value) : undefined }))}>
            <option value="">Select template</option>
            {templates.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className="px-3 py-2 border rounded bg-background text-sm" value={String(newInstance.project_id || '')} onChange={e=>setNewInstance(n=>({ ...n, project_id: e.target.value ? Number(e.target.value) : undefined }))}>
            <option value="">Optional project</option>
            {projects.map(p=> <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
          <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={startOnboarding}>Start</button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-border">
              <th className="p-3">Student</th>
              <th className="p-3">Template</th>
              <th className="p-3">Status</th>
              <th className="p-3">Steps</th>
            </tr>
          </thead>
          <tbody>
            {instances.map(inst => (
              <tr key={inst.id} className="border-b border-border">
                <td className="p-3">{students.find(s=>s.id===inst.student_id)?.email || inst.student_id}</td>
                <td className="p-3">{templates.find(t=>t.id===inst.template_id)?.name || inst.template_id}</td>
                <td className="p-3">{inst.status}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    {inst.steps.map((s:any)=> (
                      <button key={s.step_key} className={`px-2 py-1 rounded border ${s.status==='completed' ? 'bg-green-600 text-white border-green-700' : ''}`} onClick={()=>toggleStep(inst.id, s.step_key, s.status)}>
                        {s.step_key}: {s.status}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {instances.length === 0 && (<tr><td className="p-3 text-sm text-muted-foreground" colSpan={4}>No onboarding instances.</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

