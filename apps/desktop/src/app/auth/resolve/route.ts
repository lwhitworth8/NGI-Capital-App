import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const { userId } = await auth()
  
  if (!userId) {
    // Send unauthenticated users to sign-in
    const studentBase = (process.env.NEXT_PUBLIC_STUDENT_BASE_URL || 'http://localhost:3001').replace(/\/$/, '')
    return NextResponse.redirect(`${studentBase}/sign-in`)
  }

  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || ''

  // Prefer Clerk organization membership when configured
  let isAdmin = false
  try {
    const orgSlug = (process.env.CLERK_ADMIN_ORG_SLUG || '').trim().toLowerCase()
    if (orgSlug) {
      const cc: any = typeof (clerkClient as any) === 'function' ? await (clerkClient as any)() : (clerkClient as any)
      const list = await cc?.users?.getOrganizationMembershipList?.({ userId })
      isAdmin = !!(list?.data?.some((m: any) => (m?.organization?.slug || '').toLowerCase() === orgSlug))
    }
  } catch {}
  
  // Fallback to env-based allowlist (kept for safety)
  if (!isAdmin) {
    const allowed = new Set<string>([
      'lwhitworth@ngicapitaladvisory.com',
      'anurmamade@ngicapitaladvisory.com',
      ...(process.env.ALLOWED_ADVISORY_ADMINS || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean),
      ...(process.env.ADMIN_EMAILS || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean),
    ])
    isAdmin = !!(email && allowed.has(email))
  }
  
  if (isAdmin) {
    // Valid admin - redirect to dashboard within the desktop app
    const url = new URL(req.url)
    return NextResponse.redirect(new URL('/dashboard', url.origin))
  }
  
  // Non-admin user - redirect to student portal
  const studentBase = (process.env.NEXT_PUBLIC_STUDENT_BASE_URL || 'http://localhost:3001').replace(/\/$/, '')
  return NextResponse.redirect(`${studentBase}/projects`)
}
