"use client"

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useApp } from '@/lib/context/AppContext'
import { useAuth } from '@/lib/auth'
import { advisoryListProjects, advisoryCreateProject, advisoryUpdateProject, apiClient, advisoryGetProjectLeads, advisorySetProjectLeads, advisoryGetProjectQuestions, advisorySetProjectQuestions, advisorySetProjectQuestionsTyped, advisoryUploadProjectHero, advisoryUploadProjectShowcase, advisoryGetProjectLogos, advisoryUploadProjectLogo, advisoryGetKnownClients, advisoryGetProject } from '@/lib/api'
import type { AdvisoryProject } from '@/types'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import ModernProjectCard from '@/components/advisory/ModernProjectCard'
import ImageCropModal from '@/components/advisory/ImageCropModal'
import ProjectDetailModal from '@/components/advisory/ProjectDetailModal'
import { ProjectEditorModal } from '@/components/advisory/ProjectEditorModal'

// Known client registry (name -> logo URL) - using Clearbit Logo API
const KNOWN_CLIENTS: Record<string, string> = {
  'UC Endowment': '/clients/uc-endowment.svg',
  'UC Investments': '/clients/uc-endowment.svg',
  'BlackRock': 'https://logo.clearbit.com/blackrock.com',
  'Blackstone': 'https://logo.clearbit.com/blackstone.com',
  'Goldman Sachs': 'https://logo.clearbit.com/goldmansachs.com',
  'JPMorgan': 'https://logo.clearbit.com/jpmorganchase.com',
  'Morgan Stanley': 'https://logo.clearbit.com/morganstanley.com',
  'Citi': 'https://logo.clearbit.com/citi.com',
  'Wells Fargo': 'https://logo.clearbit.com/wellsfargo.com',
  'Vanguard': 'https://logo.clearbit.com/vanguard.com',
  'Fidelity': 'https://logo.clearbit.com/fidelity.com',
  'UBS': 'https://logo.clearbit.com/ubs.com',
  'HSBC': 'https://logo.clearbit.com/hsbc.com',
  'Bank of America': 'https://logo.clearbit.com/bankofamerica.com',
  'Haas Finance Group': '/clients/haas-finance.svg',
  'KKR': 'https://logo.clearbit.com/kkr.com',
  'Apollo Global': 'https://logo.clearbit.com/apollo.com',
  'Carlyle Group': 'https://logo.clearbit.com/carlyle.com',
  'TPG Capital': 'https://logo.clearbit.com/tpg.com',
  'Bain Capital': 'https://logo.clearbit.com/bain.com',
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
  const [sortBy, setSortBy] = useState<'newest'|'oldest'|'name'|'client'>('newest')
  const [showDesigner, setShowDesigner] = useState(false)
  const [editing, setEditing] = useState<AdvisoryProject | null>(null)
  const [form, setForm] = useState<Partial<AdvisoryProject>>({
    project_name: '', client_name: '', summary: '', description: '', status: 'draft', mode: 'remote',
    team_size: undefined as any,
    allow_applications: 1 as any,
  })
  // Majors (UC Berkeley comprehensive list) + aliases
  const MAJORS = [
    // Haas School of Business
    'Business Administration',
    // College of Engineering
    'Bioengineering',
    'Civil Engineering',
    'Computer Science',
    'Data Science',
    'Electrical Engineering & Computer Sciences',
    'Engineering Mathematics & Statistics',
    'Engineering Physics',
    'Environmental Engineering Science',
    'Industrial Engineering & Operations Research',
    'Materials Science & Engineering',
    'Mechanical Engineering',
    'Nuclear Engineering',
    // College of Letters & Science - Physical Sciences
    'Applied Mathematics',
    'Astrophysics',
    'Chemistry',
    'Earth and Planetary Science',
    'Mathematics',
    'Physics',
    'Statistics',
    // College of Letters & Science - Biological Sciences
    'Biology',
    'Integrative Biology',
    'Molecular & Cell Biology',
    'Molecular Environmental Biology',
    'Nutritional Science & Toxicology',
    'Plant Biology',
    // College of Letters & Science - Social Sciences
    'African American Studies',
    'American Studies',
    'Anthropology',
    'Asian American and Asian Diaspora Studies',
    'Cognitive Science',
    'Demography',
    'Economics',
    'Ethnic Studies',
    'Gender and Women\'s Studies',
    'Geography',
    'History',
    'Interdisciplinary Studies',
    'Linguistics',
    'Political Economy',
    'Political Science',
    'Psychology',
    'Public Health',
    'Social Welfare',
    'Sociology',
    // College of Letters & Science - Arts & Humanities
    'Architecture',
    'Art History',
    'Art Practice',
    'Classics',
    'Comparative Literature',
    'East Asian Languages and Cultures',
    'English',
    'Film and Media',
    'French',
    'German',
    'History of Art',
    'Italian Studies',
    'Media Studies',
    'Middle Eastern Languages and Cultures',
    'Music',
    'Near Eastern Studies',
    'Philosophy',
    'Rhetoric',
    'Scandinavian',
    'Slavic Languages and Literatures',
    'South and Southeast Asian Studies',
    'Spanish and Portuguese',
    'Theater, Dance, and Performance Studies',
    // Information & Data
    'Information',
    'Information Science',
    // Other
    'Conservation and Resource Studies',
    'Environmental Economics and Policy',
    'Environmental Science',
    'Forestry and Natural Resources',
    'Legal Studies',
    'Peace and Conflict Studies',
    'Urban Studies'
  ].sort()
  const ALIASES: Record<string,string> = {
    'EECS': 'Electrical Engineering & Computer Sciences',
    'CS': 'Computer Science',
    'MCB': 'Molecular & Cell Biology',
    'IB': 'Integrative Biology',
    'IEOR': 'Industrial Engineering & Operations Research',
    'MSE': 'Materials Science & Engineering',
    'ME': 'Mechanical Engineering',
    'BioE': 'Bioengineering',
    'Cog Sci': 'Cognitive Science',
    'Poli Sci': 'Political Science',
    'Poli Econ': 'Political Economy',
    'Econ': 'Economics',
    'Stats': 'Statistics',
    'Math': 'Mathematics',
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
  const [qItems, setQItems] = useState<Array<{ type: 'text'|'mcq'; prompt: string; choices?: string[] }>>([])
  const [selectedClients, setSelectedClients] = useState<{ name: string; url: string }[]>([])
  const [newPartnerName, setNewPartnerName] = useState('')
  const [uploadingHero, setUploadingHero] = useState(false)
  // (gallery removed)
  const [uploadingShowcase, setUploadingShowcase] = useState(false)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string>('')
  const [pendingHeroBlob, setPendingHeroBlob] = useState<Blob | null>(null)
  const [knownClients, setKnownClients] = useState<{ name: string; slug: string; logo_url: string }[]>([])
  // Modern full-view preview modal
  const [previewProject, setPreviewProject] = useState<AdvisoryProject | null>(null)

  const [authCheckLoading, setAuthCheckLoading] = useState(true)
  const [serverEmail, setServerEmail] = useState('')
  
  // Sorted and filtered projects
  const displayedProjects = useMemo(() => {
    let filtered = [...projects];
    
    // Sort
    if (sortBy === 'newest') {
      filtered.sort((a, b) => (b.id || 0) - (a.id || 0));
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => (a.id || 0) - (b.id || 0));
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => (a.project_name || '').localeCompare(b.project_name || ''));
    } else if (sortBy === 'client') {
      filtered.sort((a, b) => (a.client_name || '').localeCompare(b.client_name || ''));
    }
    
    return filtered;
  }, [projects, sortBy])
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

  const loadProjects = useCallback(async () => {
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
  }, [allowed, filterStatus, searchDebounced])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

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
        if (Array.isArray((q as any).items) && (q as any).items.length) {
          const items: Array<{ type: 'text'|'mcq'; prompt: string; choices: string[] }> = (q as any).items.map((it: any) => ({
            type: (String(it.type||'text').toLowerCase()==='mcq'?'mcq':'text') as 'text'|'mcq',
            prompt: String(it.prompt||''),
            choices: Array.isArray(it.choices) ? it.choices.map((c:any)=>String(c)) : []
          }))
          setQItems(items)
          setQuestionsText(items.map((i) => i.prompt).join('\n'))
        } else {
          const prompts = Array.isArray((q as any).prompts) ? (q as any).prompts.map((p:any)=>String(p)) : []
          setQuestionsText(prompts.join('\n'))
          setQItems(prompts.map((p:string)=>({ type:'text' as const, prompt:p })))
        }
      } catch { setQItems([]); setQuestionsText('') }
      try {
        const logos = await advisoryGetProjectLogos(editing.id)
        const combined = [ ...(logos.partner_logos || []), ...(logos.backer_logos || []) ] as any
        setSelectedClients(combined)
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
      const effectiveClient = String(form.client_name || (selectedClients[0]?.name || '')).trim()
      if (!form.project_name || !effectiveClient || !form.summary) {
        toast.error('Name, client, and summary are required')
        return
      }
      // Pre-publish validations to mirror backend PRD rules for better UX
      if (publish) {
        const name = String(form.project_name || '').trim()
        const client = effectiveClient
        const summary = String(form.summary || '').trim()
        const description = String(form.description || '').trim()
        const teamSize = Number((form as any).team_size || 0)
        const hours = Number((form as any).commitment_hours_per_week || 0)
        const duration = Number((form as any).duration_weeks || 0)
        const sd = (form as any).start_date as string | undefined
        const ed = (form as any).end_date as string | undefined
        const lenOk = (s: string, lo: number, hi: number) => s.length >= lo && s.length <= hi
        if (!lenOk(name, 4, 120)) return void toast.error('Project name must be 4-120 chars to publish')
        if (!lenOk(client, 2, 120)) return void toast.error('Client name must be 2-120 chars to publish')
        if (!lenOk(summary, 20, 200)) return void toast.error('Summary must be 20-200 chars to publish')
        if (!lenOk(description, 50, 4000)) return void toast.error('Description must be 50-4000 chars to publish')
        if (!Number.isFinite(teamSize) || teamSize < 1) return void toast.error('Team size must be at least 1 to publish')
        if (!Number.isFinite(hours) || hours < 1 || hours > 40) return void toast.error('Hours/week must be 1-40 to publish')
        if (!Number.isFinite(duration) || duration < 1) return void toast.error('Duration (weeks) must be at least 1 to publish')
        if (sd && ed && sd > ed) return void toast.error('End date must be on/after start date')
        if ((leads || []).length < 1 && (process.env.NEXT_PUBLIC_DISABLE_ADVISORY_AUTH || '0') !== '1') {
          return void toast.error('At least one project lead required to publish')
        }
      }
    const payload: any = { ...form, client_name: effectiveClient, team_requirements: majors, partner_logos: selectedClients }
    payload.entity_id = entityId

    try {
      if (editing) {
        // Update metadata that can affect publish validation BEFORE publishing
        // Specifically, ensure leads/questions are saved before setting status to 'active'.
        if (publish) {
          try { await advisorySetProjectLeads(editing.id, leads) } catch {}
          try {
            const items = qItems.length
              ? qItems
              : questionsText.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,10).map((p, i: number)=>({ idx:i, type:'text' as const, prompt:p, choices:[] }))
            const norm = items.map((it, i: number)=>({ idx:i, type: it.type, prompt: String(it.prompt||'').trim(), choices: (it.choices||[]).map(String) }))
            await advisorySetProjectQuestionsTyped(editing.id, norm as any)
          } catch {}
        }

        // Update basic fields (and status if publishing)
        const patch: any = { ...payload }
        if (publish) patch.status = 'active'
        await advisoryUpdateProject(editing.id, patch)
        
        // When not publishing, persist leads/questions after the field update
        if (!publish) {
          try { await advisorySetProjectLeads(editing.id, leads) } catch {}
          try {
            const items = qItems.length
              ? qItems
              : questionsText.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,10).map((p, i: number)=>({ idx:i, type:'text' as const, prompt:p, choices:[] }))
            const norm = items.map((it, i: number)=>({ idx:i, type: it.type, prompt: String(it.prompt||'').trim(), choices: (it.choices||[]).map(String) }))
            await advisorySetProjectQuestionsTyped(editing.id, norm as any)
          } catch {}
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
          // Create as draft (then update to persist all fields reliably)
          const created = await advisoryCreateProject({ ...payload, status: 'draft' } as any)
          const newId = created?.id
          if (newId) {
            try { await advisoryUpdateProject(newId, { ...payload } as any) } catch {}
            if (leads.length) { try { await advisorySetProjectLeads(newId, leads) } catch {} }
            try {
              const items = qItems.length
                ? qItems
                : questionsText.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,10).map((p, i: number)=>({ idx:i, type:'text' as const, prompt:p, choices:[] }))
              const norm = items.map((it, i: number)=>({ idx:i, type: it.type, prompt: String(it.prompt||'').trim(), choices: (it.choices||[]).map(String) }))
              await advisorySetProjectQuestionsTyped(newId, norm as any)
            } catch {}
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
            try {
              const items = qItems.length
                ? qItems
                : questionsText.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,10).map((p, i: number)=>({ idx:i, type:'text' as const, prompt:p, choices:[] }))
              const norm = items.map((it, i: number)=>({ idx:i, type: it.type, prompt: String(it.prompt||'').trim(), choices: (it.choices||[]).map(String) }))
              await advisorySetProjectQuestionsTyped(newId, norm as any)
            } catch {}
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
      // Reload list using current filters/search to avoid narrowing by entity only
      const params: any = {}
      if (filterStatus !== 'all') params.status = filterStatus
      if (searchDebounced) params.q = searchDebounced
      setProjects(await advisoryListProjects(params))
    } catch (e: any) {
      const msg = (e?.response?.data?.detail || e?.message || 'Failed to save project')
      toast.error(String(msg))
    }
  }

  if (loading || authCheckLoading) {
    return (<div className="p-6">Loading...</div>)
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
    <div className="p-6 space-y-8">
      {/* Modern Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-6"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            NGI Capital Advisory
          </h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-lg hover:shadow-xl hover:bg-blue-700 transition-all"
            onClick={openNew}
          >
            + New Project
          </motion.button>
        </div>

        {/* Filters and Sorting */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="relative">
            <select
              aria-label="Filter status"
              className="appearance-none pl-4 pr-10 py-2.5 rounded-xl bg-background border border-border text-sm font-medium text-foreground cursor-pointer hover:bg-accent transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
            >
              <option value="all" className="bg-background text-foreground">All Projects</option>
              <option value="active" className="bg-background text-foreground">Open</option>
              <option value="draft" className="bg-background text-foreground">Draft</option>
              <option value="closed" className="bg-background text-foreground">Closed</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Sort Control */}
          <div className="relative">
            <select
              aria-label="Sort projects"
              className="appearance-none pl-4 pr-10 py-2.5 rounded-xl bg-background border border-border text-sm font-medium text-foreground cursor-pointer hover:bg-accent transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
            >
              <option value="newest" className="bg-background text-foreground">Newest First</option>
              <option value="oldest" className="bg-background text-foreground">Oldest First</option>
              <option value="name" className="bg-background text-foreground">Project Name</option>
              <option value="client" className="bg-background text-foreground">Client Name</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px] max-w-md">
            <input
              aria-label="Search projects"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-card focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Search projects..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </motion.div>

      {/* Projects List with Animation */}
      {listLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : displayedProjects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No projects found</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {search || filterStatus !== 'all'
              ? 'Try adjusting your filters or search terms'
              : 'Get started by creating your first project'}
          </p>
          {!search && filterStatus === 'all' && (
            <button
              onClick={openNew}
              className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              Create First Project
            </button>
          )}
        </motion.div>
      ) : (
        <div className="w-full grid grid-cols-1 gap-5">
          {displayedProjects.map((p, idx) => (
            <ModernProjectCard
              key={p.id}
              project={p}
              onEdit={() => openEdit(p)}
              onPreview={() => setPreviewProject(p)}
              index={idx}
            />
          ))}
        </div>
      )}

      {/* Modern Project Editor Modal */}
      <ProjectEditorModal
        isOpen={showDesigner}
        onClose={() => {
          setShowDesigner(false)
          setEditing(null)
          setForm({})
        }}
        project={editing}
        entityId={entityId}
        onSave={async (data, publish) => {
          // Use the data passed from the modal directly
          const effectiveClient = String(data.client_name || '').trim()
          if (!data.project_name || !effectiveClient || !data.summary) {
            toast.error('Name, client, and summary are required')
            return
          }
          
          // Extract fields that are handled by separate endpoints
          const { project_leads, application_questions, required_majors, ...restData } = data as any
          
          // Build payload with only fields the backend accepts
          const acceptedFields = [
            'client_name', 'project_name', 'summary', 'description', 'status', 'mode',
            'location_text', 'start_date', 'end_date', 'duration_weeks', 'commitment_hours_per_week',
            'project_code', 'project_lead', 'contact_email', 'hero_image_url', 'apply_cta_text',
            'apply_url', 'eligibility_notes', 'notes_internal', 'coffeechat_calendly', 'team_size',
            'showcase_pdf_url', 'applications_close_date', 'is_public', 'allow_applications',
            'partner_badges', 'backer_badges', 'tags', 'gallery_urls', 'partner_logos', 'backer_logos'
          ]
          
          const payload: any = {}
          acceptedFields.forEach(field => {
            if (field in restData) {
              payload[field] = restData[field]
            }
          })
          
          // Map required_majors to team_requirements (backend field name)
          if (required_majors) {
            payload.team_requirements = required_majors
          }
          
          payload.entity_id = entityId
          
          console.log('=== SAVE DEBUG ===')
          console.log('Editing:', editing)
          console.log('Full data received:', data)
          console.log('Payload being sent:', payload)
          console.log('Project leads:', project_leads)
          console.log('==================')
          
          try {
            if (editing) {
              // IMPORTANT: Save leads BEFORE updating project when publishing
              // The backend validates leads when status changes to active/closed
              if (publish || payload.status === 'active' || payload.status === 'closed') {
                // Save leads first if provided
                if (project_leads && Array.isArray(project_leads)) {
                  await advisorySetProjectLeads(editing.id, project_leads)
                }
                
                // Save questions first if provided
                if (application_questions && Array.isArray(application_questions)) {
                  await advisorySetProjectQuestionsTyped(editing.id, application_questions)
                }
              }
              
              // Update existing project
              await advisoryUpdateProject(editing.id, payload)
              
              // Update leads/questions after update if NOT publishing (to avoid duplicate calls)
              if (!publish && payload.status !== 'active' && payload.status !== 'closed') {
                if (project_leads && Array.isArray(project_leads)) {
                  await advisorySetProjectLeads(editing.id, project_leads)
                }
                
                if (application_questions && Array.isArray(application_questions)) {
                  await advisorySetProjectQuestionsTyped(editing.id, application_questions)
                }
              }
              
              toast.success('Project updated')
            } else {
              // Create new project
              const res = await advisoryCreateProject(payload)
              const newId = res.id
              
              // Set leads if provided
              if (project_leads && Array.isArray(project_leads) && project_leads.length > 0) {
                await advisorySetProjectLeads(newId, project_leads)
              }
              
              // Set questions if provided
              if (application_questions && Array.isArray(application_questions) && application_questions.length > 0) {
                await advisorySetProjectQuestionsTyped(newId, application_questions)
              }
              
              toast.success('Project created')
            }
            
            setShowDesigner(false)
            setEditing(null)
            setForm({})
            loadProjects()
          } catch (err: any) {
            console.error('=== SAVE ERROR ===')
            console.error('Error object:', err)
            console.error('Error response:', err?.response)
            console.error('Error response data:', err?.response?.data)
            console.error('Error response status:', err?.response?.status)
            console.error('==================')
            toast.error(String(err?.response?.data?.detail || err?.message || 'Save failed'))
          }
        }}
        onDelete={editing ? async (projectId) => {
          const response = await fetch(`/api/advisory/projects/${projectId}`, {
            method: 'DELETE',
          })
          if (!response.ok) {
            throw new Error('Delete failed')
          }
          setProjects(prev => prev.filter(p => p.id !== projectId))
          setShowDesigner(false)
          setEditing(null)
          toast.success('Project deleted')
        } : undefined}
        leads={LEADS}
        majors={MAJORS}
        aliases={ALIASES}
      />

      {/* LEGACY Designer Drawer - TO BE REMOVED */}
      {false && showDesigner && (
        <div className="fixed inset-0 bg-black/30 z-40">
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-5xl bg-background border-l border-border shadow-xl flex flex-col" onClick={e=>e.stopPropagation()}>
            {/* Drawer header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-border sticky top-0 bg-background z-10">
              <div className="text-sm text-muted-foreground">{editing ? 'Edit Project' : 'New Project'}</div>
              <button className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted" onClick={closeDesigner}>Close</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 overflow-hidden">
              {/* Form */}
              <div className="p-6 space-y-3 overflow-auto">
                <h2 className="text-xl font-semibold mb-2">Details</h2>
                <div className="grid grid-cols-1 gap-3">
                  <input className="w-full px-3 py-2 border rounded-md bg-background" placeholder="Project name" value={form.project_name || ''} onChange={e=>setForm(f=>({ ...f, project_name: e.target.value }))} />
                  {/* Clients multi-select */}
                  <div>
                    <div className="text-sm font-medium mb-1">Clients</div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedClients.map((c, i: number) => (
                        <span key={i} className="inline-flex items-center gap-2 px-2 py-1 text-xs rounded-full border">
                          <img src={c.url} alt={c.name} className="h-4 w-4 object-contain" />
                          {c.name}
                          <button className="text-muted-foreground hover:text-foreground" onClick={()=> setSelectedClients(prev => prev.filter((_, idx: number)=>idx!==i))}>x</button>
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
                    <input type="date" className="px-3 py-2 border rounded-md bg-background" value={form.start_date || ''}
                      onChange={e=>{
                        const sd = e.target.value
                        setForm(f=>{
                          const ed = f.end_date || ''
                          let dw: any = f.duration_weeks
                          if (sd && ed) {
                            const ms = new Date(ed).getTime() - new Date(sd).getTime()
                            dw = Math.max(1, Math.ceil(ms / (1000*60*60*24*7)))
                          }
                          return { ...f, start_date: sd, duration_weeks: dw }
                        })
                      }} />
                    <input type="date" className="px-3 py-2 border rounded-md bg-background" value={form.end_date || ''}
                      onChange={e=>{
                        const ed = e.target.value
                        setForm(f=>{
                          const sd = f.start_date || ''
                          let dw: any = f.duration_weeks
                          if (sd && ed) {
                            const ms = new Date(ed).getTime() - new Date(sd).getTime()
                            dw = Math.max(1, Math.ceil(ms / (1000*60*60*24*7)))
                          }
                          return { ...f, end_date: ed, duration_weeks: dw }
                        })
                      }} />
                  </div>
                  <input type="date" className="px-3 py-2 border rounded-md bg-background" placeholder="Applications close date" value={(form as any).applications_close_date || ''} onChange={e=>setForm(f=>({ ...f, applications_close_date: e.target.value } as any))} />
                <div className="grid grid-cols-2 gap-2">
                    <input type="number" className="px-3 py-2 border rounded-md bg-background" placeholder="Duration (weeks)" value={form.duration_weeks ?? ''} onChange={e=>setForm(f=>({ ...f, duration_weeks: Number(e.target.value||0) }))} />
                    <input type="number" className="px-3 py-2 border rounded-md bg-background" placeholder="Hours/week" value={form.commitment_hours_per_week ?? ''} onChange={e=>setForm(f=>({ ...f, commitment_hours_per_week: Number(e.target.value||0) }))} />
                </div>
                  <input className="w-full px-3 py-2 border rounded-md bg-background" placeholder="Project code (auto)" value={form.project_code || ''} readOnly disabled />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" className="px-3 py-2 border rounded-md bg-background" placeholder="Team size" value={(form as any).team_size || ''} onChange={e=>setForm(f=>({ ...f, team_size: Number(e.target.value||0) } as any))} />
                  <label className="flex items-center gap-2 text-sm text-foreground/90">
                    <input type="checkbox" checked={Boolean(((form as any).allow_applications as number | undefined) ?? 1)} onChange={e=>setForm(f=>({ ...f, allow_applications: (e.target.checked ? 1 : 0) } as any))} />
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

                {/* Client Logos */}
                {editing && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="text-sm font-medium">Client Logos</div>
                      <div className="flex items-center gap-2 mt-1">
                        <input className="px-3 py-2 border rounded-md bg-background flex-1" placeholder="Organization name (e.g., UC Investments)" value={newPartnerName} onChange={e=>setNewPartnerName(e.target.value)} />
                        <label className="px-3 py-2 border rounded-md bg-background cursor-pointer">
                          Upload Logo
                          <input type="file" accept="image/*" className="hidden" onChange={async (e)=>{
                            const file = e.target.files?.[0]; if (!file) return
                            try {
                              const res = await advisoryUploadProjectLogo(editing.id, 'partner', file, newPartnerName || undefined)
                              setSelectedClients(((res as any).partner_logos || []) as any)
                              setNewPartnerName('')
                            } catch { toast.error('Failed to upload client logo') }
                          }} />
                        </label>
                      </div>
                      {(selectedClients||[]).length > 0 && (
                        <div className="flex flex-wrap gap-3 mt-2">
                          {selectedClients.map((pl, i: number) => (
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

                {/* Application Questions (typed) */}
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Application Questions</div>
                    <div className="flex items-center gap-2">
                      <button type="button" className="px-2 py-1 border rounded" onClick={()=> setQItems(items => items.length < 10 ? [...items, { type:'text', prompt:'' }] : items)}>+ Question</button>
                      <button type="button" className="px-2 py-1 border rounded" onClick={()=> setQItems(items => items.length < 10 ? [...items, { type:'mcq', prompt:'', choices:[] }] : items)}>+ Multiple Choice</button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {qItems.map((it, idx: number) => (
                      <div key={idx} className="border rounded-md p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground uppercase">{it.type === 'mcq' ? 'Multiple Choice' : 'Text'}</span>
                          <button className="text-xs text-red-600" onClick={()=> setQItems(items => items.filter((_, i: number) => i !== idx))}>Remove</button>
                        </div>
                        <input className="w-full px-3 py-2 border rounded-md bg-background" placeholder={it.type==='mcq' ? 'Question (e.g., Preferred track?)' : 'Question (e.g., Why are you interested?)'} value={it.prompt}
                          onChange={e=> setQItems(items => items.map((x, i: number) => i===idx ? { ...x, prompt: e.target.value } : x))} />
                        {it.type === 'mcq' && (
                          <div className="mt-2 space-y-2">
                            <div className="text-xs text-muted-foreground">Choices</div>
                            {(it.choices || []).map((c, ci: number) => (
                              <div key={ci} className="flex items-center gap-2">
                                <input className="flex-1 px-2 py-1 border rounded bg-background" value={c} onChange={e=> setQItems(items => items.map((x, i: number) => i===idx ? { ...x, choices: (x.choices||[]).map((cc, cci: number) => cci===ci ? e.target.value : cc) } : x))} />
                                <button className="text-xs" onClick={()=> setQItems(items => items.map((x, i: number) => i===idx ? { ...x, choices: (x.choices||[]).filter((_, cci: number) => cci!==ci) } : x))}>x</button>
                              </div>
                            ))}
                            <button className="px-2 py-1 border rounded" onClick={()=> setQItems(items => items.map((x, i: number) => i===idx ? { ...x, choices: [ ...(x.choices||[]), '' ] } : x))}>+ Choice</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Media Uploads */}
                <div className="mt-3 space-y-2">
                  <div className="text-sm font-medium">Media</div>
                  <div className="flex items-center gap-2 text-sm">
                    <label className="px-3 py-2 border rounded-md cursor-pointer hover:bg-muted transition-colors">
                      {uploadingHero ? 'Uploading...' : '📸 Upload Hero Image'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingHero}
                        onChange={async e=>{
                          const file = e.currentTarget.files?.[0]; if (!file) return
                          // Open crop modal
                          const localUrl = URL.createObjectURL(file)
                          setCropImageSrc(localUrl)
                          setCropModalOpen(true)
                          // Reset input
                          try { e.currentTarget.value = '' } catch {}
                        }}
                      />
                    </label>
                  </div>
                  {editing && (
                    <>
                      {/* Showcase PDF/PowerPoint for closed projects */}
                      <div className="flex items-center gap-2 text-sm">
                        <label className="px-3 py-2 border rounded-md cursor-pointer hover:bg-muted transition-colors">
                          {uploadingShowcase ? 'Uploading...' : '📄 Upload Showcase (PDF/PPT)'}
                          <input
                            type="file"
                            accept="application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                            className="hidden"
                            disabled={uploadingShowcase}
                            onChange={async e=>{
                              const file = e.target.files?.[0]; if (!file || !editing) return
                              setUploadingShowcase(true)
                              try {
                                const res = await advisoryUploadProjectShowcase(editing.id, file);
                                setForm(f=>({ ...f, showcase_pdf_url: (res as any).showcase_pdf_url }))
                                toast.success('Showcase uploaded successfully')
                              }
                              catch (err:any) { toast.error(String(err?.message || 'Showcase upload failed')) }
                              finally { setUploadingShowcase(false) }
                            }}
                          />
                        </label>
                        {form.showcase_pdf_url && (
                          <a
                            href={form.showcase_pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View current
                          </a>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                {/* Left side - Delete and Status Change */}
                <div className="flex items-center gap-2">
                  {editing && (
                    <>
                      <select
                        className="px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm hover:bg-accent transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={form.status || 'draft'}
                        onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                      >
                        <option value="draft" className="bg-background text-foreground">Draft</option>
                        <option value="active" className="bg-background text-foreground">Open</option>
                        <option value="closed" className="bg-background text-foreground">Closed</option>
                      </select>
                      <button
                        className="px-4 py-2 rounded-md border border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                        onClick={async () => {
                          if (!editing) return;
                          if (!confirm(`Delete project "${editing.project_name}"? This cannot be undone.`)) return;
                          try {
                            await fetch(`${(process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, '')}/advisory/projects/${editing.id}`, {
                              method: 'DELETE',
                              credentials: 'include',
                              headers: { 'Content-Type': 'application/json' }
                            });
                            toast.success('Project deleted');
                            setProjects(prev => prev.filter(p => p.id !== editing.id));
                            closeDesigner();
                          } catch (err: any) {
                            toast.error(String(err?.message || 'Delete failed'));
                          }
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
                {/* Right side - Save buttons */}
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 rounded-md border text-foreground hover:bg-muted" onClick={closeDesigner}>Cancel</button>
                  <button className="px-4 py-2 rounded-md bg-muted text-foreground hover:bg-muted/80 border" onClick={()=>onSave(false)}>{editing ? 'Save' : 'Save Draft'}</button>
                  <button className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700" onClick={()=>onSave(true)}>{editing ? 'Update' : 'Publish'}</button>
                </div>
              </div>
              </div>
              {/* Live Preview */}
              <div className="p-6 bg-muted/40 overflow-auto">
                <h2 className="text-sm font-medium text-muted-foreground mb-2">Live Preview</h2>
                <StudentStylePreview p={{
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
                }} />
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modern Modals */}
      <ImageCropModal
        isOpen={cropModalOpen}
        imageUrl={cropImageSrc}
        onClose={() => {
          setCropModalOpen(false);
          if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
          setCropImageSrc('');
        }}
        onConfirm={async (croppedBlob) => {
          setCropModalOpen(false);
          if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
          setCropImageSrc('');
          
          // Upload cropped image
          if (editing) {
            setUploadingHero(true);
            try {
              const file = new File([croppedBlob], 'hero.jpg', { type: 'image/jpeg' });
              const res = await advisoryUploadProjectHero(editing.id, file);
              setForm(f => ({ ...f, hero_image_url: (res as any).hero_image_url }));
              toast.success('Hero image uploaded successfully');
            } catch (err: any) {
              toast.error(String(err?.message || 'Hero upload failed'));
            } finally {
              setUploadingHero(false);
            }
          } else {
            // For new projects, store blob to upload on save
            setPendingHeroBlob(croppedBlob);
            const localUrl = URL.createObjectURL(croppedBlob);
            setForm(f => ({ ...f, hero_image_url: localUrl }));
            toast.info('Hero image will be uploaded when you save the project');
          }
        }}
        aspectRatio={16 / 9}
      />
      
      <ProjectDetailModal
        project={previewProject}
        onClose={() => setPreviewProject(null)}
      />
    </div>
  )
}

function ProjectCard({ p, onEdit, onPreview }: { p: AdvisoryProject; onEdit: () => void; onPreview?: () => void }) {
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
      className="w-full rounded-xl border border-border bg-card cursor-pointer hover:bg-accent/20 transition-colors"
      onClick={() => { onPreview ? onPreview() : (typeof window !== 'undefined' && window.open(`${process.env.NEXT_PUBLIC_ADMIN_BASE_URL || '/admin'}/ngi-advisory/projects/${p.id}`, '_blank')) }}
    >
      <div className="flex items-center p-4 gap-4">
        <div className="relative w-40 md:w-48 aspect-[16/9] bg-black rounded-md overflow-hidden flex-shrink-0">
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
          <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.summary}</div>
          {/* Stats tags */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {p.duration_weeks ? (<span className="text-xxs px-2 py-0.5 rounded border">{p.duration_weeks} weeks</span>) : null}
            {p.commitment_hours_per_week ? (<span className="text-xxs px-2 py-0.5 rounded border">{p.commitment_hours_per_week} hrs/wk</span>) : null}
            {typeof (p as any).team_size === 'number' && (p as any).team_size > 0 ? (<span className="text-xxs px-2 py-0.5 rounded border">Team {(p as any).team_size}</span>) : null}
            {(p.start_date || p.end_date) ? (
              <span className="text-xxs px-2 py-0.5 rounded border">
                {(p.start_date || '').slice(0,10)}{p.end_date ? ' to ' + String(p.end_date).slice(0,10) : ''}
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
            {partnerLogos.length === 0 && badges.slice(0,3).map((b: string, i: number)=> (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{b}</span>
            ))}
          </div>
          {(p as any)._lead_names && (p as any)._lead_names.length > 0 && (
            <div className="text-xs text-muted-foreground/90 mt-1 truncate">Leads: {(p as any)._lead_names.join(', ')}</div>
          )}
          {typeof (p as any).open_roles === 'number' && typeof (p as any).team_size === 'number' ? (
            <div className="text-xs text-muted-foreground/90 mt-1">Open roles: {(p as any).open_roles} / {(p as any).team_size}</div>
          ) : null}
          <div className="mt-3 flex items-center gap-2" onClick={(e)=>e.stopPropagation()}>
            <button className="px-3 py-1.5 text-sm rounded-md border" onClick={onEdit}>Edit</button>
            <button className="px-3 py-1.5 text-sm rounded-md border">Deactivate</button>
            <button className="ml-auto text-sm text-blue-600 hover:underline" onClick={onPreview}>Preview</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProjectOverlay({ project, onClose }: { project: AdvisoryProject; onClose: () => void }) {
  const [detail, setDetail] = useState<AdvisoryProject | null>(null)
  const [questions, setQuestions] = useState<Array<{ idx:number; type?: 'text'|'mcq'; prompt:string; choices?: string[] }>>([])
  const [avail, setAvail] = useState<Array<{ start_ts:string; end_ts:string; slot_len_min:number }>>([])
  const [applyOpen, setApplyOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try { const d = await advisoryGetProject(project.id); if (!cancelled) setDetail(d as any) } catch { setDetail(project) }
      try {
        const q = await advisoryGetProjectQuestions(project.id)
        const items = (q.items && q.items.length) ? q.items : (q.prompts || []).map((p, i) => ({ idx:i, type:'text' as const, prompt:p }))
        if (!cancelled) setQuestions(items)
      } catch {}
      try {
        const res = await apiClient.request<{ slots: Array<{ start_ts:string; end_ts:string; slot_len_min:number }> }>('GET', '/public/coffeechats/availability')
        if (!cancelled) setAvail(res.slots || [])
      } catch {}
    })()
    return () => { cancelled = true }
  }, [project?.id])

  const p = detail || project
  const hero = p.hero_image_url || ((p as any).gallery_urls?.[0]) || ''
  const heroSrc = hero ? (/^(\/|https?:|blob:|data:)/.test(String(hero)) ? String(hero) : `/${hero}`) : ''

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div className="relative w-[92vw] h-[90vh] max-w-6xl bg-background border border-border rounded-xl shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
        <button className="absolute top-3 right-3 z-10 px-3 py-1.5 text-sm rounded-md border bg-background/80 hover:bg-muted" onClick={onClose}>Close</button>
        <div className="w-full h-full overflow-auto p-4">
          <div className="rounded-2xl border border-border bg-card overflow-hidden p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main content */}
              <div className="lg:col-span-2">
                {p.client_name && <div className="text-xs uppercase text-muted-foreground">{p.client_name}</div>}
                <h2 className="mt-1 text-2xl font-semibold">{p.project_name}</h2>
                {p.summary && <p className="mt-2 text-sm text-muted-foreground">{p.summary}</p>}
                {/* Smaller hero below the summary */}
                <div className="mt-4 rounded-lg overflow-hidden border border-border w-full h-48 md:h-56 bg-black relative">
                  {heroSrc ? (
                    <img src={heroSrc} alt="hero" className="absolute inset-0 w-full h-full object-cover" />
                  ) : <div className="absolute inset-0 w-full h-full bg-muted" />}
                </div>
                {p.description && (
                  <div className="mt-4 text-sm text-foreground/90 whitespace-pre-wrap">{p.description}</div>
                )}
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-foreground/80">
                  {p.mode && <div><span className="text-muted-foreground">Mode:</span> {p.mode}</div>}
                  {p.duration_weeks && <div><span className="text-muted-foreground">Duration:</span> {p.duration_weeks} weeks</div>}
                  {p.commitment_hours_per_week && <div><span className="text-muted-foreground">Hours/week:</span> {p.commitment_hours_per_week}</div>}
                  {(p as any).team_size && <div><span className="text-muted-foreground">Open roles:</span> Analyst (team size {(p as any).team_size})</div>}
                </div>
                {Array.isArray(p.tags) && p.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {p.tags.map((t: string, i: number) => <span key={i} className="text-[10px] bg-muted px-2 py-[2px] rounded">{t}</span>)}
                  </div>
                )}
              </div>
              {/* Right column */}
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="text-sm font-medium">Coffee Chat</div>
                  <div className="text-xs text-muted-foreground">Pick a time (All times PT)</div>
                  <div className="mt-2 max-h-40 overflow-auto space-y-1">
                    {(avail || []).slice(0,6).map((s, i) => (
                      <div key={i} className="text-xs text-foreground/90">
                        {new Date(s.start_ts).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', month:'short', day:'2-digit', hour:'numeric', minute:'2-digit' })}
                      </div>
                    ))}
                    {(!avail || avail.length===0) && (
                      <div className="text-xs text-muted-foreground">No availability loaded</div>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="text-sm font-medium">Apply</div>
                  <p className="mt-1 text-xs text-muted-foreground">Students must complete profile first (school, program, grad year, phone, LinkedIn, GPA, location, resume).</p>
                  <button className="mt-3 w-full px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm" onClick={()=>setApplyOpen(true)}>Apply Now</button>
                </div>
              </div>
            </div>
          </div>

          {applyOpen && (
            <ApplyModal questions={questions} onClose={()=>setApplyOpen(false)} />
          )}
        </div>
      </div>
    </div>
  )
}

function ApplyModal({ questions, onClose }: { questions: Array<{ idx:number; type?: 'text'|'mcq'; prompt:string; choices?: string[] }>; onClose: () => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div className="w-[92vw] max-w-2xl bg-background border border-border rounded-xl shadow-2xl p-6" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Application Preview</h3>
          <button className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted" onClick={onClose}>Close</button>
        </div>
        <div className="space-y-4 max-h-[60vh] overflow-auto">
          {(questions || []).map((q, i) => {
            const qType = (q.type || 'text') as ('text'|'mcq')
            if (qType === 'mcq' && (q.choices || []).length > 0) {
              const opts = (q.choices || []).slice(0,12)
              const sel = answers[String(i)] || ''
              return (
                <div key={i}>
                  <div className="text-sm font-medium mb-1">{q.prompt}</div>
                  <div className="space-y-1">
                    {opts.map((c, idx) => (
                      <label key={idx} className="flex items-center gap-2 text-sm">
                        <input type="radio" name={`q_${i}`} checked={sel===c} onChange={()=> setAnswers(a => ({ ...a, [String(i)]: c as string }))} />
                        <span>{c}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            }
            const val = answers[String(i)] || ''
            const words = val.trim() ? val.trim().split(/\s+/).filter(Boolean).length : 0
            return (
              <div key={i}>
                <div className="text-sm font-medium mb-1">{q.prompt}</div>
                <textarea className="w-full px-3 py-2 text-sm rounded-md border bg-background" placeholder="Your response (max 500 words)" value={val} onChange={e=> setAnswers(a => ({ ...a, [String(i)]: e.target.value }))} />
                <div className={`text-[11px] ${words > 500 ? 'text-red-500' : 'text-muted-foreground'}`}>{words}/500 words</div>
              </div>
            )
          })}
          {(questions || []).length === 0 && (
            <div className="text-sm text-muted-foreground">No application questions configured.</div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button className="px-3 py-1.5 rounded-md border hover:bg-muted" onClick={onClose}>Close</button>
          <button className="px-3 py-1.5 rounded-md bg-blue-600 text-white" disabled>Submit (preview)</button>
        </div>
      </div>
    </div>
  )
}


function StudentStylePreview({ p }: { p: AdvisoryProject }) {
  const hero = p.hero_image_url || ((p as any).gallery_urls?.[0]) || ''
  const heroSrc = hero ? (/^(\/|https?:|blob:|data:)/.test(String(hero)) ? String(hero) : `/${hero}`) : ''
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="w-full aspect-[16/9] bg-black">
        {heroSrc ? (
          <img src={heroSrc} alt="hero" className="w-full h-full object-cover" />
        ) : <div className="w-full h-full bg-muted" />}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        <div className="lg:col-span-2">
          {p.client_name && <div className="text-xs uppercase text-muted-foreground">{p.client_name}</div>}
          <h2 className="mt-1 text-2xl font-semibold">{p.project_name || 'Project name'}</h2>
          {p.summary && <p className="mt-2 text-sm text-muted-foreground">{p.summary}</p>}
          {p.description && <div className="mt-4 text-sm text-foreground/90 whitespace-pre-wrap">{p.description}</div>}
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-foreground/80">
            {p.mode && <div><span className="text-muted-foreground">Mode:</span> {p.mode}</div>}
            {p.duration_weeks && <div><span className="text-muted-foreground">Duration:</span> {p.duration_weeks} weeks</div>}
            {p.commitment_hours_per_week && <div><span className="text-muted-foreground">Hours/week:</span> {p.commitment_hours_per_week}</div>}
            {(p as any).team_size && <div><span className="text-muted-foreground">Open roles:</span> Analyst (team size {(p as any).team_size})</div>}
          </div>
          {Array.isArray(p.tags) && p.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {p.tags.map((t: string, i: number) => <span key={i} className="text-[10px] bg-muted px-2 py-[2px] rounded">{t}</span>)}
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-medium">Coffee Chat</div>
            <div className="text-xs text-muted-foreground">Preview of availability will show here.</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-medium">Apply</div>
            <p className="mt-1 text-xs text-muted-foreground">Your application questions will appear here.</p>
            <button className="mt-3 w-full px-3 py-2 rounded-md bg-blue-600 text-white text-sm" disabled>Apply Now</button>
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
            <button className="text-muted-foreground hover:text-foreground" onClick={() => remove(m)}>x</button>
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
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null)
  const targetW = 1280, targetH = 720
  // Load image to compute natural size -> baseScale to cover 16:9 frame
  useEffect(() => {
    if (!src) { setImgSize(null); return }
    const img = new Image()
    img.onload = () => setImgSize({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 })
    img.src = src
  }, [src])
  const baseScale = useMemo(() => {
    if (!imgSize) return 1
    return Math.max(targetW / (imgSize.w || 1), targetH / (imgSize.h || 1))
  }, [imgSize])
  // Allow zooming out to "fit entire image" (may letterbox) by defining a minimum zoom below baseScale
  const minCoverScale = baseScale || 1
  const minFitScale = useMemo(() => {
    if (!imgSize) return 1
    const fit = Math.min(targetW / (imgSize.w || 1), targetH / (imgSize.h || 1))
    // Convert to the slider's relative space (where 1 means baseScale)
    return (fit / (minCoverScale || 1))
  }, [imgSize, minCoverScale])
  const totalScale = (baseScale || 1) * (zoom || 1)

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
              style={{
                position: 'absolute',
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: `translate(-50%, -50%) scale(${totalScale})`,
                userSelect: 'none',
                pointerEvents: 'none',
                maxWidth: 'none'
              }}
            />
            <div className="absolute inset-0 border-2 border-white/60 pointer-events-none" />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 items-center">
          <label className="text-sm">Zoom<input className="w-full" type="range" min={Math.max(0.1, minFitScale || 0.1)} max={3} step={0.01} value={zoom} onChange={e=>setZoom(Number(e.target.value))} /></label>
          <label className="text-sm">X<input className="w-full" type="range" min={-300} max={300} step={1} value={x} onChange={e=>setX(Number(e.target.value))} /></label>
          <label className="text-sm">Y<input className="w-full" type="range" min={-300} max={300} step={1} value={y} onChange={e=>setY(Number(e.target.value))} /></label>
        </div>
        <div className="mt-4 flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 border rounded-md" onClick={()=>{ setZoom(1); setX(0); setY(0) }}>Reset</button>
            <button className="px-3 py-1.5 border rounded-md" onClick={()=>{ setZoom(minFitScale || 1); setX(0); setY(0) }}>Fit</button>
          </div>
          <button className="px-3 py-1.5 border rounded-md" onClick={onClose}>Cancel</button>
          <button className="px-3 py-1.5 rounded-md bg-blue-600 text-white" onClick={async ()=>{
            const w = targetW, h = targetH
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





