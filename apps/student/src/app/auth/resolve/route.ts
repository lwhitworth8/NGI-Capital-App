import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const { userId } = await auth()

  const base = (process.env.NEXT_PUBLIC_STUDENT_BASE_URL || 'http://localhost:3001').replace(/\/$/, '')
  const signInUrl = `${base}/sign-in`

  if (!userId) {
    return NextResponse.redirect(signInUrl)
  }

  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || ''
  const domain = email.split('@')[1] || ''

  // Admin detection: prefer Clerk metadata set by webhook, then org membership, then env allowlist
  let isAdmin = String(user?.publicMetadata?.role || '').toUpperCase() === 'PARTNER_ADMIN'

  if (!isAdmin) {
    const slug = String(process.env.CLERK_ADMIN_ORG_SLUG || '').trim().toLowerCase()
    if (slug) {
      try {
        const cc: any = typeof (clerkClient as any) === 'function' ? await (clerkClient as any)() : clerkClient; const memberships = await cc.users?.getOrganizationMembershipList?.({ userId }) as any
        if (Array.isArray((memberships as any)?.data)) {
          isAdmin = (memberships as any).data.some((m: any) => String(m?.organization?.slug || '').toLowerCase() === slug)
        }
      } catch {
        // ignore and fall back
      }
    }
  }

  if (!isAdmin) {
    const admins = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    if (email && admins.includes(email)) isAdmin = true
  }

  if (isAdmin) {
    return NextResponse.redirect(`${base}/admin/dashboard`)
  }

  // Student access gate by domain (configurable)
  const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS ||
    'berkeley.edu,ucla.edu,ucsd.edu,uci.edu,ucdavis.edu,ucsb.edu,ucsc.edu,ucr.edu,ucmerced.edu')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

  if (!domain || !allowedDomains.includes(domain)) {
    console.warn('[auth/resolve] Blocked domain', { email, domain })
    return NextResponse.redirect(`${base}/blocked`)
  }

  return NextResponse.redirect(`${base}/projects`)
}

