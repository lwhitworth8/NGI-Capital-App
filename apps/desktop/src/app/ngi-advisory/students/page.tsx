"use client"

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context/AppContext'
import { useAuth } from '@/lib/auth'
import { advisoryListStudents, advisoryCreateStudent, advisoryUpdateStudent, advisoryDeleteStudent, apiClient } from '@/lib/api'
import type { AdvisoryStudent } from '@/types'
import EntitySelectorInline from '@/components/finance/EntitySelectorInline'

const BASE_ALLOWED = new Set([
  'lwhitworth@ngicapitaladvisory.com',
  'anurmamade@ngicapitaladvisory.com',
])

export default function AdvisoryStudentsPage() {
  const { state } = useApp()
  const { user, loading } = useAuth()
  const entityId = useMemo(() => Number(state.currentEntity?.id || 0), [state.currentEntity])
  const entityName = state.currentEntity?.legal_name || ''
  const [listLoading, setListLoading] = useState(false)
  const [students, setStudents] = useState<AdvisoryStudent[]>([])
  const [q, setQ] = useState('')
  const [form, setForm] = useState<Partial<AdvisoryStudent>>({ first_name: '', last_name: '', email: '' })

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
    if (!entityId || !allowed) return
    setListLoading(true)
    try { setStudents(await advisoryListStudents({ entity_id: entityId, q })) }
    finally { setListLoading(false) }
  }

  useEffect(() => { load() }, [entityId, allowed])

  const onCreate = async () => {
    if (!form.email) return
    await advisoryCreateStudent({ ...form, entity_id: entityId })
    setForm({ first_name: '', last_name: '', email: '' })
    await load()
  }

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Students</h1>
          <p className="text-sm text-muted-foreground mt-1">{entityName}</p>
        </div>
        <EntitySelectorInline />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <input className="px-3 py-2 border rounded-md bg-background" placeholder="Search" value={q} onChange={e=>setQ(e.target.value)} />
        <button className="px-3 py-2 rounded-md border" onClick={load}>Search</button>
      </div>

      {/* List */}
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
              <tr key={s.id} className="border-b border-border">
                <td className="p-3">{s.first_name} {s.last_name}</td>
                <td className="p-3">{s.email}</td>
                <td className="p-3">{s.school || '-'}</td>
                <td className="p-3">{s.program || '-'}</td>
                <td className="p-3">{s.status}</td>
                <td className="p-3 text-right">
                  <button className="px-2 py-1 text-xs rounded border mr-2" onClick={async()=>{ await advisoryUpdateStudent(s.id, { status: s.status === 'active' ? 'paused' : 'active' }); await load() }}>{s.status==='active'?'Pause':'Activate'}</button>
                  <button className="px-2 py-1 text-xs rounded border" onClick={async()=>{ await advisoryDeleteStudent(s.id); await load() }}>Archive</button>
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

      {/* Create */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <input className="px-3 py-2 border rounded-md bg-background" placeholder="First name" value={form.first_name || ''} onChange={e=>setForm(f=>({ ...f, first_name: e.target.value }))} />
        <input className="px-3 py-2 border rounded-md bg-background" placeholder="Last name" value={form.last_name || ''} onChange={e=>setForm(f=>({ ...f, last_name: e.target.value }))} />
        <input className="px-3 py-2 border rounded-md bg-background" placeholder="Email" value={form.email || ''} onChange={e=>setForm(f=>({ ...f, email: e.target.value }))} />
        <input className="px-3 py-2 border rounded-md bg-background" placeholder="School" value={form.school || ''} onChange={e=>setForm(f=>({ ...f, school: e.target.value }))} />
        <button className="px-3 py-2 rounded-md bg-blue-600 text-white" onClick={onCreate}>Add Student</button>
      </div>
    </div>
  )
}

