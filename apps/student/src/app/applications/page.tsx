import { spFetch } from '@/lib/api'

async function getMine(): Promise<{ id:number; target_project_id?:number; status:string; created_at:string }[]> {
  // For MVP, relies on server extracting email from header or query param
  return spFetch('/api/public/applications/mine')
}

export default async function ApplicationsPage() {
  const items = await getMine().catch(()=>[])
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>My Applications</h1>
      <div style={{ marginTop: 12 }}>
        {items.map(a => (
          <div key={a.id} style={{ border:'1px solid #e5e7eb', borderRadius:8, padding:12, marginBottom:8 }}>
            <div style={{ fontSize:14 }}>Application #{a.id}</div>
            <div style={{ fontSize:12, color:'#6b7280' }}>Status: {a.status} • {new Date(a.created_at).toLocaleString()}</div>
          </div>
        ))}
        {items.length === 0 && <div style={{ color:'#6b7280', fontSize:14 }}>No applications yet.</div>}
      </div>
    </div>
  )
}

