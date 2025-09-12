"use client"

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context/AppContext'
import { advisoryListProjects, plmCreateTask, plmListTasks, plmCreateMeeting, plmListMeetings, plmAddResourceLink, plmListResources, plmListTimesheets, plmListDeliverables, plmAddComment, plmListComments, plmListMilestones, plmCreateMilestone, plmDeleteMilestone } from '@/lib/api'

type Task = { id:number; title:string; description?:string; priority:'low'|'med'|'high'; status:'todo'|'in_progress'|'review'|'done'|'blocked'; submission_type:'individual'|'group'; due_date?:string; planned_hours?:number; assignees:number[] }
type Milestone = { id:number; title:string; start_date?:string; end_date?:string; ord?:number }

export default function LeadManagerPage() {
  const { state } = useApp()
  const entityId = useMemo(() => Number(state.currentEntity?.id || 0), [state.currentEntity])
  const [projects, setProjects] = useState<{ id:number; project_name:string }[]>([])
  const [projectId, setProjectId] = useState<number|''>('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [form, setForm] = useState<{ title:string; description?:string; priority:'low'|'med'|'high'; due_date?:string; planned_hours?:number }>({ title:'', description:'', priority:'med' })
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [newMs, setNewMs] = useState<{ title:string; start_date?:string; end_date?:string; ord?:number }>({ title:'' })

  const loadProjects = async () => {
    const ps = await advisoryListProjects({ entity_id: entityId, status: 'active' })
    setProjects((ps||[]).map((p:any)=>({ id:p.id, project_name:p.project_name })))
    if (!projectId && ps && ps.length>0) setProjectId(ps[0].id)
  }

  const loadTasks = async () => {
    if (!projectId) { setTasks([]); return }
    try { setTasks(await plmListTasks(Number(projectId))) } catch { setTasks([]) }
  }
  const loadMilestones = async () => {
    if (!projectId) { setMilestones([]); return }
    try { setMilestones(await plmListMilestones(Number(projectId))) } catch { setMilestones([]) }
  }

  const createTask = async () => {
    if (!projectId || !form.title.trim()) return
    await plmCreateTask(Number(projectId), { title: form.title, description: form.description, priority: form.priority, due_date: form.due_date, planned_hours: form.planned_hours })
    setForm({ title:'', description:'', priority:'med' })
    await loadTasks()
  }

  // Meetings / Resources / Timesheets
  const [meetings, setMeetings] = useState<any[]>([])
  const [meeting, setMeeting] = useState<{ title:string; start_ts:string; end_ts:string; attendees_emails:string }>({ title:'', start_ts:'', end_ts:'', attendees_emails:'' })
  const [resources, setResources] = useState<any[]>([])
  const [resourceUrl, setResourceUrl] = useState<string>('')
  const [timesheets, setTimesheets] = useState<any[]>([])
  const [deliverables, setDeliverables] = useState<any[]>([])
  const [commentTaskId, setCommentTaskId] = useState<number|''>('')
  const [comments, setComments] = useState<any[]>([])
  const [commentBody, setCommentBody] = useState('')

  const loadMeetings = async () => {
    if (!projectId) { setMeetings([]); return }
    try { setMeetings(await plmListMeetings(Number(projectId))) } catch { setMeetings([]) }
  }
  const loadResources = async () => {
    if (!projectId) { setResources([]); return }
    try { setResources(await plmListResources(Number(projectId))) } catch { setResources([]) }
  }
  const loadTimesheets = async () => {
    if (!projectId) { setTimesheets([]); return }
    try { setTimesheets(await plmListTimesheets(Number(projectId))) } catch { setTimesheets([]) }
  }
  const loadDeliverables = async () => {
    if (!projectId) { setDeliverables([]); return }
    try { setDeliverables(await plmListDeliverables(Number(projectId))) } catch { setDeliverables([]) }
  }
  useEffect(() => { loadMeetings(); loadResources(); loadTimesheets(); loadDeliverables(); loadMilestones() }, [projectId])

  const createMeeting = async () => {
    if (!projectId || !meeting.start_ts || !meeting.end_ts) return
    const emails = meeting.attendees_emails.split(',').map(s=>s.trim()).filter(Boolean)
    await plmCreateMeeting(Number(projectId), { title: meeting.title || 'Project Meeting', start_ts: meeting.start_ts, end_ts: meeting.end_ts, attendees_emails: emails })
    setMeeting({ title:'', start_ts:'', end_ts:'', attendees_emails:'' })
    await loadMeetings()
  }
  const addResource = async () => {
    if (!projectId || !resourceUrl.trim()) return
    await plmAddResourceLink(Number(projectId), { url: resourceUrl.trim() })
    setResourceUrl(''); await loadResources()
  }
  const createMilestone = async () => {
    if (!projectId || !newMs.title.trim()) return
    await plmCreateMilestone(Number(projectId), newMs)
    setNewMs({ title:'' })
    await loadMilestones()
  }
  const removeMilestone = async (id:number) => {
    await plmDeleteMilestone(id)
    await loadMilestones(); await loadTasks()
  }

  const loadComments = async () => {
    if (!commentTaskId) { setComments([]); return }
    try { setComments(await plmListComments(Number(commentTaskId))) } catch { setComments([]) }
  }
  useEffect(() => { loadComments() }, [commentTaskId])

  const addComment = async () => {
    if (!commentTaskId || !commentBody.trim()) return
    await plmAddComment(Number(commentTaskId), { body: commentBody.trim() })
    setCommentBody('')
    await loadComments()
  }

  useEffect(() => { loadProjects() }, [entityId])
  useEffect(() => { loadTasks() }, [projectId])

  const grouped: Record<Task['status'], Task[]> = { todo:[], in_progress:[], review:[], done:[], blocked:[] }
  const safeTasks: Task[] = Array.isArray(tasks) ? tasks : []
  const validStatuses: Task['status'][] = ['todo','in_progress','review','done','blocked']
  safeTasks.forEach((t) => {
    const st = (t && (validStatuses as string[]).includes((t as any).status)) ? t.status : 'todo'
    grouped[st as Task['status']].push(t)
  })

  const column = (status: Task['status']) => (
    <div key={status} className="rounded-xl border border-border bg-card/50 p-3">
      <div className="text-sm font-semibold capitalize mb-2">{status} <span className="text-xs text-muted-foreground">({grouped[status].length})</span></div>
      <div className="space-y-2">
        {grouped[status].map(t => (
          <div key={t.id} className="rounded border border-border bg-card p-3">
            <div className="text-sm font-medium">{t.title}</div>
            <div className="text-xs text-muted-foreground">{t.description || '-'}</div>
            <div className="text-[11px] text-muted-foreground">{(milestones.find(m=>m.id===((t as any).milestone_id))?.title) || ''}</div>
            <div className="text-[11px] text-muted-foreground">Priority: {t.priority}</div>
          </div>
        ))}
        {grouped[status].length===0 && <div className="text-xs text-muted-foreground">No tasks</div>}
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Student Project Lead Manager</h1>
      </div>
      <div className="flex items-center gap-3">
        <select className="px-3 py-2 border rounded bg-background text-sm" value={projectId} onChange={e=>setProjectId(Number(e.target.value)||'')}>
          {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
        </select>
        <input className="px-3 py-2 border rounded bg-background text-sm" placeholder="Task title" value={form.title} onChange={e=>setForm(f=>({ ...f, title: e.target.value }))} />
        <input className="px-3 py-2 border rounded bg-background text-sm w-64" placeholder="Description" value={form.description||''} onChange={e=>setForm(f=>({ ...f, description: e.target.value }))} />
        <select className="px-3 py-2 border rounded bg-background text-sm" value={form.priority} onChange={e=>setForm(f=>({ ...f, priority: e.target.value as any }))}>
          {['low','med','high'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="px-3 py-2 border rounded bg-background text-sm" defaultValue="">
          <option value="">No milestone</option>
          {milestones.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
        <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={createTask}>Add Task</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {(['todo','in_progress','review','done','blocked'] as Task['status'][]).map(column)}
      </div>

      {/* Meetings */}
      <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
        <div className="text-lg font-semibold">Meetings</div>
        <div className="flex flex-wrap gap-2">
          <input className="px-3 py-2 border rounded bg-background text-sm" placeholder="Title (optional)" value={meeting.title} onChange={e=>setMeeting(m=>({...m, title:e.target.value}))} />
          <input className="px-3 py-2 border rounded bg-background text-sm" placeholder="Start (ISO)" value={meeting.start_ts} onChange={e=>setMeeting(m=>({...m, start_ts:e.target.value}))} />
          <input className="px-3 py-2 border rounded bg-background text-sm" placeholder="End (ISO)" value={meeting.end_ts} onChange={e=>setMeeting(m=>({...m, end_ts:e.target.value}))} />
          <input className="px-3 py-2 border rounded bg-background text-sm w-64" placeholder="Attendees emails (comma-separated)" value={meeting.attendees_emails} onChange={e=>setMeeting(m=>({...m, attendees_emails:e.target.value}))} />
          <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={createMeeting}>Schedule</button>
        </div>
        <div className="text-sm text-muted-foreground">{meetings.length} scheduled</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr><th className="text-left p-2">Title</th><th className="text-left p-2">Start</th><th className="text-left p-2">End</th><th className="text-left p-2">Attendees</th></tr>
            </thead>
            <tbody>
              {meetings.map((m:any)=> (
                <tr key={m.id} className="border-t border-border">
                  <td className="p-2">{m.title||'-'}</td>
                  <td className="p-2">{m.start_ts}</td>
                  <td className="p-2">{m.end_ts}</td>
                  <td className="p-2">{Array.isArray(m.attendees_emails)? m.attendees_emails.join(', '): ''}</td>
                </tr>
              ))}
              {meetings.length===0 && <tr><td className="p-2 text-muted-foreground" colSpan={4}>No meetings</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resources */}
      <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
        <div className="text-lg font-semibold">Resources</div>
        <div className="flex items-center gap-2">
          <input className="px-3 py-2 border rounded bg-background text-sm w-96" placeholder="Link URL (Drive/Git/etc.)" value={resourceUrl} onChange={e=>setResourceUrl(e.target.value)} />
          <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={addResource}>Add Link</button>
        </div>
        <div className="text-sm text-muted-foreground">{resources.length} resources</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr><th className="text-left p-2">Title</th><th className="text-left p-2">Kind</th><th className="text-left p-2">Link</th></tr>
            </thead>
            <tbody>
              {resources.map((r:any)=> (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-2">{r.title||'-'}</td>
                  <td className="p-2 capitalize">{r.kind}</td>
                  <td className="p-2"><a className="text-blue-600 hover:underline" href={r.url_or_path} target="_blank" rel="noreferrer">Open</a></td>
                </tr>
              ))}
              {resources.length===0 && <tr><td className="p-2 text-muted-foreground" colSpan={3}>No resources</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Timesheets summary */}
      <div className="rounded-xl border border-border bg-card/50 p-4 space-y-1">
        <div className="text-lg font-semibold">Timesheets (Summary)</div>
        <div className="text-sm text-muted-foreground">Entries: {timesheets.length}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr><th className="text-left p-2">Student</th><th className="text-left p-2">Week</th><th className="text-left p-2">Total Hours</th></tr>
            </thead>
            <tbody>
              {timesheets.map((t:any, idx:number)=> (
                <tr key={idx} className="border-t border-border">
                  <td className="p-2">{t.student_id}</td>
                  <td className="p-2">{t.week_start_date}</td>
                  <td className="p-2">{t.total_hours}</td>
                </tr>
              ))}
              {timesheets.length===0 && <tr><td className="p-2 text-muted-foreground" colSpan={3}>No entries</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deliverables summary */}
      <div className="rounded-xl border border-border bg-card/50 p-4 space-y-1">
        <div className="text-lg font-semibold">Deliverables</div>
        <div className="text-sm text-muted-foreground">Submissions: {deliverables.length}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr><th className="text-left p-2">Task</th><th className="text-left p-2">Version</th><th className="text-left p-2">Kind</th><th className="text-left p-2">Link</th><th className="text-left p-2">Late?</th></tr>
            </thead>
            <tbody>
              {deliverables.map((d:any)=> (
                <tr key={d.id} className="border-t border-border">
                  <td className="p-2">{d.task_title||d.task_id}</td>
                  <td className="p-2">v{d.version}</td>
                  <td className="p-2 capitalize">{d.kind}</td>
                  <td className="p-2">{d.url_or_path ? <a className="text-blue-600 hover:underline" href={d.url_or_path} target="_blank" rel="noreferrer">Open</a> : '-'}</td>
                  <td className="p-2">{d.is_late ? 'Yes' : 'No'}</td>
                </tr>
              ))}
              {deliverables.length===0 && <tr><td className="p-2 text-muted-foreground" colSpan={5}>No deliverables</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comments */}
      <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
        <div className="text-lg font-semibold">Task Comments</div>
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 border rounded bg-background text-sm" value={commentTaskId} onChange={e=>setCommentTaskId(Number(e.target.value)||'')}>
            <option value="">Select task…</option>
            {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <input className="px-3 py-2 border rounded bg-background text-sm w-96" placeholder="Add a comment" value={commentBody} onChange={e=>setCommentBody(e.target.value)} />
          <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={addComment} disabled={!commentTaskId || !commentBody.trim()}>Post</button>
        </div>
        <div className="space-y-2">
          {comments.map((c:any)=> (
            <div key={c.id} className="rounded border border-border bg-card p-2 text-sm">
              <div className="text-xs text-muted-foreground">{c.author_email || 'Lead'} • {c.created_at}</div>
              <div>{c.body}</div>
            </div>
          ))}
          {(!comments || comments.length===0) && <div className="text-xs text-muted-foreground">No comments</div>}
        </div>
      </div>
    </div>
  )
}
