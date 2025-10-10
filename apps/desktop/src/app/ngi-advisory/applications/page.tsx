"use client"

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context/AppContext'
import { useAuth } from '@/lib/auth'
import {
  advisoryListProjects,
  advisoryListApplications,
  advisoryUpdateApplication,
  advisoryListArchivedApplications,
  advisoryListStudents,
  advisoryGetStudentTimeline,
} from '@/lib/api'
import type { AdvisoryApplication, AdvisoryProject } from '@/types'
import { advisoryGetApplication, advisoryRejectApplication, advisoryWithdrawApplication, advisoryUploadApplicationAttachment } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'

type Lane = 'new'|'reviewing'|'interview'|'offer'|'joined'|'rejected'|'withdrawn'
const LANES: Lane[] = ['new','reviewing','interview','offer','joined','rejected','withdrawn']

export default function ApplicationsAdminPage() {
  const { state } = useApp()
  const { user: authUser } = useAuth()
  const entityId = useMemo(() => Number(state.currentEntity?.id || 0), [state.currentEntity])
  const [projects, setProjects] = useState<AdvisoryProject[]>([])
  const [projectId, setProjectId] = useState<number | ''>('')
  const [apps, setApps] = useState<AdvisoryApplication[]>([])
  const [globalView, setGlobalView] = useState(false)
  const [pastView, setPastView] = useState(false)
  const [archived, setArchived] = useState<any[]>([])
  const [offerCounts, setOfferCounts] = useState<Record<number, number>>({})
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [reviewerFilter, setReviewerFilter] = useState<string>('all')
  const [busy, setBusy] = useState(false)
  const [detail, setDetail] = useState<(AdvisoryApplication & { attachments?: { id:number; file_name:string; file_url:string; uploaded_by?:string; uploaded_at:string }[]; rejection_reason?: string | null; answers_json?: any }) | null>(null)
  const [uploading, setUploading] = useState(false)
  const router = useRouter()

  const loadProjects = async () => {
    const res = await advisoryListProjects({ entity_id: entityId, status: 'active' })
    setProjects(res || [])
    if (!projectId && res && res.length > 0) setProjectId(res[0].id)
  }

  const loadApps = async () => {
    const params: any = {}
    if (entityId) params.entity_id = entityId
    if (!globalView && projectId) params.project_id = projectId
    if (statusFilter && statusFilter !== 'all') params.status = statusFilter
    if (reviewerFilter && reviewerFilter !== 'all') params.reviewer_email = reviewerFilter
    if (search) params.q = search
    const res = await advisoryListApplications(params)
    setApps(res || [])
  }

  useEffect(() => { loadProjects() }, [entityId])
  useEffect(() => { if (!pastView) loadApps() }, [entityId, projectId, globalView, statusFilter, pastView])
  useEffect(() => { if (pastView) (async()=>{ const list = await advisoryListArchivedApplications(); setArchived(list||[]) })() }, [pastView])
  useEffect(() => {
    const run = async () => {
      const offers = await advisoryListApplications({ entity_id: entityId, status: 'offer' })
      const map: Record<number, number> = {}
      ;(offers||[]).forEach((a:any) => { const pid = Number(a.target_project_id||0); if (!pid) return; map[pid] = (map[pid]||0)+1 })
      setOfferCounts(map)
    }
    run()
  }, [entityId])

  const grouped = useMemo(() => {
    const g: Record<Lane, AdvisoryApplication[]> = { new:[], reviewing:[], interview:[], offer:[], joined:[], rejected:[], withdrawn:[] }
    apps.forEach(a => {
      const s = (a.status as Lane) || 'new'
      if (g[s]) g[s].push(a)
      else g['new'].push(a)
    })
    return g
  }, [apps])

  const currentProject = useMemo(() => projects.find(p => p.id === projectId), [projects, projectId])

  // Reviewer badge (client-side): count new apps assigned to me since last seen
  const myEmail = (authUser?.email || '').toLowerCase()
  const lastSeenKey = myEmail ? `apps_last_seen_${myEmail}` : ''
  const lastSeen = useMemo(() => {
    try { return lastSeenKey ? (localStorage.getItem(lastSeenKey) || '') : '' } catch { return '' }
  }, [lastSeenKey])
  const newCount = useMemo(() => {
    if (!myEmail) return 0
    const since = lastSeen ? Date.parse(lastSeen) : 0
    return apps.filter(a => (a.reviewer_email||'').toLowerCase() === myEmail && (Date.parse(a.created_at||'') > since)).length
  }, [apps, myEmail, lastSeen])
  const markReviewed = () => {
    try { if (lastSeenKey) localStorage.setItem(lastSeenKey, new Date().toISOString()) } catch {}
  }

  const onDropToLane = async (aid: number, lane: Lane) => {
    if (busy) return
    // Capacity override warning for Offer/Joined when open_roles <= 0
    if ((lane === 'offer' || lane === 'joined') && currentProject && typeof currentProject.open_roles === 'number' && currentProject.open_roles <= 0) {
      const rationale = window.prompt('No open analyst roles available. Enter short rationale to proceed:')
      if (rationale === null) return
      setBusy(true)
      try {
        await advisoryUpdateApplication(aid, { status: lane, // @ts-ignore
          override_reason: rationale })
        await loadApps()
      } finally { setBusy(false) }
      return
    }
    setBusy(true)
    try {
      await advisoryUpdateApplication(aid, { status: lane })
      await loadApps()
    } finally {
      setBusy(false)
    }
  }

  const handleDrop = (ev: React.DragEvent<HTMLDivElement>, lane: Lane) => {
    ev.preventDefault()
    const idStr = ev.dataTransfer.getData('text/plain')
    const aid = Number(idStr)
    if (!aid) return
    onDropToLane(aid, lane)
  }

  const openDetail = async (id: number) => {
    try {
      const d = await advisoryGetApplication(id)
      setDetail(d as any)
    } catch {}
  }

  const card = (a: AdvisoryApplication) => (
    <div
      key={a.id}
      className="rounded-lg border border-border bg-card p-3 mb-2 cursor-grab"
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', String(a.id))}
      onClick={() => openDetail(a.id)}
    >
      <div className="text-sm font-medium">{a.first_name} {a.last_name}</div>
      <div className="text-xs text-muted-foreground">{a.school || '-'} - {a.program || '-'}</div>
      <div className="text-xs text-muted-foreground">{new Date(a.created_at || '').toLocaleString()}</div>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle>
              Applications {newCount>0 && (<span className="ml-2 text-xs px-2 py-1 rounded-full bg-blue-600 text-white">{newCount} new</span>)}
            </CardTitle>
            <CardDescription>Review, interview, and offer candidates</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <input placeholder="Search name/email/school/program" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{ if (e.key==='Enter') loadApps() }} className="px-3 py-2 border rounded bg-background text-sm w-64" />
            <Select value={statusFilter} onValueChange={(v)=>setStatusFilter(v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {LANES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={reviewerFilter} onValueChange={(v)=>setReviewerFilter(v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Reviewers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reviewers</SelectItem>
                <SelectItem value="anurmamade@ngicapitaladvisory.com">Andre</SelectItem>
                <SelectItem value="lwhitworth@ngicapitaladvisory.com">Landon</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadApps}>Filter</Button>
            <div className="h-6 w-px bg-border mx-2" />
            <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={globalView} onChange={e=>{ setGlobalView(e.target.checked); setPastView(false) }} /> Global View</label>
            <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={pastView} onChange={e=>{ setPastView(e.target.checked); setGlobalView(false) }} /> Past Applications</label>
            {newCount>0 && <Button variant="outline" onClick={markReviewed}>Mark reviewed</Button>}
          </div>
        </CardHeader>
      </Card>

      {!globalView && !pastView && (
        <div className="flex items-center gap-3">
          <select className="px-3 py-2 border rounded bg-background text-sm" value={projectId} onChange={e=>setProjectId(Number(e.target.value)||'')}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
          {!!currentProject && (
            <div className="text-sm text-muted-foreground">Open roles: {typeof currentProject.open_roles === 'number' ? currentProject.open_roles : '-'}</div>
          )}
        </div>
      )}

      {!globalView && !pastView ? (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-7 gap-3">
          {LANES.map(lane => (
            <div key={lane} className="rounded-xl border border-border bg-card/50 p-3"
              onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>handleDrop(e, lane)}>
              <div className="text-sm font-semibold mb-2 capitalize">{lane} <span className="text-xs text-muted-foreground">({grouped[lane].length})</span></div>
              <div>
                {grouped[lane].map(a => card(a))}
                {grouped[lane].length === 0 && <div className="text-xs text-muted-foreground">No applications</div>}
              </div>
            </div>
          ))}
        </div>
      ) : globalView ? (
        <div className="rounded-xl border border-border bg-card overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-3">Project</th>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">School</th>
                <th className="p-3">Program</th>
                <th className="p-3">Status</th>
                <th className="p-3">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {apps.map(a => (
                <tr key={a.id} className="border-b border-border hover:bg-muted/40 cursor-pointer" onClick={()=>openDetail(a.id)}>
                  <td className="p-3">
                    {projects.find(p => p.id === a.target_project_id)?.project_name || a.target_project_id}
                    {!!offerCounts[Number(a.target_project_id||0)] && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-black">Offer {offerCounts[Number(a.target_project_id||0)]}</span>
                    )}
                  </td>
                  <td className="p-3">{a.first_name} {a.last_name}</td>
                  <td className="p-3">{a.email}</td>
                  <td className="p-3">{a.school || '-'}</td>
                  <td className="p-3">{a.program || '-'}</td>
                  <td className="p-3 capitalize">{a.status}</td>
                  <td className="p-3">{new Date(a.created_at || '').toLocaleString()}</td>
                </tr>
              ))}
              {apps.length === 0 && (<tr><td className="p-3 text-muted-foreground" colSpan={7}>No applications</td></tr>)}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-3">Original ID</th>
                <th className="p-3">Email</th>
                <th className="p-3">Project</th>
                <th className="p-3">Archived</th>
                <th className="p-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {archived.map(a => (
                <tr key={a.id} className="border-b border-border">
                  <td className="p-3">{a.original_id}</td>
                  <td className="p-3">{a.email}</td>
                  <td className="p-3">{a.snapshot?.target_project_id || '-'}</td>
                  <td className="p-3">{a.archived_at}</td>
                  <td className="p-3">{a.reason || '-'}</td>
                </tr>
              ))}
              {archived.length === 0 && (<tr><td className="p-3 text-muted-foreground" colSpan={5}>No archived applications</td></tr>)}
            </tbody>
          </table>
        </div>
      )}
      {detail && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1" onClick={()=>setDetail(null)} />
          <div className="w-full max-w-xl h-full overflow-auto border-l border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{detail.first_name} {detail.last_name}</div>
                <div className="text-xs text-muted-foreground">{detail.email}</div>
              </div>
              <button className="px-2 py-1 rounded border" onClick={()=>setDetail(null)}>Close</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <select className="w-full px-2 py-2 border rounded bg-background text-sm" value={detail.status}
                  onChange={async e=>{ const v=e.target.value as any; await advisoryUpdateApplication(detail.id, { status: v }); const d=await advisoryGetApplication(detail.id); setDetail(d as any); await loadApps(); }}>
                  {LANES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Reviewer</label>
                <select className="w-full px-2 py-2 border rounded bg-background text-sm" value={detail.reviewer_email || ''}
                  onChange={async e=>{ await advisoryUpdateApplication(detail.id, { reviewer_email: e.target.value }); const d=await advisoryGetApplication(detail.id); setDetail(d as any); }}>
                  <option value="">Unassigned</option>
                  <option value="anurmamade@ngicapitaladvisory.com">Andre</option>
                  <option value="lwhitworth@ngicapitaladvisory.com">Landon</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Resume</div>
              {detail.resume_url ? (
                <a className="text-xs underline text-blue-600" href={detail.resume_url} target="_blank">Open resume</a>
              ) : (
                <div className="text-xs text-muted-foreground">No resume snapshot</div>
              )}
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Attachments (PDF)</div>
              <input type="file" accept="application/pdf" onChange={async (e)=>{
                const f = e.target.files?.[0]; if (!f) return; setUploading(true); try { await advisoryUploadApplicationAttachment(detail.id, f); const d=await advisoryGetApplication(detail.id); setDetail(d as any) } finally { setUploading(false) }
              }} />
              <ul className="space-y-1">
                {(detail.attachments||[]).map(a => (
                  <li key={a.id}><a href={a.file_url} className="text-xs underline" target="_blank">{a.file_name}</a> <span className="text-[11px] text-muted-foreground">({a.uploaded_at})</span></li>
                ))}
                {(!detail.attachments || detail.attachments.length===0) && <li className="text-xs text-muted-foreground">None</li>}
              </ul>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-2 rounded border" onClick={async()=>{ const r = prompt('Rejection reason (optional)') || undefined; await advisoryRejectApplication(detail.id, r); const d=await advisoryGetApplication(detail.id); setDetail(d as any); await loadApps() }}>Reject</button>
              <button className="px-3 py-2 rounded border" onClick={async()=>{ if (!confirm('Withdraw this application?')) return; await advisoryWithdrawApplication(detail.id); const d=await advisoryGetApplication(detail.id); setDetail(d as any); await loadApps() }}>Withdraw</button>
              <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={()=>{
                const email = (detail.email || '').toLowerCase()
                const pid = detail.target_project_id
                router.push(`/admin/ngi-advisory/onboarding?student_email=${encodeURIComponent(email)}${pid?`&project_id=${pid}`:''}`)
              }}>Start Onboarding</button>
            </div>
            <Timeline email={detail.email} />
          </div>
        </div>
      )}
    </div>
  )
}

