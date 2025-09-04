import { spFetch, PublicProjectDetail } from '@/lib/api'
export const dynamic = 'force-dynamic'
import ApplyForm from './apply-form'

async function getProject(id: string): Promise<PublicProjectDetail> {
  return spFetch<PublicProjectDetail>(`/api/public/projects/${id}`)
}

export default async function ProjectDetail({ params }: { params: { id: string } }) {
  const p: PublicProjectDetail = await getProject(params.id)
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
      <div style={{ marginTop:16, display:'flex', gap:8, flexWrap:'wrap' }}>
        {p.coffeechat_calendly ? <a href={p.coffeechat_calendly} target="_blank" style={{ border:'1px solid #6b7280', color:'#374151', padding:'8px 12px', borderRadius:8 }}>Coffee Chat</a> : null}
      </div>
      {p.allow_applications ? (
        <div style={{ marginTop: 16 }}>
          <ApplyForm projectId={p.id} />
        </div>
      ) : null}
    </div>
  )
}
