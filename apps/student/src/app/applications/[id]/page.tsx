import { getApplicationDetail, markApplicationSeen } from '@/lib/api'
import Link from 'next/link'
import WithdrawButton from './WithdrawButton'

export const dynamic = 'force-dynamic'

export default async function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id)
  const detail = await getApplicationDetail(id).catch(()=>null as any)
  if (!detail) {
    return <div style={{ padding: 24 }}><h1 style={{ fontSize: 24, fontWeight: 700 }}>Application</h1><div style={{ color:'#6b7280' }}>Not found</div></div>
  }
  // Mark seen (best-effort)
  try { await markApplicationSeen(id) } catch {}
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Application #{detail.id}</h1>
      <div style={{ marginTop: 8, fontSize: 14 }}>
        Status: <b>{detail.status}</b>
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color:'#6b7280' }}>Submitted: {new Date(detail.submitted_at).toLocaleString()}</div>
      <div style={{ marginTop: 12 }}>
        <Link href={`/projects/${detail.project_id}`} style={{ color:'#2563eb' }}>Open Project</Link>
      </div>
      <div style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Answers</h2>
        <div style={{ marginTop: 8 }}>
          {(detail.answers||[]).map((a:any, idx:number)=> (
            <details key={idx} style={{ border:'1px solid #e5e7eb', borderRadius:8, padding:12, marginBottom:8 }}>
              <summary style={{ fontSize:12, color:'#6b7280', cursor:'pointer' }}>{a.prompt}</summary>
              <div style={{ fontSize:14, marginTop:8, whiteSpace:'pre-wrap' }}>{a.response}</div>
            </details>
          ))}
          {(!detail.answers || detail.answers.length===0) && <div style={{ color:'#6b7280', fontSize:14 }}>No answers captured.</div>}
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Resume Snapshot</h2>
        {detail.resume_url_snapshot
          ? <div style={{ marginTop: 8 }}><a href={detail.resume_url_snapshot} style={{ color:'#2563eb' }} target="_blank">Download Resume</a></div>
          : <div style={{ color:'#6b7280', fontSize:14, marginTop:8 }}>No resume snapshot available.</div>
        }
      </div>
      <div style={{ marginTop: 24 }}>
        <WithdrawButton id={detail.id} />
      </div>
    </div>
  )
}
