import { spFetch } from '@/lib/api'

async function getProject(id: string) {
  return spFetch(`/api/public/projects/${id}`)
}

export default async function ProjectDetail({ params }: { params: { id: string } }) {
  const p = await getProject(params.id)
  return (
    <div style={{ padding: 24 }}>
      <a href="/projects" style={{ fontSize:12 }}>&larr; Back</a>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginTop:8 }}>{p.project_name}</h1>
      <p style={{ color:'#6b7280' }}>{p.client_name}</p>
      {p.hero_image_url && (
        <div style={{ marginTop:12 }}>
          <img src={p.hero_image_url} alt="" style={{ width:'100%', maxHeight:320, objectFit:'cover', borderRadius:8 }} />
        </div>
      )}
      <p style={{ marginTop:12 }}>{p.description || p.summary}</p>
      <div style={{ marginTop:16, display:'flex', gap:8 }}>
        {p.allow_applications ? <a href={`/applications`} style={{ border:'1px solid #0ea5e9', color:'#0ea5e9', padding:'8px 12px', borderRadius:8 }}>Apply</a> : null}
        {p.coffeechat_calendly ? <a href={p.coffeechat_calendly} target="_blank" style={{ border:'1px solid #6b7280', color:'#374151', padding:'8px 12px', borderRadius:8 }}>Coffee Chat</a> : null}
      </div>
    </div>
  )
}

