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
}

export type PublicProjectDetail = PublicProject & {
  description?: string;
  gallery_urls?: string[];
}
