import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function Blocked() {
  const { userId } = await auth()
  if (userId) {
    // Try to determine if this is an admin/partner and bounce to admin app automatically
    let email = ''
    try {
      const u = await currentUser()
      email = (u?.primaryEmailAddress?.emailAddress || '').toLowerCase()
      if (!email) {
        try {
          const cc = await clerkClient()
          const full = await cc.users.getUser(userId)
          email = (full?.primaryEmailAddress?.emailAddress || full?.emailAddresses?.[0]?.emailAddress || '').toLowerCase()
        } catch {}
      }
    } catch {}
    const domain = (email.split('@')[1] || '').trim().toLowerCase()
    // Admin emails - hardcoded for security
    const adminEmails = [
      'lwhitworth@ngicapitaladvisory.com',
      'anurmamade@ngicapitaladvisory.com'
    ]
    const isAdmin = !!email && adminEmails.includes(email)
    if (isAdmin) {
      const adminBase = (process.env.NEXT_PUBLIC_ADMIN_BASE_URL || 'http://localhost:3001/admin').replace(/\/$/, '')
      redirect(`${adminBase}/dashboard`)
    }
  }
  return (
    <main className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-semibold">Access Restricted</h1>
        <p className="text-muted-foreground">Only UC system students can access the student portal.</p>
        <p className="text-muted-foreground text-sm">Accepted domains: @berkeley.edu, @ucla.edu, @ucsd.edu, @uci.edu, @ucdavis.edu, @ucsb.edu, @ucsc.edu, @ucr.edu, @ucmerced.edu</p>
        <p className="text-muted-foreground">Please sign in with your UC email address via Google.</p>
        <p className="text-muted-foreground text-sm mt-4">NGI Capital admins should use the admin portal.</p>
        <a href="/" className="inline-block mt-2 underline">Return to homepage</a>
      </div>
    </main>
  )
}
