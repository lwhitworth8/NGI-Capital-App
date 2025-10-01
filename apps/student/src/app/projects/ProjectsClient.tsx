"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import type { PublicProject } from '@/lib/api'
import { useRouter, usePathname } from 'next/navigation'
import { postEvent } from '@/lib/telemetry'

export default function ProjectsClient({ initialItems, initialQ = '', initialTags = [], initialMode = '', initialLocation = '', initialSort = 'newest', pageSize = 20 }: { initialItems: PublicProject[]; initialQ?: string; initialTags?: string[]; initialMode?: string; initialLocation?: string; initialSort?: 'newest'|'name'|'applied'; pageSize?: number }) {
  const router = useRouter()
  const pathname = usePathname()
  // Filters/state
  const [q, setQ] = useState(initialQ)
  const [sort, setSort] = useState<'newest'|'name'|'applied'>(initialSort as any)
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

  return (
    <div aria-label="Projects list" role="region">
      <div className="flex items-center justify-between gap-3">
        <div className="title">Projects</div>
        <div className="flex items-center gap-2">
          <input aria-label="Search projects" className="search" placeholder="Search projects" value={pendingQ} onChange={e=>setPendingQ(e.target.value)} />
          <select aria-label="Sort projects" className="search" value={sort} onChange={e=>setSort(e.target.value as any)}>
            <option value="newest">Newest</option>
            <option value="name">Name</option>
            <option value="applied">Most Applied</option>
          </select>
        </div>
      </div>

      {/* Filters panel */}
      <div className="mt-3 flex flex-col gap-3">
        {!!allTags.length && (
          <div className="flex gap-2 flex-wrap">
            {allTags.map(t => (
              <button key={t} aria-pressed={activeTags.includes(t)} onClick={()=>toggleTag(t)} className={`chip ${activeTags.includes(t) ? 'ring-2 ring-[hsl(var(--ring))]' : ''}`}>{t}</button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Mode</label>
          <select aria-label="Filter by mode" className="search" value={mode} onChange={e=>setMode(e.target.value)}>
            <option value="">Any</option>
            <option value="remote">Remote</option>
            <option value="in_person">In person</option>
            <option value="hybrid">Hybrid</option>
          </select>
          <label className="text-xs text-muted-foreground">Location</label>
          <input aria-label="Filter by location" className="search" placeholder="e.g., Berkeley" value={location} onChange={e=>setLocation(e.target.value)} />
          <button aria-label="Clear filters" className="chip" onClick={()=>{ setActiveTags([]); setMode(''); setLocation(''); setPendingQ('') }}>Clear</button>
        </div>
      </div>

      <div style={{ marginTop: 16, display:'flex', flexDirection:'column', gap: 12 }}>
        {items.map(p => (
          <a key={p.id} href={`/projects/${p.id}`} className="card" style={{ textDecoration:'none', color:'inherit' }}>
            <div className="thumb">
              {p.hero_image_url ? <img src={p.hero_image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : null}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ fontWeight:700 }}>{p.project_name}</div>
                <span className="status" aria-label={`status ${(p.status||'active').toLowerCase()==='closed' ? 'Completed' : 'Active'}`}>{(p.status||'active').toLowerCase()==='closed' ? 'Completed' : 'Active'}</span>
              </div>
              <div style={{ fontSize:13, color:'var(--muted, #6b7280)' }}>{p.summary}</div>
              <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
                {(p.partner_badges||[]).slice(0,2).map((b,i)=>(<span key={i} className="chip">{b}</span>))}
                {(p.backer_badges||[]).slice(0,2).map((b,i)=>(<span key={`b-${i}`} className="chip">{b}</span>))}
              </div>
            </div>
          </a>
        ))}
        {isLoading && <div style={{ color:'#6b7280', fontSize:13 }}>Loading...</div>}
        {!isLoading && items.length === 0 && <div style={{ color:'#6b7280', fontSize:14 }}>No projects available. Coming soon.</div>}
        <div ref={sentinelRef} />
      </div>
    </div>
  )
}
