"use client"

import { useMemo, useState } from 'react'
import type { PublicProject } from '@/lib/api'
import { useRouter, usePathname } from 'next/navigation'
import { postEvent } from '@/lib/telemetry'
import ModernProjectCard from '@/components/projects/ModernProjectCard'
import { StudentProjectModal } from '@/components/projects/StudentProjectModal'
import { listMyApplications } from '@/lib/api'
import MyApplicationsModal from '@/components/projects/MyApplicationsModal'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { gsap } from 'gsap'
import { useEffect, useRef } from 'react'

export default function ProjectsClient({ initialItems, initialQ = '', initialTags = [], initialMode = '', initialLocation = '', initialSort = 'newest', pageSize = 20 }: { initialItems: PublicProject[]; initialQ?: string; initialTags?: string[]; initialMode?: string; initialLocation?: string; initialSort?: 'newest'|'name'|'applied'|'oldest'; pageSize?: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const titleRef = useRef<HTMLDivElement>(null)
  
  // GSAP animation for title
  useEffect(() => {
    if (titleRef.current) {
      const chars = titleRef.current.querySelectorAll('.char')
      
      // Set initial state
      gsap.set(chars, { y: 50, opacity: 0 })
      
      // Animate characters with stagger
      gsap.to(chars, {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.05,
        delay: 0.2
      })
    }
  }, [])
  
  // Filters/state
  const [q, setQ] = useState(initialQ)
  const [sort, setSort] = useState<'newest'|'name'|'applied'|'oldest'>(initialSort as any)
  const [statusFilter, setStatusFilter] = useState<'all'|'active'|'closed'>('all')
  const [activeTags, setActiveTags] = useState<string[]>(initialTags)
  const [mode, setMode] = useState<string>(initialMode)
  const [location, setLocation] = useState<string>(initialLocation)

  // Data/infinite scroll
  const [items, setItems] = useState<PublicProject[]>(initialItems || [])
  const [offset, setOffset] = useState<number>(initialItems?.length || 0)
  const [hasMore, setHasMore] = useState<boolean>((initialItems?.length || 0) === pageSize)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // Aggregate tags for filter chips
  const allTags = useMemo(() => {
    const s = new Set<string>()
    for (const p of items) (p.tags || []).forEach(t => t && s.add(t))
    return Array.from(s).sort((a,b)=>a.localeCompare(b))
  }, [items])

  // Build querystring for API and URL
  const buildQuery = (ofs: number) => {
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (activeTags.length) params.set('tags', activeTags.join(','))
    if (mode.trim()) params.set('mode', mode.trim())
    if (location.trim()) params.set('location', location.trim())
    if (sort) params.set('sort', sort)
    params.set('limit', String(pageSize))
    params.set('offset', String(ofs))
    return params
  }

  // URL sync on filters change
  useEffect(() => {
    const params = buildQuery(0)
    const qs = params.toString()
    router.push(pathname + (qs ? `?${qs}` : ''), { scroll: false })
    // Reset and fetch first page
    setItems([])
    setOffset(0)
    setHasMore(true)
    // kick initial load
    void fetchMore(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sort, activeTags.join(','), mode, location])

  // Debounce search input
  const [pendingQ, setPendingQ] = useState(q)
  useEffect(() => {
    const t = setTimeout(() => setQ(pendingQ), 300)
    return () => clearTimeout(t)
  }, [pendingQ])

  // Fetcher
  const fetchMore = async (reset = false) => {
    if (isLoading) return
    if (!hasMore && !reset) return
    setIsLoading(true)
    try {
      const ofs = reset ? 0 : offset
      const params = buildQuery(ofs)
      const url = '/api/public/projects' + (params.toString() ? `?${params.toString()}` : '')
      const res = await fetch(url)
      if (!res.ok) throw new Error(await res.text())
      const data: PublicProject[] = await res.json()
      setItems(prev => (reset ? data : [...prev, ...data.filter(d => !prev.some(p => p.id === d.id))]))
      setOffset(ofs + (data?.length || 0))
      setHasMore((data?.length || 0) === pageSize)
      if (data && data.length) {
        postEvent('project_impression', { ids: data.map(d => d.id), q, tags: activeTags, mode, location, sort })
      }
    } catch (e) {
      // swallow; show minimal inline message
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Infinite scroll observer
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(entries => {
      const first = entries[0]
      if (first && first.isIntersecting) {
        void fetchMore()
      }
    }, { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentinelRef.current, offset, hasMore, isLoading])

  const toggleTag = (t: string) => setActiveTags(prev => prev.includes(t) ? prev.filter(x=>x!==t) : [...prev, t])

  const [selectedProject, setSelectedProject] = useState<PublicProject | null>(null)
  const [appsOpen, setAppsOpen] = useState(false)
  const [appsCount, setAppsCount] = useState<number>(0)

  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        const items = await listMyApplications().catch(() => [])
        if (!ignore) setAppsCount(items.length || 0)
      } catch {}
    }
    // best-effort prefetch, do not block UI
    void load()
    return () => { ignore = true }
  }, [])

  // Filter items by status
  const filteredItems = items.filter(item => {
    if (statusFilter === 'all') return true;
    return (item.status || 'active').toLowerCase() === statusFilter;
  });

  return (
    <>
      <div aria-label="Projects list" role="region" className="px-6 pt-4 pb-6 space-y-5">
        {/* Header with GSAP animated title */}
        <div className="flex flex-col gap-4">
          <div ref={titleRef} className="overflow-hidden" style={{ paddingBottom: '8px' }}>
            <h1 className="text-5xl font-bold text-foreground tracking-tight leading-tight">
              {'Advisory Projects'.split('').map((char, i) => (
                <span key={i} className="char inline-block" style={{ paddingBottom: '4px' }}>
                  {char === ' ' ? '\u00A0' : char}
                </span>
              ))}
            </h1>
          </div>
        </div>

        {/* Filters and Sorting - No border background */}
        <div className="flex flex-wrap items-center gap-3 mt-2 mb-2">
          {/* Status Filter (shadcn/Radix Select) */}
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-[150px] h-10 rounded-xl">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="active">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Control (shadcn/Radix Select) */}
          <Select value={sort} onValueChange={(v: any) => setSort(v)}>
            <SelectTrigger className="w-[170px] h-10 rounded-xl">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="name">Project Name</SelectItem>
            </SelectContent>
          </Select>

          {/* My Applications modal trigger */}
          <button
            type="button"
            onClick={() => setAppsOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-border bg-background hover:bg-accent text-sm font-medium"
          >
            <span>My Applications</span>
            {appsCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[10px] font-semibold bg-blue-600 text-white">{appsCount}</span>
            )}
          </button>

          {/* Search */}
          <div className="flex-1 min-w-[200px] max-w-md">
            <input
              aria-label="Search projects"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-card focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Search projects..."
              value={pendingQ}
              onChange={e => setPendingQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setQ(pendingQ); } }}
            />
          </div>
        </div>

        {/* Projects List with Animation - Matching Admin Style */}
        {isLoading && items.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredItems.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No projects found</h3>
            <p className="text-sm text-muted-foreground">
              {pendingQ || statusFilter !== 'all'
                ? 'Try adjusting your filters or search terms'
                : 'Check back soon for new opportunities'}
            </p>
          </div>
        ) : (
          <div className="w-full grid grid-cols-1 gap-5 mt-1">
            {filteredItems.map((p, idx) => (
              <ModernProjectCard
                key={p.id}
                project={p}
                onPreview={() => setSelectedProject(p)}
                index={idx}
              />
            ))}
          </div>
        )}
        {isLoading && items.length > 0 && (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}
        <div ref={sentinelRef} />
      </div>

      {/* Student Project Detail Modal */}
      <StudentProjectModal
        isOpen={!!selectedProject}
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />

      {/* Applications list modal */}
      <MyApplicationsModal isOpen={appsOpen} onClose={() => setAppsOpen(false)} />
    </>
  )
}