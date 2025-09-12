"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context/AppContext'
import { useAuth } from '@/lib/auth'
import { advisoryListProjects, advisoryCreateProject, advisoryUpdateProject, apiClient, advisoryGetProjectLeads, advisorySetProjectLeads, advisoryGetProjectQuestions, advisorySetProjectQuestions, advisoryUploadProjectHero, advisoryUploadProjectGallery, advisoryUploadProjectShowcase, advisoryGetProjectLogos, advisoryUploadProjectLogo, advisoryGetKnownClients } from '@/lib/api'
import type { AdvisoryProject } from '@/types'
import { toast } from 'sonner'

// Known client registry (name -> logo URL). Add files under `apps/desktop/public/clients/`.
const KNOWN_CLIENTS: Record<string, string> = {
  'UC Investments': '/clients/uc-investments.svg',
  'BlackRock': '/clients/blackrock.svg',
  'Blackstone': '/clients/blackstone.svg',
  'Goldman Sachs': '/clients/goldman-sachs.svg',
  'JPMorgan': '/clients/jpmorgan.svg',
  'Morgan Stanley': '/clients/morgan-stanley.svg',
  'Citi': '/clients/citi.svg',
  'Wells Fargo': '/clients/wells-fargo.svg',
  'Vanguard': '/clients/vanguard.svg',
  'Fidelity': '/clients/fidelity.svg',
  'UBS': '/clients/ubs.svg',
  'HSBC': '/clients/hsbc.svg',
  'Bank of America': '/clients/bank-of-america.svg',
}

const BASE_ALLOWED = new Set([
  'lwhitworth@ngicapitaladvisory.com',
  'anurmamade@ngicapitaladvisory.com',
])

