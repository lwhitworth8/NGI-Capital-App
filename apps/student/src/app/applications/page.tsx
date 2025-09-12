import { spFetch, listMyApplications, listMyArchivedApplications, PublicProjectDetail } from '@/lib/api'
import { StatusPill } from '@ngi/ui'
import Link from 'next/link'
export const dynamic = 'force-dynamic'

type MyApplication = { id:number; target_project_id?:number; status:string; created_at:string; updated_at?:string; has_updates?:boolean }

export default async function ApplicationsPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const viewParam = (typeof searchParams?.view === 'string' ? searchParams?.view : Array.isArray(searchParams?.view) ? searchParams?.view?.[0] : '')
  const isPast = (viewParam || '').toLowerCase() === 'past'

  const items: MyApplication[] = await listMyApplications().catch(()=>[] as MyApplication[])
  const archived = await (isPast ? listMyArchivedApplications().catch(()=>[]) : Promise.resolve([]))

  // Profile gate (V1): require full set of fields as per Students Admin PRD
  // phone, linkedin_url, gpa, location, school, program, grad_year, resume_url
  let profileIncomplete = false
  try {
    const prof = await spFetch<any>('/api/public/profile')
    const missing = [
      prof?.school,
      prof?.program,
      (prof?.grad_year ?? null),
      prof?.phone,
      prof?.linkedin_url,
      (typeof prof?.gpa === 'number' ? prof?.gpa : null),
      prof?.location,
      prof?.resume_url,
    ].some(v => (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')))
    profileIncomplete = missing
  } catch {}

  // Current project names (best-effort)
  const projectMap: Record<number, string> = {}
  try {
    const ids = Array.from(new Set(items.map(i => i.target_project_id).filter(Boolean))) as number[]
    const details = await Promise.all(ids.map(async (id) => {
      try { const d = await spFetch<PublicProjectDetail>(`/api/public/projects/${id}`); return { id, name: d.project_name } } catch { return { id, name: `Project #${id}` } }
    }))
    details.forEach(d => { projectMap[d.id] = d.name })
  } catch {}

  // Build combined past list (archived + current withdrawn/rejected), de-dup by id
  const currentPast = items.filter(i => ['withdrawn','rejected'].includes((i.status||'').toLowerCase()))
  const pastMap = new Map<number, any>()
  currentPast.forEach(i => pastMap.set(i.id, { id: i.id, target_project_id: i.target_project_id, status: i.status, created_at: i.created_at, has_updates: false }))
  archived.forEach(a => { if (!pastMap.has(a.id)) pastMap.set(a.id, { id: a.id, target_project_id: a.project_id, status: a.status || 'archived', created_at: a.archived_at, has_updates: false }) })
  const pastList = Array.from(pastMap.values()).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const pastCount = pastList.length
  const listToRender: any[] = isPast ? pastList : items

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>My Applications</h1>
      {profileIncomplete && (
        <div style={{ marginTop: 12, padding: 12, border:'1px solid #fde68a', background:'#fffbeb', color:'#92400e', borderRadius:8 }}>
          Your profile is incomplete. Please <Link href="/settings" style={{ color:'#2563eb' }}>complete your profile</Link> (school, program, grad year, phone, LinkedIn, GPA, location, resume) to apply to projects.
        </div>
      )}
      <div style={{ marginTop: 8 }}>
        {isPast ? (
          <>
            <Link href="/applications" style={{ color:'#2563eb', marginRight:12 }}>Show Current</Link>
            <span style={{ color:'#374151' }}>Past Applications ({pastCount})</span>
          </>
        ) : (
          <>
            <span style={{ color:'#374151', marginRight:12 }}>Current</span>
            <Link href="/applications?view=past" style={{ color:'#2563eb' }}>Show Past Applications ({pastCount})</Link>
          </>
        )}
      </div>
      <div style={{ marginTop: 12 }}>
        {listToRender.map((a: any) => (
          <div key={a.id} style={{ border:'1px solid #e5e7eb', borderRadius:8, padding:12, marginBottom:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:14 }}>Application #{a.id} {a.has_updates ? <span style={{ marginLeft:8, fontSize:10, color:'#fff', background:'#7c3aed', padding:'2px 6px', borderRadius:999 }}>Updated</span> : null}</div>
                <div style={{ fontSize:12, color:'#6b7280' }}>Status: <StatusPill status={a.status} /> · {new Date(a.created_at).toLocaleString()}</div>
                {a.target_project_id ? (
                  <div style={{ fontSize:12 }}>
                    <Link href={`/projects/${a.target_project_id}`} style={{ color:'#2563eb' }}>
                      {projectMap[a.target_project_id] || `Project #${a.target_project_id}`}
                    </Link>
                  </div>
                ) : null}
              </div>
              <div>
                {!isPast && <Link href={`/applications/${a.id}`} style={{ color:'#2563eb' }}>View</Link>}
              </div>
            </div>
          </div>
        ))}
        {(!isPast && items.length === 0) && <div style={{ color:'#6b7280', fontSize:14 }}>No applications yet.</div>}
        {(isPast && listToRender.length === 0) && <div style={{ color:'#6b7280', fontSize:14 }}>No past applications.</div>}
      </div>
    </div>
  )
}
