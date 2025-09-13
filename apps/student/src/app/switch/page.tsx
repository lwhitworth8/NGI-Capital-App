import { redirect } from 'next/navigation'
import { currentUser, clerkClient } from '@clerk/nextjs/server'

export default async function Switch() {
  const user = await currentUser()
  if (!user) redirect('/')

  const email = (user.primaryEmailAddress?.emailAddress || '').toLowerCase()
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)
  const partnerEmails = (process.env.PARTNER_EMAILS || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)

  let isAdmin = adminEmails.includes(email) || partnerEmails.includes(email) || (user.publicMetadata?.role === 'PARTNER_ADMIN')

  // Fallback: check Clerk org memberships for admin/owner
  if (!isAdmin) {
    try {
      const cc: any = typeof (clerkClient as any) === 'function' ? await (clerkClient as any)() : clerkClient; const list: any[] = (await cc.users?.getOrganizationMembershipList?.({ userId: user.id }) as any) || [];
      const requiredSlug = (process.env.CLERK_ADMIN_ORG_SLUG || '').trim()
      isAdmin = list.some((m: any) => {
        const inOrg = requiredSlug ? (m.organization?.slug === requiredSlug) : true
        const role = (m.role || '').toString().toLowerCase()
        return inOrg && (role === 'admin' || role === 'owner')
      })
    } catch {}
  }

  if (isAdmin) {
    const adminBase = (process.env.NEXT_PUBLIC_ADMIN_BASE_URL || 'http://localhost:3001/admin').replace(/\/$/, '')
    redirect(`${adminBase}/dashboard`)
  }

  redirect('/projects')
}

