export async function spFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  // Attach dev header for student email when available
  let extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
  const mockEmail = process.env.NEXT_PUBLIC_MOCK_STUDENT_EMAIL
  if (mockEmail) {
    extraHeaders['X-Student-Email'] = mockEmail
  } else if (typeof window === 'undefined') {
    try {
      const { cookies } = await import('next/headers')
      const c = cookies().get('student_email')?.value
      if (c) extraHeaders['X-Student-Email'] = c
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
        const h = headers()
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
  questions?: Array<{ idx:number; prompt:string }>;
}

// Coffee chats (public)
export type PublicCoffeeSlot = { start_ts: string; end_ts: string; slot_len_min: number; type?: string }
export async function getCoffeeAvailability(): Promise<{ slots: PublicCoffeeSlot[] }>{
  return spFetch('/api/public/coffeechats/availability')
}
export async function createCoffeeRequest(data: { start_ts: string; end_ts: string; slot_len_min: number }): Promise<{ id: number; status: string; expires_at_ts: string }>{
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
