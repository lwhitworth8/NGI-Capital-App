"use client"

import { useMemo, useState } from 'react'
import type { PublicProject } from '@/lib/api'

export default function ProjectsClient({ initialItems }: { initialItems: PublicProject[] }) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'newest'|'name'>('newest')
  const [activeTags, setActiveTags] = useState<string[]>([])

  const allTags = useMemo(() => {
    const s = new Set<string>()
    for (const p of initialItems) (p.tags || []).forEach(t => t && s.add(t))
    return Array.from(s).sort((a,b)=>a.localeCompare(b))
  }, [initialItems])

  const items = useMemo(() => {
    let list = initialItems || []
    if (q.trim()) {
      const ql = q.trim().toLowerCase()
      list = list.filter(p => [p.project_name, p.client_name, p.summary].some(v => (v||'').toLowerCase().includes(ql)))
    }
    if (activeTags.length) {
      list = list.filter(p => {
        const t = (p.tags || []).map(x => (x||'').toLowerCase())
        return activeTags.some(tag => t.includes(tag.toLowerCase()))
      })
    }
    list = list.slice().sort((a,b) => {
      if (sort === 'name') return (a.project_name||'').localeCompare(b.project_name||'')
      const ad = a.start_date ? Date.parse(a.start_date) : 0
      const bd = b.start_date ? Date.parse(b.start_date) : 0
      return (bd - ad) || (b.id - a.id)
    })
    return list
  }, [initialItems, q, sort, activeTags])

  const toggleTag = (t: string) => setActiveTags(prev => prev.includes(t) ? prev.filter(x=>x!==t) : [...prev, t])

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="title">Projects</div>
        <div className="flex items-center gap-2">
          <input className="search" placeholder="Search projects" value={q} onChange={e=>setQ(e.target.value)} />
          <select className="search" value={sort} onChange={e=>setSort(e.target.value as any)}>
            <option value="newest">Newest</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>
      {!!allTags.length && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {allTags.map(t => (
            <button key={t} onClick={()=>toggleTag(t)} className={`chip ${activeTags.includes(t) ? 'ring-2 ring-[hsl(var(--ring))]' : ''}`}>{t}</button>
          ))}
        </div>
      )}
      <div style={{ marginTop: 16, display:'flex', flexDirection:'column', gap: 12 }}>
        {items.map(p => (
          <a key={p.id} href={`/projects/${p.id}`} className="card" style={{ textDecoration:'none', color:'inherit' }}>
            <div className="thumb">
              {p.hero_image_url ? <img src={p.hero_image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : null}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ fontWeight:700 }}>{p.project_name}</div>
                <span className="status">Active</span>
              </div>
              <div style={{ fontSize:13, color:'var(--muted, #6b7280)' }}>{p.summary}</div>
              <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
                {(p.partner_badges||[]).slice(0,2).map((b,i)=>(<span key={i} className="chip">{b}</span>))}
                {(p.backer_badges||[]).slice(0,2).map((b,i)=>(<span key={`b-${i}`} className="chip">{b}</span>))}
              </div>
            </div>
          </a>
        ))}
        {items.length === 0 && <div style={{ color:'#6b7280', fontSize:14 }}>No projects available.</div>}
      </div>
    </div>
  )}

