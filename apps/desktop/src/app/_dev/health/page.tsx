import ClientCheck from './ClientCheck'

async function tryFetch(url: string, init?: RequestInit & { timeoutMs?: number }): Promise<{ ok: boolean; status?: number; note?: string }> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), init?.timeoutMs ?? 3500)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' })
    clearTimeout(t)
    return { ok: res.ok, status: res.status }
  } catch (e: any) {
    clearTimeout(t)
    return { ok: false, note: String(e?.message || e) }
  }
}

export const dynamic = 'force-dynamic'

export default async function DevHealthPage() {
  const backendUrl = process.env.BACKEND_ORIGIN || 'http://backend:8001'
  const jwksUrl = process.env.CLERK_JWKS_URL || ''

  const [apiHealth, jwks, studentRoot] = await Promise.all<{ ok: boolean; status?: number; note?: string }>([
    tryFetch(`${backendUrl.replace(/\/$/, '')}/api/health`),
    jwksUrl ? tryFetch(jwksUrl) : Promise.resolve({ ok: false, note: 'CLERK_JWKS_URL missing' } as { ok: boolean; status?: number; note?: string }),
    tryFetch('http://student:3002/'),
  ])

  const checks = [
    { name: 'Backend /api/health', status: apiHealth.ok ? 'ok' as const : 'fail' as const, detail: apiHealth.ok ? String(apiHealth.status) : apiHealth.note },
    { name: 'Clerk JWKS reachable', status: jwks.ok ? 'ok' as const : 'fail' as const, detail: jwks.ok ? String(jwks.status ?? '') : jwks.note },
    { name: 'Student / (SSR reach)', status: studentRoot.ok ? 'ok' as const : 'fail' as const, detail: studentRoot.ok ? String(studentRoot.status ?? '') : studentRoot.note },
    { name: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', status: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'ok' as const : 'fail' as const, detail: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? `len=${process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.length}` : 'missing' },
    { name: 'CLERK_ISSUER', status: process.env.CLERK_ISSUER ? 'ok' as const : 'fail' as const, detail: process.env.CLERK_ISSUER || 'missing' },
    { name: 'CLERK_JWKS_URL', status: process.env.CLERK_JWKS_URL ? 'ok' as const : 'fail' as const, detail: process.env.CLERK_JWKS_URL || 'missing' },
  ]

  return (
    <div style={{ padding: 24, display:'grid', gap: 20 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>NGI Dev Health Dashboard</h1>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Server Checks</div>
        <ul style={{ fontSize: 14, lineHeight: '20px' }}>
          {checks.map((c, idx) => (
            <li key={idx}>
              <span style={{ display:'inline-block', width: 14 }}>{c.status === 'ok' ? '✅' : '❌'}</span>
              <span style={{ marginLeft: 6 }}>{c.name}</span>
              {c.detail ? <span style={{ opacity: 0.7 }}> — {c.detail}</span> : null}
            </li>
          ))}
        </ul>
      </div>
      <ClientCheck />
    </div>
  )
}

