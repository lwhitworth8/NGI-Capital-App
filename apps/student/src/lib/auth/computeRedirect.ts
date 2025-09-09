export function computePostAuthRedirect(params: {
  email?: string | null
  role?: string | null
  reqUrl: string
  adminBase?: string | null
  studentBase?: string | null
}): string {
  const { role, email, reqUrl } = params
  const partners = (process.env.PARTNER_EMAILS || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)
  const em = (email || '').toLowerCase()
  const isPartner = role === 'PARTNER_ADMIN' || (em && partners.includes(em))

  const adminEnv = (params.adminBase ?? process.env.NEXT_PUBLIC_ADMIN_BASE_URL ?? '').toString().trim()
  const studentEnv = (params.studentBase ?? process.env.NEXT_PUBLIC_STUDENT_BASE_URL ?? '').toString().trim()

  const target = isPartner ? (adminEnv || '/') : (studentEnv || '/')
  try {
    if (target.startsWith('http')) return target
    return new URL(target, reqUrl).toString()
  } catch {
    return '/'
  }
}
