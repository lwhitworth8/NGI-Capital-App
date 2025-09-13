'use client'

import { useEffect, useMemo, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { listTaskComments, postTaskComment, submitTask, type TaskComment } from '@/lib/api'

export default function TaskDetailPage({ params }: { params: { id: string, tid: string } }) {
  const pid = Number(params.id)
  const tid = Number(params.tid)
  const { user } = useUser()
  const email = useMemo(() => user?.primaryEmailAddress?.emailAddress || process.env.NEXT_PUBLIC_MOCK_STUDENT_EMAIL || '', [user?.primaryEmailAddress?.emailAddress])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<any | null>(null)
  const [comments, setComments] = useState<TaskComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [anchorVersion, setAnchorVersion] = useState<number | undefined>(undefined)
  const [urlValue, setUrlValue] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/public/tasks/${tid}`, { headers: email ? { 'X-Student-Email': email } : undefined })
      if (!res.ok) throw new Error(await res.text())
      const d = await res.json()
      const c = await listTaskComments(tid)
      setDetail(d)
      setComments(c)
      setAnchorVersion((d.submissions && d.submissions.length > 0) ? d.submissions[0].version : undefined)
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    load()
  }, [tid])

  const onSubmit = async () => {
    if (!email) { alert('Email not detected. Please sign in.'); return }
    try {
      setSubmitting(true)
      if (file) {
        if (file.size > 500 * 1024 * 1024) {
          alert('File exceeds 500 MB limit')
          setSubmitting(false)
          return
        }
        await submitTask(tid, { file })
      } else if (urlValue.trim()) {
        await submitTask(tid, { url: urlValue.trim() })
      } else {
        alert('Provide a file or URL')
        setSubmitting(false)
        return
      }
      setFile(null); setUrlValue('')
      await load()
    } catch (e: any) {
      alert(e?.message || 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  const onPostComment = async () => {
    if (!newComment.trim()) return
    try {
      await postTaskComment(tid, newComment.trim(), email, anchorVersion)
      setNewComment('')
      const c = await listTaskComments(tid)
      setComments(c)
    } catch (e: any) {
      alert(e?.message || 'Failed to post comment')
    }
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>
  if (!detail) return <div className="p-6 text-sm text-muted-foreground">Not found</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground"><Link href={`/my-projects/${pid}`}>Back to workspace</Link></div>
          <h1 className="text-2xl font-semibold mt-1">{detail.title}</h1>
          <div className="text-sm text-muted-foreground mt-1">
            Due: {detail.due_date ? new Date(detail.due_date).toLocaleDateString() : '-'} · Priority: {detail.priority || '-'} · Planned: {detail.planned_hours ?? '-'}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="border rounded-xl p-4 bg-card">
          <div className="font-medium mb-2">Submit</div>
          <div className="text-sm text-muted-foreground mb-2">Upload files up to 500 MB each (or submit a URL)</div>
          <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
          <div className="my-2 text-center text-xs text-muted-foreground">— or —</div>
          <input className="w-full border rounded px-2 py-1 text-sm" placeholder="https://..." value={urlValue} onChange={e=>setUrlValue(e.target.value)} />
          <div className="mt-3">
            <button onClick={onSubmit} disabled={submitting} className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm disabled:opacity-50">{submitting? 'Submitting…' : 'Submit'}</button>
          </div>
          <div className="mt-4">
            <div className="font-medium mb-1">My Submissions</div>
            <ul className="text-sm divide-y">
              {(detail.submissions||[]).map((s: any) => (
                <li key={s.version} className="py-2 flex justify-between">
                  <div>
                    <div>v{s.version} · {s.kind?.toUpperCase?.()} · {new Date(s.created_at).toLocaleString()}</div>
                    {s.is_late ? <div className="text-red-600">Late</div> : null}
                    {s.accepted ? <div className="text-green-600">Accepted</div> : null}
                  </div>
                  <div>
                    {s.url_or_path ? <a className="text-blue-600" href={s.url_or_path} target="_blank">Open</a> : null}
                  </div>
                </li>
              ))}
              {(!detail.submissions || detail.submissions.length===0) && <li className="py-2 text-muted-foreground">No submissions yet.</li>}
            </ul>
          </div>
        </div>

        <div className="border rounded-xl p-4 bg-card">
          <div className="font-medium mb-2">Comments</div>
          <div className="space-y-2 max-h-64 overflow-auto">
            {comments.map(c => (
              <div key={c.id} className="border rounded p-2">
                <div className="text-xs text-muted-foreground">{c.author_email || 'Anon'} · {new Date(c.created_at).toLocaleString()} {c.submission_version ? `· v${c.submission_version}` : ''}</div>
                <div className="text-sm mt-1 whitespace-pre-wrap">{c.body}</div>
              </div>
            ))}
            {comments.length===0 && <div className="text-sm text-muted-foreground">No comments yet.</div>}
          </div>
          <div className="mt-3 flex gap-2 items-center">
            <input className="flex-1 border rounded px-2 py-1 text-sm" placeholder="Add a comment" value={newComment} onChange={e=>setNewComment(e.target.value)} />
            <select className="border rounded px-2 py-1 text-sm" value={anchorVersion ?? ''} onChange={e => setAnchorVersion(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">No anchor</option>
              {(detail.submissions||[]).map((s: any) => <option key={s.version} value={s.version}>v{s.version}</option>)}
            </select>
            <button onClick={onPostComment} className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm">Post</button>
          </div>
        </div>
      </div>

      <div className="border rounded-xl p-4 bg-card">
        <div className="font-medium mb-2">Instructions</div>
        <div className="text-sm whitespace-pre-wrap">{detail.description || 'No instructions provided.'}</div>
      </div>
    </div>
  )
}

