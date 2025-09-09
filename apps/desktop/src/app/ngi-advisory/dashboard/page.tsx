"use client"

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context/AppContext'
import { useAuth } from '@/lib/auth'
import { advisoryListProjects, advisoryListStudents, advisoryListApplications, advisoryListCoffeechats } from '@/lib/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const BASE_ALLOWED = new Set([
  'lwhitworth@ngicapitaladvisory.com',
  'anurmamade@ngicapitaladvisory.com',
])

type AppRow = { id: number; status: string }

export default function AdvisoryDashboardPage() {
  const { state } = useApp()
  const { user, loading } = useAuth()
  const entityId = useMemo(() => Number(state.currentEntity?.id || 0), [state.currentEntity])

  const [kpis, setKpis] = useState({ projects: 0, students: 0, applications: 0, chats7d: 0 })
  const [apps, setApps] = useState<AppRow[]>([])
  const [fetching, setFetching] = useState(true)

  const allowed = useMemo(() => {
    const allowAll = (process.env.NEXT_PUBLIC_ADVISORY_ALLOW_ALL || '').toLowerCase() === '1'
    const devAllow = process.env.NODE_ENV !== 'production' && (process.env.NEXT_PUBLIC_ADVISORY_DEV_OPEN || '1') === '1'
    const extra = (process.env.NEXT_PUBLIC_ADVISORY_ADMINS || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)
    const allowedSet = new Set<string>([...Array.from(BASE_ALLOWED), ...extra])
    const emailLower = String(user?.email || '').toLowerCase()
    return allowAll || devAllow || (!!emailLower && allowedSet.has(emailLower))
  }, [user?.email])

  useEffect(() => {
    let ignore = false
    const load = async () => {
      if (!entityId || !allowed) { setFetching(false); return }
      try {
        const [projs, studs, appls, chats] = await Promise.all([
          advisoryListProjects({ entity_id: entityId, status: 'active' }),
          advisoryListStudents({ entity_id: entityId }),
          advisoryListApplications({ entity_id: entityId }),
          advisoryListCoffeechats({ entity_id: entityId }),
        ])
        if (!ignore) {
          const now = Date.now()
          const weekAgo = now - 7*24*60*60*1000
          const chats7d = (chats || []).filter((c: any) => {
            const t = Date.parse(c.scheduled_start || c.created_at || '')
            return isFinite(t) && t >= weekAgo
          }).length
          setKpis({ projects: projs.length, students: studs.length, applications: appls.length, chats7d })
          setApps(appls.map(a => ({ id: a.id, status: (a.status || '').toLowerCase() })))
        }
      } finally {
        if (!ignore) setFetching(false)
      }
    }
    load(); return () => { ignore = true }
  }, [entityId, allowed])

  const appByStatus = useMemo(() => {
    const groups: Record<string, number> = {}
    for (const a of apps) groups[a.status] = (groups[a.status] || 0) + 1
    return Object.entries(groups).map(([k,v]) => ({ status: k, count: v }))
  }, [apps])

  if (loading) return <div className="p-6">Loading...</div>
  if (!allowed) return <div className="p-6">Access restricted.</div>

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Advisory Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview and pipeline</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi title="Active Projects" value={kpis.projects} />
        <Kpi title="Active Students" value={kpis.students} />
        <Kpi title="Applications" value={kpis.applications} />
        <Kpi title="Coffee Chats (7d)" value={kpis.chats7d} />
      </div>

      {/* Applications by status */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-sm font-medium mb-2">Applications Pipeline</div>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={appByStatus} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
        <a href="/ngi-advisory/projects" className="px-3 py-2 rounded-md border">Manage Projects</a>
        <a href="/ngi-advisory/applications" className="px-3 py-2 rounded-md border">View Applications</a>
      </div>
    </div>
  )
}

function Kpi({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  )
}

