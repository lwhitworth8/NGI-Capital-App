"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { postEvent } from '@/lib/telemetry'

type Profile = { 
  resume_url?: string | null;
  school?: string | null;
  program?: string | null;
  grad_year?: number | null;
  phone?: string | null;
  linkedin_url?: string | null;
  gpa?: number | null;
  location?: string | null;
}

type Question = { idx: number; prompt: string }

export default function ApplyWidget({ projectId, allowApply, coffeechat, questions = [] }: { projectId: number; allowApply: boolean; coffeechat?: string; questions?: Question[] }) {
  const { user } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [answers, setAnswers] = useState<{ [key: string]: string }>({ why: '', skills: '', availability: '' })
  const fullName = useMemo(() => `${user?.firstName || ''} ${user?.lastName || ''}`.trim(), [user?.firstName, user?.lastName])

  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        const email = user?.primaryEmailAddress?.emailAddress
        if (!email) return
        const res = await fetch('/api/public/profile', {
          headers: { 'X-Student-Email': email }
        })
        if (res.ok) {
          const data = await res.json()
          if (!ignore) setProfile(data)
        }
      } catch {}
    }
    load()
    return () => { ignore = true }
  }, [user?.primaryEmailAddress?.emailAddress])

  const onApply = async () => {
    if (!allowApply) return
    // Gate by profile completeness
    const p = profile || {}
    const missing = [
      p.school,
      p.program,
      (p.grad_year ?? null),
      p.phone,
      p.linkedin_url,
      (typeof p.gpa === 'number' ? p.gpa : null),
      p.location,
      p.resume_url,
    ].some(v => (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')))
    if (missing) {
      alert('Please complete your profile in Settings before applying (school, program, grad year, phone, LinkedIn, GPA, location, resume).')
      return
    }
    setLoading(true)
    try {
      postEvent('project_apply_click', { project_id: projectId })
      const payload: any = {
        target_project_id: projectId,
        first_name: user?.firstName || null,
        last_name: user?.lastName || null,
        email: user?.primaryEmailAddress?.emailAddress || undefined,
        notes: `Why: ${answers.why || ''}\nSkills: ${answers.skills || ''}\nAvailability: ${answers.availability || ''}`,
        resume_url: profile?.resume_url || null,
      }
      if (questions && questions.length) {
        payload.answers = questions.map(q => ({ prompt: q.prompt, response: answers[String(q.idx)] || '' }))
        // Validate word limits (<=500 words per response)
        const tooLong = (payload.answers as any[]).some(a => (a.response || '').trim().split(/\s+/).filter(Boolean).length > 500)
        if (tooLong) throw new Error('Please keep each answer within 500 words')
      }
      const res = await fetch('/api/public/applications', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Student-Email': user?.primaryEmailAddress?.emailAddress || ''
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      postEvent('project_application_submitted', { project_id: projectId })
      router.push('/applications')
    } catch (err) {
      alert('Failed to submit application')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 sticky top-6">
      <div className="text-sm font-medium">Apply</div>
      <div className="text-xs text-muted-foreground">{fullName || 'Student'}</div>
      {questions && questions.length ? (
        <div className="space-y-3">
          {questions.map((q) => {
            const val = answers[String(q.idx)] || ''
            const words = val.trim() ? val.trim().split(/\s+/).filter(Boolean).length : 0
            return (
              <div key={q.idx}>
                <label className="block text-xs text-muted-foreground mb-1">{q.prompt}</label>
                <textarea
                  className="w-full px-3 py-2 text-sm rounded-md border bg-background"
                  placeholder="Your response (max 500 words)"
                  value={val}
                  onChange={e => setAnswers(a => ({ ...a, [String(q.idx)]: e.target.value }))}
                />
                <div className={`text-[11px] ${words > 500 ? 'text-red-500' : 'text-muted-foreground'}`}>{words}/500 words</div>
              </div>
            )
          })}
        </div>
      ) : (
        <>
          <textarea
            className="w-full px-3 py-2 text-sm rounded-md border bg-background"
            placeholder="Why are you interested?"
            value={answers.why || ''}
            onChange={e => setAnswers(a => ({ ...a, why: e.target.value }))}
          />
          <textarea
            className="w-full px-3 py-2 text-sm rounded-md border bg-background"
            placeholder="Relevant skills"
            value={answers.skills || ''}
            onChange={e => setAnswers(a => ({ ...a, skills: e.target.value }))}
          />
          <input
            className="w-full px-3 py-2 text-sm rounded-md border bg-background"
            placeholder="Availability (e.g., 8-10 hr/wk)"
            value={answers.availability || ''}
            onChange={e => setAnswers(a => ({ ...a, availability: e.target.value }))}
          />
        </>
      )}
      {profile?.resume_url ? (
        <div className="text-xs text-muted-foreground">Resume on file</div>
      ) : (
        <div className="text-xs text-amber-600">Tip: Upload a resume in Settings</div>
      )}
      <button
        className={`w-full px-3 py-2 rounded-md text-sm ${allowApply ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-muted text-foreground/60 cursor-not-allowed'}`}
        disabled={!allowApply || loading}
        onClick={onApply}
      >
        {loading ? 'Submitting...' : (allowApply ? 'Apply Now' : 'Applications Closed')}
      </button>
      {/* Profile completeness hint */}
      {profile && (
        <div className="text-[11px] text-muted-foreground">
          {([profile.school, profile.program, profile.grad_year, profile.phone, profile.linkedin_url, profile.gpa, profile.location, profile.resume_url].some((v:any)=> (v===null||v===undefined||(typeof v==='string'&&v.trim()===''))))
            ? <span>Complete your profile (school, program, grad year, phone, LinkedIn, GPA, location, resume) in <a href="/settings" className="underline">Settings</a>.</span>
            : null}
        </div>
      )}
      {coffeechat ? (
        <a href={coffeechat} target="_blank" className="block text-center text-sm underline text-blue-600">Book a coffee chat</a>
      ) : null}
    </div>
  )
}


