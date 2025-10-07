export async function spFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  // Attach dev header for student email when available
  let extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
  const mockEmail = process.env.NEXT_PUBLIC_MOCK_STUDENT_EMAIL as string | undefined
  if (mockEmail) {
    extraHeaders['X-Student-Email'] = mockEmail
  } else if (typeof window === 'undefined') {
    try {
      const { cookies } = await import('next/headers')
      const c = (await cookies()).get('student_email')?.value
      if (c) extraHeaders['X-Student-Email'] = c
    } catch {}
  } else {
    // Client-side: try to read a non-httpOnly cookie set by app (dev) named student_email
    try {
      const cookie = document.cookie || ''
      const m = cookie.match(/(?:^|;\s*)student_email=([^;]+)/)
      if (m && m[1]) {
        extraHeaders['X-Student-Email'] = decodeURIComponent(m[1])
      }
    } catch {}
  }

  // Attach Clerk bearer token in browser when available (backend template preferred)
  if (typeof window !== 'undefined') {
    try {
      const anyWin: any = window as any
      const clerk = anyWin?.Clerk
      if (clerk?.session?.getToken) {
        let token: string | null = null
        try { token = await clerk.session.getToken({ template: 'backend' }) } catch {}
        if (!token) {
          try { token = await clerk.session.getToken() } catch {}
        }
        if (token) {
          extraHeaders['Authorization'] = `Bearer ${token}`
        }
      }
    } catch {}
  }

  // Ensure absolute URL on the server runtime (Node fetch requires absolute URL)
  let url = path
  if (typeof window === 'undefined') {
    if (path.startsWith('/api/')) {
      const origin = process.env.BACKEND_ORIGIN || process.env.NEXT_PUBLIC_API_URL || 'http://backend:8001'
      url = origin.replace(/\/$/, '') + path
    } else if (path.startsWith('/')) {
      // For non-API internal fetches (rare), build from request headers
      try {
        const { headers } = await import('next/headers')
        const h = await headers()
        const proto = h.get('x-forwarded-proto') || 'http'
        const host = h.get('x-forwarded-host') || h.get('host') || 'localhost'
        url = `${proto}://${host}${path}`
      } catch {
        // Fallback to relative for client only
      }
    }
  }

  const res = await fetch(url, { ...opts, headers: { ...extraHeaders, ...(opts?.headers || {}) } })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export type PublicProject = {
  id: number; project_name: string; client_name: string; summary: string;
  hero_image_url?: string; tags?: string[]; partner_badges?: string[]; backer_badges?: string[];
  start_date?: string; allow_applications?: number; coffeechat_calendly?: string;
  status?: 'draft'|'active'|'paused'|'delivered'|'closed'; mode?: 'remote'|'in_person'|'hybrid'; location_text?: string;
  applied_count?: number;
}

export type PublicProjectDetail = PublicProject & {
  description?: string;
  gallery_urls?: string[];
  end_date?: string;
  duration_weeks?: number;
  commitment_hours_per_week?: number;
  team_size?: number;
  team_requirements?: string;
  showcase_pdf_url?: string;
  applications_close_date?: string;
  questions?: Array<{ idx:number; type?: 'text'|'mcq'; prompt:string; choices?: string[] }>;
}

// Coffee chats (public)
export type PublicCoffeeSlot = { start_ts: string; end_ts: string; slot_len_min: number; type?: string }
export async function getCoffeeAvailability(): Promise<{ slots: PublicCoffeeSlot[] }>{
  return spFetch('/api/public/coffeechats/availability')
}
export async function createCoffeeRequest(data: { start_ts: string; end_ts: string; slot_len_min: number; project_id?: number }): Promise<{ id: number; status: string; expires_at_ts: string }>{
  return spFetch('/api/public/coffeechats/requests', { method: 'POST', body: JSON.stringify(data) })
}
export async function listMyCoffeeRequests(): Promise<Array<{ id:number; start_ts:string; end_ts:string; status:string; created_at:string; cooldown_until_ts?:string; blacklist_until_ts?:string }>>{
  return spFetch('/api/public/coffeechats/mine')
}

// Student Applications (public)
export type MyApplication = { id:number; target_project_id?:number; status:string; created_at:string; updated_at?:string; has_updates?:boolean }
export async function listMyApplications(): Promise<MyApplication[]>{
  return spFetch('/api/public/applications/mine')
}
export async function getApplicationDetail(id: number): Promise<{ id:number; project_id:number; status:string; submitted_at:string; resume_url_snapshot?:string; answers?: Array<{ prompt:string; response:string }> }>{
  return spFetch(`/api/public/applications/${id}`)
}
export async function withdrawApplication(id: number): Promise<{ id:number; status:string }>{
  return spFetch(`/api/public/applications/${id}/withdraw`, { method: 'POST' })
}
export async function markApplicationSeen(id: number): Promise<{ id:number; seen:boolean }>{
  return spFetch(`/api/public/applications/${id}/seen`, { method: 'POST' })
}