function Timeline({ email }: { email: string }){
  const [items, setItems] = useState<{ applications:any[]; coffeechats:any[]; onboarding:any[] }|null>(null)
  useEffect(() => {
    let ignore=false
    const load = async () => {
      try {
        const students = await advisoryListStudents({ q: email })
        const sid = students?.find(s => (s.email||'').toLowerCase() === (email||'').toLowerCase())?.id || students?.[0]?.id
        if (!sid) return
        const t = await advisoryGetStudentTimeline(sid)
        if (!ignore) setItems(t)
      } catch {}
    }
    load(); return ()=>{ignore=true}
  }, [email])
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Timeline</div>
      {!items && <div className="text-xs text-muted-foreground">Loading...</div>}
      {items && (
        <div className="space-y-2">
          <div>
            <div className="text-xs font-semibold">Coffee Chats</div>
            {(items.coffeechats||[]).map((c,i)=> (
              <div key={i} className="text-xs text-muted-foreground">{c.status} - {c.scheduled_start}</div>
            ))}
            {(!items.coffeechats || items.coffeechats.length===0) && <div className="text-xs text-muted-foreground">None</div>}
          </div>
          <div>
            <div className="text-xs font-semibold">Onboarding</div>
            {(items.onboarding||[]).map((o,i)=> (
              <div key={i} className="text-xs text-muted-foreground">{o.status} - {o.created_at}</div>
            ))}
            {(!items.onboarding || items.onboarding.length===0) && <div className="text-xs text-muted-foreground">None</div>}
          </div>
        </div>
      )}
    </div>
  )
}


