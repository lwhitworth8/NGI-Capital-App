import { spFetch } from '@/lib/api'
export const dynamic = 'force-dynamic'

type Membership = { id:number; project_id:number; role?:string; hours_planned?:number; active:boolean }

async function getMine(): Promise<Membership[]> {
  return spFetch<Membership[]>('/api/public/memberships/mine')
}

export default async function MyProjectsPage() {
  const items: Membership[] = await getMine().catch(()=>[] as Membership[])
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>My Projects</h1>
      <div style={{ marginTop: 12 }}>
        {items.map(m => (
          <div key={m.id} style={{ border:'1px solid #e5e7eb', borderRadius:8, padding:12, marginBottom:8 }}>
            <div style={{ fontSize:14 }}>Project #{m.project_id}</div>
            <div style={{ fontSize:12, color:'#6b7280' }}>Role: {m.role || 'Member'} • Hours: {m.hours_planned || 0} • {m.active ? 'Active' : 'Inactive'}</div>
          </div>
        ))}
        {items.length === 0 && <div style={{ color:'#6b7280', fontSize:14 }}>No assigned projects yet.</div>}
      </div>
    </div>
  )
}
