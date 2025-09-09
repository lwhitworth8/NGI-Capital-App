"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

type Profile = { resume_url?: string | null }

export default function ApplyWidget({ projectId, allowApply, coffeechat }: { projectId: number; allowApply: boolean; coffeechat?: string }) {
  const { user } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [answers, setAnswers] = useState({ why: '', skills: '', availability: '' })
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
    setLoading(true)
    try {
      const payload: any = {
        target_project_id: projectId,
        first_name: user?.firstName || null,
        last_name: user?.lastName || null,
        email: user?.primaryEmailAddress?.emailAddress || undefined,
        notes: `Why: ${answers.why}\nSkills: ${answers.skills}\nAvailability: ${answers.availability}`,
        resume_url: profile?.resume_url || null,
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
      <textarea
        className="w-full px-3 py-2 text-sm rounded-md border bg-background"
        placeholder="Why are you interested?"
        value={answers.why}
        onChange={e => setAnswers(a => ({ ...a, why: e.target.value }))}
      />
      <textarea
        className="w-full px-3 py-2 text-sm rounded-md border bg-background"
        placeholder="Relevant skills"
        value={answers.skills}
        onChange={e => setAnswers(a => ({ ...a, skills: e.target.value }))}
      />
      <input
        className="w-full px-3 py-2 text-sm rounded-md border bg-background"
        placeholder="Availability (e.g., 8-10 hr/wk)"
        value={answers.availability}
        onChange={e => setAnswers(a => ({ ...a, availability: e.target.value }))}
      />
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
      {coffeechat ? (
        <a href={coffeechat} target="_blank" className="block text-center text-sm underline text-blue-600">Book a coffee chat</a>
      ) : null}
    </div>
  )
}