export async function listMyArchivedApplications(): Promise<Array<{ id:number; archived_id:number; project_id?:number; status:string; archived_at:string; reason?:string }>>{
  return spFetch('/api/public/applications/archived')
}

// My Projects
export type MyProject = { id:number; project_code?:string; project_name:string; summary?:string; status:'active'|'past' }
export async function listMyProjects(): Promise<MyProject[]> {
  return spFetch('/api/public/my-projects')
}

export type ProjectTask = { id:number; title:string; description?:string; priority?:string; status?:string; due_date?:string; planned_hours?:number }
export async function listMyTasks(projectId: number): Promise<ProjectTask[]> {
  return spFetch(`/api/public/projects/${projectId}/tasks`)
}

export async function getTaskDetail(tid: number): Promise<{ id:number; project_id:number; title:string; description?:string; priority?:string; status?:string; submission_type?:string; due_date?:string; planned_hours?:number; submissions?: Array<{ version:number; kind:string; url_or_path?:string; created_at:string; is_late?:number; accepted?:number }> }>{
  return spFetch(`/api/public/tasks/${tid}`)
}

export async function submitTask(tid: number, data: { url?: string; file?: File }): Promise<any> {
  if (data.file) {
    const fd = new FormData()
    fd.append('file', data.file)
    // Include payload with email if available to support headerless environments
    let email: string | undefined = process.env.NEXT_PUBLIC_MOCK_STUDENT_EMAIL as string | undefined
    if (!email && typeof document !== 'undefined') {
      const cookie = document.cookie || ''
      const m = cookie.match(/(?:^|;\s*)student_email=([^;]+)/)
      if (m && m[1]) email = decodeURIComponent(m[1])
    }
    fd.append('payload', JSON.stringify(email ? { email } : {}))
    const headers: Record<string, string> = {}
    if (email) headers['X-Student-Email'] = email
    const res = await fetch(`/api/public/tasks/${tid}/submit`, { method: 'POST', body: fd, headers })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  } else {
    // Include email in JSON payload when possible
    let email: string | undefined = process.env.NEXT_PUBLIC_MOCK_STUDENT_EMAIL as string | undefined
    if (!email && typeof document !== 'undefined') {
      const cookie = document.cookie || ''
      const m = cookie.match(/(?:^|;\s*)student_email=([^;]+)/)
      if (m && m[1]) email = decodeURIComponent(m[1])
    }
    const body: any = { url: data.url }
    if (email) body.email = email
    return spFetch(`/api/public/tasks/${tid}/submit`, { method: 'POST', body: JSON.stringify(body) })
  }
}

export type TaskComment = { id:number; author_email?:string; submission_version?:number; body:string; created_at:string }
export async function listTaskComments(tid: number): Promise<TaskComment[]> {
  return spFetch(`/api/public/tasks/${tid}/comments`)
}
export async function postTaskComment(tid: number, body: string, email?: string, submission_version?: number): Promise<{ id:number }>{
  const payload: any = { body }
  if (email) payload.email = email
  if (submission_version != null) payload.submission_version = submission_version
  return spFetch(`/api/public/tasks/${tid}/comments`, { method: 'POST', body: JSON.stringify(payload) })
}

export async function listProjectMeetings(pid: number): Promise<Array<{ id:number; title:string; start_ts:string; end_ts:string; google_event_id?:string }>>{
  return spFetch(`/api/public/projects/${pid}/meetings`)
}
export async function listProjectResources(pid: number): Promise<Array<{ id:number; kind:string; title:string; url_or_path?:string; version?:number }>>{
  return spFetch(`/api/public/projects/${pid}/resources`)
}
export async function getMyTimesheet(pid: number, week: string): Promise<{ entries: Array<{ task_id?:number; day:string; segments?:any[]; hours:number }>; total_hours:number }>{
  return spFetch(`/api/public/projects/${pid}/timesheets/${week}`)
}
export async function saveTimesheetEntry(pid: number, week: string, entry: { task_id?:number; day:string; segments?:any[]; hours?:number; replace?: boolean }): Promise<any>{
  return spFetch(`/api/public/projects/${pid}/timesheets/${week}/entries`, { method: 'POST', body: JSON.stringify(entry) })
}
