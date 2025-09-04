export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email || typeof email !== 'string') return false
  const e = email.trim().toLowerCase()
  const base = new Set([
    'lwhitworth@ngicapitaladvisory.com',
    'anurmamade@ngicapitaladvisory.com',
  ])
  const extra = (process.env.NEXT_PUBLIC_ADVISORY_ADMINS || process.env.ALLOWED_ADVISORY_ADMINS || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  for (const x of extra) base.add(x)
  return base.has(e)
}

export function decideAdminAccess(email: string | undefined | null, path: string): { action: 'allow'|'redirect' } {
  // Always restrict entire app except Clerk public routes handled in middleware config
  if (!isAdminEmail(email)) return { action: 'redirect' }
  return { action: 'allow' }
}

