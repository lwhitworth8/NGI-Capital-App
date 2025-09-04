import { spFetch, PublicProject } from '@/lib/api'
export const dynamic = 'force-dynamic'

async function getProjects(): Promise<PublicProject[]> {
  return spFetch<PublicProject[]>('/api/public/projects')
}

export default async function ProjectsPage() {
  const items: PublicProject[] = await getProjects()
  return (
    <div style={{ padding: 24 }}>
      <div className="header">
        <div className="title">Projects</div>
        <input className="search" placeholder="Search projects" />
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
                <span className="status">Active</span>
              </div>
              <div style={{ fontSize:13, color:'#6b7280' }}>{p.summary}</div>
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
  )
}