export default function AdvisoryProjectsPage() {
  const { state } = useApp()
  const { user, loading } = useAuth()
  const entityId = useMemo(() => Number(state.currentEntity?.id || 0), [state.currentEntity])
  const entityName = state.currentEntity?.legal_name || ''
  const [listLoading, setListLoading] = useState(false)
  const [projects, setProjects] = useState<AdvisoryProject[]>([])
  const [filterStatus, setFilterStatus] = useState<'all'|'draft'|'active'|'closed'>('all')
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [showDesigner, setShowDesigner] = useState(false)
  const [editing, setEditing] = useState<AdvisoryProject | null>(null)
  const [form, setForm] = useState<Partial<AdvisoryProject>>({
    project_name: '', client_name: '', summary: '', description: '', status: 'draft', mode: 'remote',
    team_size: undefined as any,
    allow_applications: 1 as any,
  })
  // Majors (UC curated) + aliases
  const MAJORS = [
    'Business','Finance','Accounting','Economics','Data Science','Computer Science','Electrical Engineering','Mechanical Engineering','Industrial Engineering','Information Systems','Statistics','Mathematics','Marketing','Operations Research','Design','Communications','Political Science'
  ]
  const ALIASES: Record<string,string> = {
    'EECS': 'Electrical Engineering',
    'CS': 'Computer Science',
  }
  const [majors, setMajors] = useState<string[]>([])
  // Leads are stored as emails on backend, displayed as names
  const LEADS = [
    { name: 'Andre Nurmamade', email: 'anurmamade@ngicapitaladvisory.com' },
    { name: 'Landon Whitworth', email: 'lwhitworth@ngicapitaladvisory.com' },
  ]
  const [leads, setLeads] = useState<string[]>([])
  const leadEmailToName = (em: string) => (LEADS.find(l => l.email.toLowerCase() === String(em).toLowerCase())?.name || em)
  const [questionsText, setQuestionsText] = useState<string>('')
  const [partnerLogos, setPartnerLogos] = useState<{ name: string; url: string }[]>([])
  const [selectedClients, setSelectedClients] = useState<{ name: string; url: string }[]>([])
  const [backerLogos, setBackerLogos] = useState<{ name: string; url: string }[]>([])
  const [newPartnerName, setNewPartnerName] = useState('')
  const [newBackerName, setNewBackerName] = useState('')
  const [uploadingHero, setUploadingHero] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [uploadingShowcase, setUploadingShowcase] = useState(false)
  const [cropOpen, setCropOpen] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropZoom, setCropZoom] = useState(1)
  const [cropX, setCropX] = useState(0)
  const [cropY, setCropY] = useState(0)
  const [pendingHeroBlob, setPendingHeroBlob] = useState<Blob | null>(null)
  const [knownClients, setKnownClients] = useState<{ name: string; slug: string; logo_url: string }[]>([])

  const [authCheckLoading, setAuthCheckLoading] = useState(true)
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
    const serverLower = (serverEmail || '').toLowerCase()
    return allowAll || devAllow || (!!emailLower && allowedSet.has(emailLower)) || (!!serverLower && allowedSet.has(serverLower))
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
          try {
            const me = await apiClient.getProfile()
            if (mounted) setServerEmail(me?.email || '')
          } catch {}
        }
      } finally {
        if (mounted) setAuthCheckLoading(false)
      }
    }
    check()
    return () => { mounted = false }
  }, [user?.email, serverEmail])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    const load = async () => {
      if (!allowed) return
      setListLoading(true)
      try {
        const params: any = {}
        if (filterStatus !== 'all') params.status = filterStatus
        if (searchDebounced) params.q = searchDebounced
        const items = await advisoryListProjects(params)
        setProjects(items)
      }
      finally { setListLoading(false) }
    }
    load()
  }, [allowed, filterStatus, searchDebounced])

  // Load leads for each project to display names on cards
  useEffect(() => {
    (async () => {
      try {
        // Fetch in sequence (small list); could be optimized
        const updated = await Promise.all(projects.map(async p => {
          try {
            const l = await advisoryGetProjectLeads(p.id)
            return { id: p.id, names: (l.leads || []).map(leadEmailToName) }
          } catch { return { id: p.id, names: [] as string[] } }
        }))
        // Attach names to project objects for rendering (non-intrusive)
        setProjects(prev => prev.map(p => {
          const m = updated.find(u => u.id === p.id)
          return Object.assign({}, p as any, { _lead_names: m?.names || [] })
        }))
      } catch {}
    })()
  }, [projects.length])

  const openNew = () => {
    setEditing(null)
    setForm({ entity_id: entityId as any, project_name: '', client_name: '', summary: '', status: 'draft', mode: 'remote', allow_applications: 1 as any })
    setShowDesigner(true)
  }
  const openEdit = (p: AdvisoryProject) => { setEditing(p); setForm(p); setShowDesigner(true) }
  const closeDesigner = () => setShowDesigner(false)

  useEffect(() => {
    const loadMeta = async () => {
      if (!editing) return
      try {
        const l = await advisoryGetProjectLeads(editing.id)
        setLeads(l.leads || [])
      } catch {}
      try {
        const q = await advisoryGetProjectQuestions(editing.id)
        setQuestionsText((q.prompts || []).join('\n'))
      } catch {}
      try {
        const logos = await advisoryGetProjectLogos(editing.id)
        setPartnerLogos(logos.partner_logos || [])
        setBackerLogos(logos.backer_logos || [])
        setSelectedClients((logos.partner_logos || []) as any)
      } catch {}
      setMajors((Array.isArray((editing as any).team_requirements) ? (editing as any).team_requirements : []))
    }
    loadMeta()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id])

  // Load known clients once
  useEffect(() => {
    (async () => {
      try { const res = await advisoryGetKnownClients(); setKnownClients(res.clients || []) } catch {}
    })()
  }, [])

  const onSave = async (publish = false) => {
      if (!form.project_name || !form.client_name || !form.summary) {
        toast.error('Name, client, and summary are required')
        return
      }
      // Pre-publish validations to mirror backend PRD rules for better UX
      if (publish) {
        const name = String(form.project_name || '').trim()
        const client = String(form.client_name || '').trim()
        const summary = String(form.summary || '').trim()
        const description = String(form.description || '').trim()
        const teamSize = Number((form as any).team_size || 0)
        const hours = Number((form as any).commitment_hours_per_week || 0)
        const duration = Number((form as any).duration_weeks || 0)
        const sd = (form as any).start_date as string | undefined
        const ed = (form as any).end_date as string | undefined
        const lenOk = (s: string, lo: number, hi: number) => s.length >= lo && s.length <= hi
        if (!lenOk(name, 4, 120)) return void toast.error('Project name must be 4–120 chars to publish')
        if (!lenOk(client, 2, 120)) return void toast.error('Client name must be 2–120 chars to publish')
        if (!lenOk(summary, 20, 200)) return void toast.error('Summary must be 20–200 chars to publish')
        if (!lenOk(description, 50, 4000)) return void toast.error('Description must be 50–4000 chars to publish')
        if (!Number.isFinite(teamSize) || teamSize < 1) return void toast.error('Team size must be ≥ 1 to publish')
        if (!Number.isFinite(hours) || hours < 1 || hours > 40) return void toast.error('Hours/week must be 1–40 to publish')
        if (!Number.isFinite(duration) || duration < 1) return void toast.error('Duration (weeks) must be ≥ 1 to publish')
        if (sd && ed && sd > ed) return void toast.error('End date must be on/after start date')
        if ((leads || []).length < 1 && (process.env.NEXT_PUBLIC_DISABLE_ADVISORY_AUTH || '0') !== '1') {
          return void toast.error('At least one project lead required to publish')
        }
      }
    const payload: any = { ...form, team_requirements: majors, partner_logos: selectedClients }
    payload.entity_id = entityId

    try {
      if (editing) {
        // Update metadata that can affect publish validation BEFORE publishing
        // Specifically, ensure leads/questions are saved before setting status to 'active'.
        if (publish) {
          try { await advisorySetProjectLeads(editing.id, leads) } catch {}
          try { const prompts = questionsText.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,10); await advisorySetProjectQuestions(editing.id, prompts) } catch {}
        }

        // Update basic fields (and status if publishing)
        const patch: any = { ...payload }
        if (publish) patch.status = 'active'
        await advisoryUpdateProject(editing.id, patch)
        
        // When not publishing, persist leads/questions after the field update
        if (!publish) {
          try { await advisorySetProjectLeads(editing.id, leads) } catch {}
          try { const prompts = questionsText.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,10); await advisorySetProjectQuestions(editing.id, prompts) } catch {}
        }
        // Upload pending hero if any (from pre-crop in non-upload flow)
        if (pendingHeroBlob) {
          setUploadingHero(true)
          try {
            const file = new File([pendingHeroBlob], 'hero.jpg', { type: 'image/jpeg' })
            const res = await advisoryUploadProjectHero(editing.id, file)
            setForm(f => ({ ...f, hero_image_url: res.hero_image_url }))
            setPendingHeroBlob(null)
          } finally { setUploadingHero(false) }
        }
      } else {
        if (!publish) {
          // Create as draft
          const created = await advisoryCreateProject({ ...payload, status: 'draft' } as any)
          const newId = created?.id
          if (newId) {
            if (leads.length) { try { await advisorySetProjectLeads(newId, leads) } catch {} }
            if (questionsText.trim()) { try { const prompts = questionsText.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,10); await advisorySetProjectQuestions(newId, prompts) } catch {} }
            if (pendingHeroBlob) {
              setUploadingHero(true)
              try {
                const file = new File([pendingHeroBlob], 'hero.jpg', { type: 'image/jpeg' })
                await advisoryUploadProjectHero(newId, file)
                setPendingHeroBlob(null)
              } finally { setUploadingHero(false) }
            }
          }
        } else {
          // Publish new project: create draft -> set leads/questions -> publish
          const created = await advisoryCreateProject({ ...payload, status: 'draft' } as any)
          const newId = created?.id
          if (newId) {
            try { await advisorySetProjectLeads(newId, leads) } catch {}
            try { const prompts = questionsText.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,10); await advisorySetProjectQuestions(newId, prompts) } catch {}
            if (pendingHeroBlob) {
              setUploadingHero(true)
              try {
                const file = new File([pendingHeroBlob], 'hero.jpg', { type: 'image/jpeg' })
                await advisoryUploadProjectHero(newId, file)
                setPendingHeroBlob(null)
              } finally { setUploadingHero(false) }
            }
            await advisoryUpdateProject(newId, { ...payload, status: 'active' } as any)
          }
        }
      }
      toast.success(publish ? 'Project published' : (editing ? 'Project updated' : 'Draft saved'))
      setShowDesigner(false)
      setProjects(await advisoryListProjects({ entity_id: entityId }))
    } catch (e: any) {
      const msg = (e?.response?.data?.detail || e?.message || 'Failed to save project')
      toast.error(String(msg))
    }
  }

  if (loading || authCheckLoading) {
    return (<div className="p-6">Loading…</div>)
  }
  if (!allowed) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">NGI Capital Advisory</h1>
        <p className="text-sm text-muted-foreground mt-2">Access restricted.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">NGI Capital Advisory Projects</h1>
          <div className="flex items-center gap-2">
            <select aria-label="Filter status" className="px-3 py-2 border rounded-md bg-background" value={filterStatus} onChange={e=>setFilterStatus(e.target.value as any)}>
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
            <input aria-label="Search projects" className="px-3 py-2 border rounded-md bg-background w-64" placeholder="Search projects" value={search} onChange={e=>setSearch(e.target.value)} />
            <button className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700" onClick={openNew}>+ New Project</button>
          </div>
        </div>
      </div>

      {/* List */}
      {listLoading ? (
        <div className="text-sm text-muted-foreground">Loading projects…</div>
      ) : (
        <div className="w-full flex flex-col divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
          {projects.map(p => (
            <ProjectCard key={p.id} p={p} onEdit={() => openEdit(p)} />
          ))}
          {projects.length === 0 && (
            <div className="text-sm text-muted-foreground">No projects yet.</div>
          )}
        </div>
      )}

      {/* Designer Drawer (simple panel) */}
      {showDesigner && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={closeDesigner}>
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-5xl bg-background border-l border-border shadow-xl" onClick={e=>e.stopPropagation()}>
            <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
              {/* Form */}
              <div className="p-6 space-y-3 overflow-auto">
                <h2 className="text-xl font-semibold mb-2">{editing ? 'Edit Project' : 'New Project'}</h2>
                <div className="grid grid-cols-1 gap-3">
                  <input className="w-full px-3 py-2 border rounded-md bg-background" placeholder="Project name" value={form.project_name || ''} onChange={e=>setForm(f=>({ ...f, project_name: e.target.value }))} />
                  {/* Clients multi-select */}
                  <div>
                    <div className="text-sm font-medium mb-1">Clients</div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedClients.map((c, i) => (
                        <span key={i} className="inline-flex items-center gap-2 px-2 py-1 text-xs rounded-full border">
                          <img src={c.url} alt={c.name} className="h-4 w-4 object-contain" />
                          {c.name}
                          <button className="text-muted-foreground hover:text-foreground" onClick={()=> setSelectedClients(prev => prev.filter((_,idx)=>idx!==i))}>x</button>
                        </span>
                      ))}
                    </div>
                    <input className="w-full px-3 py-2 border rounded-md bg-background" placeholder="Client name" value={form.client_name || ''} onChange={e=>setForm(f=>({ ...f, client_name: e.target.value }))} />
                    {(form.client_name || '').trim() && (knownClients || []).length > 0 && (
                      <div className="mt-1 border rounded-md bg-popover text-popover-foreground shadow max-h-48 overflow-auto">
                        {knownClients
                          .filter(c => c.name.toLowerCase().includes(String(form.client_name||'').toLowerCase()))
                          .slice(0,10)
                          .map(c => (
                            <div key={c.slug} className="px-3 py-2 text-sm hover:bg-muted cursor-pointer flex items-center gap-2" onClick={()=>{
                              setSelectedClients(prev => prev.some(p=>p.name===c.name) ? prev : [...prev, { name: c.name, url: c.logo_url }])
                              setForm(f=>({ ...f, client_name: '' }))
                            }}>
                              <img src={c.logo_url} alt={c.name} className="h-5 w-5 object-contain" />
                              <span>{c.name}</span>
                            </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <input className="w-full px-3 py-2 border rounded-md bg-background" placeholder="Summary" value={form.summary || ''} onChange={e=>setForm(f=>({ ...f, summary: e.target.value }))} />
                  <textarea className="w-full px-3 py-2 border rounded-md bg-background" placeholder="Description" value={form.description || ''} onChange={e=>setForm(f=>({ ...f, description: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <select className="px-3 py-2 border rounded-md bg-background" value={form.mode || 'remote'} onChange={e=>setForm(f=>({ ...f, mode: e.target.value as any }))}>
                      <option value="remote">Remote</option>
                      <option value="in_person">In person</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                    <select className="px-3 py-2 border rounded-md bg-background" value={form.status || 'draft'} onChange={e=>setForm(f=>({ ...f, status: e.target.value as any }))}>
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className="px-3 py-2 border rounded-md bg-background" value={form.start_date || ''} onChange={e=>setForm(f=>({ ...f, start_date: e.target.value }))} />
                    <input type="date" className="px-3 py-2 border rounded-md bg-background" value={form.end_date || ''} onChange={e=>setForm(f=>({ ...f, end_date: e.target.value }))} />
                  </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" className="px-3 py-2 border rounded-md bg-background" placeholder="Duration (weeks)" value={form.duration_weeks || '' as any} onChange={e=>setForm(f=>({ ...f, duration_weeks: Number(e.target.value||0) }))} />
                  <input type="number" className="px-3 py-2 border rounded-md bg-background" placeholder="Hours/week" value={form.commitment_hours_per_week || '' as any} onChange={e=>setForm(f=>({ ...f, commitment_hours_per_week: Number(e.target.value||0) }))} />
                </div>
                  <input className="w-full px-3 py-2 border rounded-md bg-background" placeholder="Project code (auto)" value={form.project_code || ''} readOnly disabled />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" className="px-3 py-2 border rounded-md bg-background" placeholder="Team size" value={(form as any).team_size || ''} onChange={e=>setForm(f=>({ ...f, team_size: Number(e.target.value||0) } as any))} />
                  <label className="flex items-center gap-2 text-sm text-foreground/90">
                    <input type="checkbox" checked={Boolean((form as any).allow_applications ?? 1)} onChange={e=>setForm(f=>({ ...f, allow_applications: (e.target.checked ? 1 : 0) } as any))} />
                    Allow applications
                  </label>
                </div>
                {/* Project Leads (multi-select by name, stores emails) */}
                <div className="mt-2">
                  <div className="text-sm font-medium">Project Leads</div>
                  <LeadsSelect options={LEADS} value={leads} onChange={setLeads} />
                </div>
                <textarea className="w-full px-3 py-2 border rounded-md bg-background" placeholder="Eligibility notes" value={form.eligibility_notes || ''} onChange={e=>setForm(f=>({ ...f, eligibility_notes: e.target.value }))} />
                <textarea className="w-full px-3 py-2 border rounded-md bg-background" placeholder="Internal notes (hidden)" value={form.notes_internal || ''} onChange={e=>setForm(f=>({ ...f, notes_internal: e.target.value }))} />

                {/* Partners & Backers Logos (edit mode) */}
                {editing && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="text-sm font-medium">Partners</div>
                      <div className="flex items-center gap-2 mt-1">
                        <input className="px-3 py-2 border rounded-md bg-background flex-1" placeholder="Organization name (e.g., UC Investments)" value={newPartnerName} onChange={e=>setNewPartnerName(e.target.value)} />
                        <label className="px-3 py-2 border rounded-md bg-background cursor-pointer">
                          Upload Logo
                          <input type="file" accept="image/*" className="hidden" onChange={async (e)=>{
                            const file = e.target.files?.[0]; if (!file) return
                            try {
                              const res = await advisoryUploadProjectLogo(editing.id, 'partner', file, newPartnerName || undefined)
                              setPartnerLogos((res as any).partner_logos || [])
                              setNewPartnerName('')
                            } catch { toast.error('Failed to upload partner logo') }
                          }} />
                        </label>
                      </div>
                      {partnerLogos.length > 0 && (
                        <div className="flex flex-wrap gap-3 mt-2">
                          {partnerLogos.map((pl, i) => (
                            <div key={i} className="flex items-center gap-2 border rounded-md px-2 py-1">
                              <img src={pl.url} alt={pl.name} className="h-6 w-6 object-contain" />
                              <span className="text-xs">{pl.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium">Backers</div>
                      <div className="flex items-center gap-2 mt-1">
                        <input className="px-3 py-2 border rounded-md bg-background flex-1" placeholder="Organization name (e.g., BlackRock)" value={newBackerName} onChange={e=>setNewBackerName(e.target.value)} />
                        <label className="px-3 py-2 border rounded-md bg-background cursor-pointer">
                          Upload Logo
                          <input type="file" accept="image/*" className="hidden" onChange={async (e)=>{
                            const file = e.target.files?.[0]; if (!file) return
                            try {
                              const res = await advisoryUploadProjectLogo(editing.id, 'backer', file, newBackerName || undefined)
                              setBackerLogos((res as any).backer_logos || [])
                              setNewBackerName('')
                            } catch { toast.error('Failed to upload backer logo') }
                          }} />
                        </label>
                      </div>
                      {backerLogos.length > 0 && (
                        <div className="flex flex-wrap gap-3 mt-2">
                          {backerLogos.map((pl, i) => (
                            <div key={i} className="flex items-center gap-2 border rounded-md px-2 py-1">
                              <img src={pl.url} alt={pl.name} className="h-6 w-6 object-contain" />
                              <span className="text-xs">{pl.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Team Requirements (Majors) */}
                <div className="mt-2">
                  <div className="text-sm font-medium">Team Requirements (Majors)</div>
                  <MajorsChips
                    allMajors={MAJORS}
                    aliases={ALIASES}
                    value={majors}
                    onChange={setMajors}
                  />
                </div>

                {/* Application Questions */}
                <div className="mt-2">
                  <div className="text-sm font-medium">Application Questions (max 10, one per line)</div>
                  <textarea className="w-full px-3 py-2 border rounded-md bg-background" rows={6} placeholder={"Why are you interested in this project?\nWhat relevant experience do you have?"} value={questionsText} onChange={e=>setQuestionsText(e.target.value)} />
                </div>

                {/* Media Uploads */}
                <div className="mt-3 space-y-2">
                  <div className="text-sm font-medium">Media</div>
                  <div className="flex items-center gap-2 text-sm">
                    <label className="px-3 py-2 border rounded-md cursor-pointer">
                      Upload Hero
                      <input type="file" accept="image/*" className="hidden" onChange={async e=>{
                        const file = e.target.files?.[0]; if (!file) return
                        const reader = new FileReader()
                        reader.onload = () => { setCropSrc(reader.result as string); setCropOpen(true) }
                        reader.readAsDataURL(file)
                      }} />
                    </label>
                    {uploadingHero && <span>Uploading...</span>}
                  </div>
                  {editing && (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <label className="px-3 py-2 border rounded-md cursor-pointer">
                          Add Gallery Image
                          <input type="file" accept="image/*" className="hidden" onChange={async e=>{
                            const file = e.target.files?.[0]; if (!file || !editing) return
                            setUploadingGallery(true)
                            try { const res = await advisoryUploadProjectGallery(editing.id, file); setForm(f=>({ ...f, gallery_urls: res.gallery_urls as any })) }
                            catch (err:any) { toast.error(String(err?.message || 'Gallery upload failed')) }
                            finally { setUploadingGallery(false) }
                          }} />
                        </label>
                        {uploadingGallery && <span>Uploading...</span>}
                      </div>
                      {((form.gallery_urls || []) as any[]).length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {(form.gallery_urls as any[]).map((g: any, i: number)=> (
                            <img key={i} src={g} alt="" className="h-16 w-24 object-cover rounded border" />
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <label className="px-3 py-2 border rounded-md cursor-pointer">
                          Upload Showcase PDF (when closed)
                          <input type="file" accept="application/pdf" className="hidden" onChange={async e=>{
                            const file = e.target.files?.[0]; if (!file || !editing) return
                            setUploadingShowcase(true)
                            try { const res = await advisoryUploadProjectShowcase(editing.id, file); setForm(f=>({ ...f, showcase_pdf_url: (res as any).showcase_pdf_url })) }
                            catch (err:any) { toast.error(String(err?.message || 'Showcase upload failed')) }
                            finally { setUploadingShowcase(false) }
                          }} />
                        </label>
                        {uploadingShowcase && <span>Uploading...</span>}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <button className="px-4 py-2 rounded-md border text-foreground hover:bg-muted" onClick={closeDesigner}>Cancel</button>
                <button className="px-4 py-2 rounded-md bg-muted text-foreground hover:bg-muted/80 border" onClick={()=>onSave(false)}>{editing ? 'Save' : 'Save Draft'}</button>
                <button className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700" onClick={()=>onSave(true)}>{editing ? 'Update' : 'Publish'}</button>
              </div>
              </div>
              {/* Live Preview */}
              <div className="p-6 bg-muted/40 overflow-auto">
                <h2 className="text-sm font-medium text-muted-foreground mb-2">Live Preview</h2>
                <ProjectCard p={{
                  id: editing?.id || 0,
                  entity_id: entityId,
                  client_name: form.client_name || '',
                  project_name: form.project_name || '',
                  summary: form.summary || '',
                  description: form.description,
                  status: (form.status as any) || 'draft',
                  mode: (form.mode as any) || 'remote',
                  location_text: form.location_text,
                  start_date: form.start_date,
                  end_date: form.end_date,
                  duration_weeks: form.duration_weeks,
                  commitment_hours_per_week: form.commitment_hours_per_week,
                  project_code: form.project_code,
                  project_lead: undefined,
                  contact_email: undefined,
                  partner_badges: form.partner_badges || [],
                  backer_badges: form.backer_badges || [],
                  tags: form.tags || [],
                  hero_image_url: form.hero_image_url,
                  gallery_urls: form.gallery_urls || [],
                  apply_cta_text: form.apply_cta_text,
                  apply_url: undefined,
                  eligibility_notes: form.eligibility_notes,
                  notes_internal: form.notes_internal,
                }} onEdit={()=>{}} />
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Global crop dialog overlay */}
      <CropImageDialog
        open={cropOpen}
        src={cropSrc}
        onClose={()=>{ setCropOpen(false); setCropSrc(null) }}
        onConfirm={async (blob) => {
          if (editing) {
            setUploadingHero(true)
            try {
              const file = new File([blob], 'hero.jpg', { type: 'image/jpeg' })
              const res = await advisoryUploadProjectHero(editing.id, file)
              setForm(f => ({ ...f, hero_image_url: res.hero_image_url }))
            } catch (err: any) {
              toast.error(String(err?.message || 'Hero upload failed'))
            } finally {
              setUploadingHero(false)
            }
          } else {
            // New project: keep blob and preview locally until save
            setPendingHeroBlob(blob)
            try {
              const url = URL.createObjectURL(blob)
              setForm(f => ({ ...f, hero_image_url: url }))
            } catch {}
          }
          setCropOpen(false); setCropSrc(null)
        }}
        zoom={cropZoom} setZoom={setCropZoom} x={cropX} setX={setCropX} y={cropY} setY={setCropY}
      />
    </div>
  )
}

function ProjectCard({ p, onEdit }: { p: AdvisoryProject; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const badges = [...(p.partner_badges||[]), ...(p.backer_badges||[])]
  const partnerLogos = (p as any).partner_logos || []
  const backerLogos = (p as any).backer_logos || []
  const statusIsActive = String(p.status).toLowerCase() === 'active'
  const hero = p.hero_image_url || ((p as any).gallery_urls?.[0]) || ''
  const isAbsolute = (u: string) => /^(\/|https?:|blob:|data:)/.test(u)
  const heroSrc = hero ? (isAbsolute(String(hero)) ? String(hero) : `/${hero}`) : ''
  const withBasePath = (u?: string) => {
    const s = String(u || '')
    if (!s) return s
    if (/^(https?:|data:|blob:)/.test(s)) return s
    const baseUrl = (process.env.NEXT_PUBLIC_ADMIN_BASE_URL || '/admin')
    const basePath = baseUrl.replace(/^https?:\/\/[^/]+/i, '') || ''
    if (s.startsWith('/clients/')) return `${basePath}${s}`
    return s
  }
  const autoClientLogo = (() => {
    const name = (p.client_name || '').trim()
    if (!name) return null
    const url = KNOWN_CLIENTS[name]
    return url ? { name, url } : null
  })()
  return (
    <div
      className="w-full cursor-pointer hover:bg-accent/30"
      onClick={() => { if (typeof window !== 'undefined') window.open(`${process.env.NEXT_PUBLIC_ADMIN_BASE_URL || '/admin'}/ngi-advisory/projects/${p.id}`, '_blank') }}
    >
      <div className="flex items-center p-3 md:p-4 gap-4">
        <div className="h-36 md:h-44 w-56 md:w-72 bg-muted rounded-md overflow-hidden flex-shrink-0 relative">
          {heroSrc ? (
            <img src={heroSrc} alt="hero" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-muted" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {/* Title + Status */}
          <div className="flex items-start gap-2">
            <div className="text-base md:text-lg font-semibold truncate">{p.project_name}</div>
            <span className={`text-xxs ml-auto ${statusIsActive ? 'text-green-600' : 'text-muted-foreground'}`}>{statusIsActive ? 'Active' : (String(p.status || '').charAt(0).toUpperCase() + String(p.status || '').slice(1))}</span>
          </div>
          {/* Client identity (logo + name) */}
          <div className="mt-1 flex items-center gap-2 min-w-0">
            {(autoClientLogo || partnerLogos[0]) && (
              <img src={withBasePath((autoClientLogo?.url || (partnerLogos[0] as any)?.url) as string)} alt={p.client_name || 'Client'} className="h-5 w-5 object-contain" />
            )}
            <div className="text-xs text-foreground truncate">{p.client_name}</div>
          </div>
          <div className="text-sm text-muted-foreground mt-1 line-clamp-1 md:line-clamp-2">{p.summary}</div>
          {/* Stats tags */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {p.duration_weeks ? (<span className="text-xxs px-2 py-0.5 rounded border">{p.duration_weeks} weeks</span>) : null}
            {p.commitment_hours_per_week ? (<span className="text-xxs px-2 py-0.5 rounded border">{p.commitment_hours_per_week} hrs/wk</span>) : null}
            {typeof (p as any).team_size === 'number' && (p as any).team_size > 0 ? (<span className="text-xxs px-2 py-0.5 rounded border">Team {(p as any).team_size}</span>) : null}
            {(p.start_date || p.end_date) ? (
              <span className="text-xxs px-2 py-0.5 rounded border">
                {(p.start_date || '').slice(0,10)}{p.end_date ? ' → ' + String(p.end_date).slice(0,10) : ''}
              </span>
            ) : null}
          </div>
          {/* Logos or badges */}
          <div className="flex items-center gap-3 mt-2">
            {[autoClientLogo, ...partnerLogos, ...backerLogos].filter(Boolean).slice(0,4).map((x: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <img src={withBasePath(x.url)} alt={x.name} className="h-5 w-5 object-contain" />
                <span className="text-xs text-muted-foreground hidden sm:inline">{x.name}</span>
              </div>
            ))}
            {partnerLogos.length === 0 && badges.slice(0,3).map((b,i)=> (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{b}</span>
            ))}
          </div>
          {(p as any)._lead_names && (p as any)._lead_names.length > 0 && (
            <div className="text-xs text-muted-foreground/90 mt-1 truncate">Leads: {(p as any)._lead_names.join(', ')}</div>
          )}
          {typeof (p as any).open_roles === 'number' && typeof (p as any).team_size === 'number' ? (
            <div className="text-xs text-muted-foreground/90 mt-1">Open roles: {(p as any).open_roles} / {(p as any).team_size}</div>
          ) : null}
          {expanded && (
            <div className="mt-3 text-sm text-foreground/90">{p.description || '—'}</div>
          )}
          <div className="mt-3 flex items-center gap-2" onClick={(e)=>e.stopPropagation()}>
            <button className="px-3 py-1.5 text-sm rounded-md border" onClick={onEdit}>Edit</button>
            <button className="px-3 py-1.5 text-sm rounded-md border">Deactivate</button>
            {(() => { const base = (process.env.NEXT_PUBLIC_STUDENT_BASE_URL || 'http://localhost:3001').replace(/\/$/, ''); const url = `${base}/projects/${p.id}`; return (
              <a className="ml-auto text-sm text-blue-600 hover:underline" href={url} target="_blank" rel="noreferrer">Student View</a>
            )})()}
          </div>
        </div>
      </div>
    </div>
  )
}


// Majors chips input with basic suggestions and alias handling
function MajorsChips({ allMajors, aliases, value, onChange }: { allMajors: string[]; aliases: Record<string,string>; value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('')
  const normalized = (s: string) => (aliases[s] || s)
  const add = (s: string) => {
    const v = normalized(s.trim())
    if (!v) return
    const exists = value.some(x => x.toLowerCase() === v.toLowerCase())
    if (!exists) onChange([...value, v])
    setInput('')
  }
  const remove = (s: string) => onChange(value.filter(x => x !== s))
  const suggestions = allMajors.filter(m => m.toLowerCase().includes(input.trim().toLowerCase()) && !value.includes(m)).slice(0,6)
  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map(m => (
          <span key={m} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-muted border">
            {m}
            <button className="text-muted-foreground hover:text-foreground" onClick={() => remove(m)}>×</button>
          </span>
        ))}
      </div>
      <input
        className="w-full px-3 py-2 border rounded-md bg-background"
        placeholder="Type a major (e.g., CS, Finance) and press Enter"
        value={input}
        onChange={e=>setInput(e.target.value)}
        onKeyDown={e=> {
          if (e.key === 'Enter') { e.preventDefault(); add(input) }
        }}
      />
      {input && suggestions.length > 0 && (
        <div className="mt-1 border rounded-md bg-popover text-popover-foreground shadow">
          {suggestions.map(s => (
            <div key={s} className="px-3 py-2 text-sm hover:bg-muted cursor-pointer" onClick={()=>add(s)}>{s}</div>
          ))}
        </div>
      )}
    </div>
  )}


// Simple 16:9 crop dialog using CSS transforms + canvas
function CropImageDialog({ open, src, onClose, onConfirm, zoom, setZoom, x, setX, y, setY }: {
  open: boolean;
  src: string | null;
  onClose: () => void;
  onConfirm: (blob: Blob) => void;
  zoom: number; setZoom: (v: number) => void; x: number; setX: (v: number) => void; y: number; setY: (v: number) => void;
}) {
  if (!open || !src) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-3xl p-4" onClick={e=>e.stopPropagation()}>
        <div className="text-lg font-semibold mb-2">Crop Hero (16:9)</div>
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          <div className="absolute inset-0 overflow-hidden bg-black/80">
            <img
              src={src}
              alt="to-crop"
              style={{ position:'absolute', left:'50%', top:'50%', transform:`translate(-50%, -50%) scale(${zoom}) translate(${x}px, ${y}px)`, userSelect:'none', pointerEvents:'none', maxWidth:'none' }}
            />
            <div className="absolute inset-0 border-2 border-white/60 pointer-events-none" />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 items-center">
          <label className="text-sm">Zoom<input className="w-full" type="range" min={0.5} max={3} step={0.01} value={zoom} onChange={e=>setZoom(Number(e.target.value))} /></label>
          <label className="text-sm">X<input className="w-full" type="range" min={-300} max={300} step={1} value={x} onChange={e=>setX(Number(e.target.value))} /></label>
          <label className="text-sm">Y<input className="w-full" type="range" min={-300} max={300} step={1} value={y} onChange={e=>setY(Number(e.target.value))} /></label>
        </div>
        <div className="mt-4 flex items-center gap-2 justify-end">
          <button className="px-3 py-1.5 border rounded-md" onClick={onClose}>Cancel</button>
          <button className="px-3 py-1.5 rounded-md bg-blue-600 text-white" onClick={async ()=>{
            const w = 1280, h = 720
            const canvas = document.createElement('canvas')
            canvas.width = w; canvas.height = h
            const ctx = canvas.getContext('2d')!
            ctx.fillStyle = '#000'; ctx.fillRect(0,0,w,h)
            const img = new Image()
            img.onload = () => {
              const baseScale = Math.max(w / (img.naturalWidth || 1), h / (img.naturalHeight || 1))
              const scale = baseScale * (zoom || 1)
              const dw = (img.naturalWidth || 1) * scale
              const dh = (img.naturalHeight || 1) * scale
              const dx = (w - dw) / 2 + x
              const dy = (h - dh) / 2 + y
              ctx.imageSmoothingQuality = 'high'
              ctx.drawImage(img, dx, dy, dw, dh)
              canvas.toBlob(b=>{ if (b) onConfirm(b) }, 'image/jpeg', 0.9)
            }
            img.src = src
          }}>Crop & Save</button>
        </div>
      </div>
    </div>
  )
}

// Leads multi-select by name; stores emails
function LeadsSelect({ options, value, onChange }: { options: { name: string; email: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  const [query, setQuery] = useState('')
  const selected = value.map(v => options.find(o => o.email.toLowerCase() === v.toLowerCase()) || { name: v, email: v })
  const add = (opt: { name: string; email: string }) => {
    if (!value.includes(opt.email)) onChange([...value, opt.email])
    setQuery('')
  }
  const remove = (em: string) => onChange(value.filter(v => v.toLowerCase() !== em.toLowerCase()))
  const filtered = options.filter(o => o.name.toLowerCase().includes(query.toLowerCase()) || o.email.toLowerCase().includes(query.toLowerCase()))
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {selected.map(s => (
          <span key={s.email} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-muted border">
            {s.name}
            <button className="text-muted-foreground hover:text-foreground" onClick={() => remove(s.email)}>x</button>
          </span>
        ))}
      </div>
      <input className="w-full px-3 py-2 border rounded-md bg-background" placeholder="Add lead by name" value={query} onChange={e=>setQuery(e.target.value)} />
      {query && (
        <div className="mt-1 border rounded-md bg-popover text-popover-foreground shadow">
          {filtered.map(opt => (
            <div key={opt.email} className="px-3 py-2 text-sm hover:bg-muted cursor-pointer" onClick={()=>add(opt)}>
              {opt.name} <span className="text-muted-foreground">({opt.email})</span>
            </div>
          ))}
          {filtered.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>}
        </div>
      )}
    </div>
  )
}

// Leads multi-select by name; stores emails
