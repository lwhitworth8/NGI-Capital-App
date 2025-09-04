"use client"

import { useState } from 'react'

export default function ApplyForm({ projectId }: { projectId: number }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [school, setSchool] = useState('')
  const [program, setProgram] = useState('')
  const [resumeUrl, setResumeUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/public/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(email ? { 'X-Student-Email': email } : {}) },
        body: JSON.stringify({
          target_project_id: projectId,
          first_name: firstName,
          last_name: lastName,
          email,
          school,
          program,
          resume_url: resumeUrl,
          notes,
        }),
      })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || 'Failed to submit')
      }
      setMessage('Application submitted!')
      setFirstName(''); setLastName(''); setEmail(''); setSchool(''); setProgram(''); setResumeUrl(''); setNotes('')
    } catch (err: any) {
      setMessage(err?.message || 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ border:'1px solid #e5e7eb', borderRadius:8, padding:12 }}>
      <div style={{ fontWeight:600, marginBottom:8 }}>Apply to this project</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <input placeholder="First name" value={firstName} onChange={e=>setFirstName(e.target.value)} style={{ border:'1px solid #e5e7eb', borderRadius:6, padding:'8px 10px' }} />
        <input placeholder="Last name" value={lastName} onChange={e=>setLastName(e.target.value)} style={{ border:'1px solid #e5e7eb', borderRadius:6, padding:'8px 10px' }} />
        <input placeholder="Email (UC domain)" value={email} onChange={e=>setEmail(e.target.value)} style={{ border:'1px solid #e5e7eb', borderRadius:6, padding:'8px 10px', gridColumn:'span 2' }} />
        <input placeholder="School" value={school} onChange={e=>setSchool(e.target.value)} style={{ border:'1px solid #e5e7eb', borderRadius:6, padding:'8px 10px' }} />
        <input placeholder="Program" value={program} onChange={e=>setProgram(e.target.value)} style={{ border:'1px solid #e5e7eb', borderRadius:6, padding:'8px 10px' }} />
        <input placeholder="Resume URL (optional)" value={resumeUrl} onChange={e=>setResumeUrl(e.target.value)} style={{ border:'1px solid #e5e7eb', borderRadius:6, padding:'8px 10px', gridColumn:'span 2' }} />
        <textarea placeholder="Notes (optional)" value={notes} onChange={e=>setNotes(e.target.value)} style={{ border:'1px solid #e5e7eb', borderRadius:6, padding:'8px 10px', gridColumn:'span 2' }} />
      </div>
      <div style={{ display:'flex', gap:8, marginTop:8 }}>
        <button type="submit" disabled={submitting} style={{ border:'1px solid #0ea5e9', color:'#0ea5e9', padding:'8px 12px', borderRadius:8 }}>
          {submitting ? 'Submitting…' : 'Submit Application'}
        </button>
      </div>
      {message && <div style={{ marginTop:8, fontSize:12, color:'#6b7280' }}>{message}</div>}
    </form>
  )
}

