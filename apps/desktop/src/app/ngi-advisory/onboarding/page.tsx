"use client"

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useApp } from '@/lib/context/AppContext'
import {
  advisoryListProjects,
  advisoryListStudents,
} from '@/lib/api'
import { apiClient, advisoryListApplications } from '@/lib/api'

type Flow = {
  id: number;
  student_id: number;
  project_id: number;
  student_email?: string;
  student_name?: string;
  project_name?: string;
  ngi_email?: string;
  email_created: number;
  intern_agreement_sent: number;
  intern_agreement_received: number;
  nda_required: number;
  nda_sent: number;
  nda_received: number;
  status: string;
}

export default function OnboardingAdminPage() {
  const { state } = useApp()
  const entityId = useMemo(() => Number(state.currentEntity?.id || 0), [state.currentEntity])
  const [flows, setFlows] = useState<Flow[]>([])
  const [projects, setProjects] = useState<{ id:number; project_name:string }[]>([])
  const [students, setStudents] = useState<{ id:number; email:string; first_name?:string; last_name?:string }[]>([])
  const [eligibleEmails, setEligibleEmails] = useState<string[]>([])
  const [form, setForm] = useState<{ student_id?:number; project_id?:number; nda_required:boolean }>({ nda_required: true })
  const searchParams = useSearchParams()

  const loadFlows = async () => {
    const res = await apiClient.request<Flow[]>('GET', '/advisory/onboarding/flows')
    setFlows(res || [])
  }
  const loadProjectsAndStudents = async () => {
    const ps = await advisoryListProjects({ entity_id: entityId, status: 'active' })
    setProjects((ps||[]).map((p:any)=>({ id:p.id, project_name:p.project_name })))
    const ss = await advisoryListStudents({ q: '' })
    setStudents((ss||[]).map((s:any)=>({ id:s.id, email:s.email, first_name:s.first_name, last_name:s.last_name })))
    // Prefill from query params if present
    try {
      const se = searchParams?.get('student_email')
      const pid = searchParams?.get('project_id')
      const preStudent = se ? (ss||[]).find((s:any)=>(s.email||'').toLowerCase()===(se||'').toLowerCase())?.id : undefined
      const preProject = pid ? parseInt(pid,10) : undefined
      setForm(f=>({ ...f, student_id: preStudent || f.student_id, project_id: preProject || f.project_id }))
    } catch {}
  }

  // Recompute eligible students (those with 'offer' applications for selected project)
  useEffect(() => {
    const run = async () => {
      if (!form.project_id) { setEligibleEmails([]); return }
      const apps = await advisoryListApplications({ project_id: form.project_id, status: 'offer' })
      const emails = Array.from(new Set((apps||[]).map((a:any)=> (a.email||'').toLowerCase()).filter(Boolean)))
      setEligibleEmails(emails)
      // If a preselected student is not eligible, clear it
      if (form.student_id) {
        const se = (students.find(s=>s.id===form.student_id)?.email || '').toLowerCase()
        if (!emails.includes(se)) setForm(f=>({ ...f, student_id: undefined }))
      }
    }
    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.project_id, entityId])

  useEffect(() => { loadFlows(); loadProjectsAndStudents() }, [entityId])

  const createFlow = async () => {
    if (!form.student_id || !form.project_id) return
    await apiClient.request('POST', '/advisory/onboarding/flows', { student_id: form.student_id, project_id: form.project_id, nda_required: form.nda_required })
    setForm({ nda_required: true })
    await loadFlows()
  }

  const patchFlow = async (id:number, patch:any) => { await apiClient.request('PATCH', `/advisory/onboarding/flows/${id}`, patch); await loadFlows() }
  const uploadFlow = async (id:number, file:File) => { const form = new FormData(); form.append('file', file); await apiClient.request('POST', `/advisory/onboarding/flows/${id}/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } }); await loadFlows() }
  const finalizeFlow = async (id:number) => { await apiClient.request('POST', `/advisory/onboarding/flows/${id}/finalize`); await loadFlows() }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Onboarding</h1>

      <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="text-sm font-medium">Create Onboarding Flow</div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <select className="px-3 py-2 border rounded bg-background text-sm" value={form.student_id||''} onChange={e=>setForm(f=>({ ...f, student_id: parseInt(e.target.value||'0',10)||undefined }))} disabled={!form.project_id}>
                <option value="">Select student (Offer stage)…</option>
                {students.filter(s => eligibleEmails.includes((s.email||'').toLowerCase())).map(s => <option key={s.id} value={s.id}>{s.first_name||''} {s.last_name||''} ({s.email})</option>)}
              </select>
              <select className="px-3 py-2 border rounded bg-background text-sm" value={form.project_id||''} onChange={e=>setForm(f=>({ ...f, project_id: parseInt(e.target.value||'0',10)||undefined }))}>
                <option value="">Project…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
              </select>
              <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={!!form.nda_required} onChange={e=>setForm(f=>({ ...f, nda_required: !!e.target.checked }))} /> NDA required</label>
              <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={createFlow}>Create</button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="p-3">Student</th>
                  <th className="p-3">Project</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Workflow</th>
                </tr>
              </thead>
              <tbody>
                {flows.map(i => (
                  <tr key={i.id} className="border-b border-border align-top">
                    <td className="p-3">{(i as any).student_name || i.student_email || i.student_id}</td>
                    <td className="p-3">{(i as any).project_name || i.project_id}</td>
                    <td className="p-3 capitalize">{i.status}</td>
                    <td className="p-3">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <input placeholder="NGI email" className="px-2 py-1 border rounded bg-background text-xs" defaultValue={i.ngi_email||''} onBlur={e=>patchFlow(i.id, { ngi_email: e.target.value })} />
                          <label className="text-xs flex items-center gap-2"><input type="checkbox" defaultChecked={!!i.email_created} onChange={e=>patchFlow(i.id, { email_created: e.target.checked })} /> Email created</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="px-2 py-1 rounded border text-xs" onClick={()=>patchFlow(i.id, { intern_agreement_sent: 1 })}>Mark Intern Agreement Sent</button>
                          <label className="text-xs flex items-center gap-2"><input type="checkbox" defaultChecked={!!i.nda_required} onChange={e=>patchFlow(i.id, { nda_required: e.target.checked })} /> NDA required</label>
                          {!!i.nda_required && <button className="px-2 py-1 rounded border text-xs" onClick={()=>patchFlow(i.id, { nda_sent: 1 })}>Mark NDA Sent</button>}
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs">Upload signed docs</div>
                          <input type="file" onChange={e=>{ const f=e.target.files?.[0]; if(f) uploadFlow(i.id, f) }} className="text-xs" />
                          <ul className="list-disc ml-5">
                            {((i as any).files||[]).map((f:any)=> (
                              <li key={f.id} className="text-xs"><a className="underline" href={f.file_url} target="_blank">{f.file_name}</a> <span className="text-[11px] text-muted-foreground">({f.uploaded_at})</span></li>
                            ))}
                            {(!((i as any).files)|| (i as any).files.length===0) && <li className="text-xs text-muted-foreground">No files uploaded</li>}
                          </ul>
                          <div className="flex items-center gap-2">
                            <label className="text-xs flex items-center gap-2"><input type="checkbox" defaultChecked={!!i.intern_agreement_received} onChange={e=>patchFlow(i.id, { intern_agreement_received: e.target.checked })} /> Intern Agreement Received</label>
                            {!!i.nda_required && <label className="text-xs flex items-center gap-2"><input type="checkbox" defaultChecked={!!i.nda_received} onChange={e=>patchFlow(i.id, { nda_received: e.target.checked })} /> NDA Received</label>}
                          </div>
                        </div>
                        <button className="px-3 py-1.5 rounded bg-green-600 text-white text-xs" disabled={i.status==='onboarded' || !i.intern_agreement_received || (!!i.nda_required && !i.nda_received)} onClick={async()=>{
                          try { await finalizeFlow(i.id) } catch(e:any) { alert(e?.message || 'Finalize failed') }
                        }}>Officially Onboard</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {flows.length===0 && <tr><td className="p-3 text-muted-foreground" colSpan={4}>No onboarding flows.</td></tr>}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  )
}
