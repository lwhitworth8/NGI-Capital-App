import { spFetch, PublicProject } from '@/lib/api'

async function getProjects(): Promise<PublicProject[]> {
  return spFetch('/api/public/projects')
}

export default async function ProjectsPage() {
  const items = await getProjects()
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Projects</h1>
        <input placeholder="Search projects" style={{ border:'1px solid #e5e7eb', borderRadius: 6, padding:'8px 12px' }} />
      </div>
      <div style={{ marginTop: 16, display:'flex', flexDirection:'column', gap: 12 }}>
        {items.map(p => (
          <a key={p.id} href={`/projects/${p.id}`} style={{ display:'flex', gap: 12, padding:12, border:'1px solid #e5e7eb', borderRadius:8, textDecoration:'none', color:'inherit' }}>
            <div style={{ width: 140, height: 80, background:'#f3f4f6', borderRadius:8, overflow:'hidden' }}>
              {p.hero_image_url ? <img src={p.hero_image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : null}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ fontWeight:700 }}>{p.project_name}</div>
                <span style={{ fontSize:12, color:'#059669', border:'1px solid #10b981', padding:'1px 6px', borderRadius:10 }}>Active</span>
              </div>
              <div style={{ fontSize:13, color:'#6b7280' }}>{p.summary}</div>
              <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
                {(p.partner_badges||[]).slice(0,2).map((b,i)=>(<span key={i} style={{ fontSize:10, background:'#f3f4f6', borderRadius:6, padding:'2px 6px' }}>{b}</span>))}
                {(p.backer_badges||[]).slice(0,2).map((b,i)=>(<span key={`b-${i}`} style={{ fontSize:10, background:'#f3f4f6', borderRadius:6, padding:'2px 6px' }}>{b}</span>))}
              </div>
            </div>
          </a>
        ))}
        {items.length === 0 && <div style={{ color:'#6b7280', fontSize:14 }}>No projects available.</div>}
      </div>
    </div>
  )
}

