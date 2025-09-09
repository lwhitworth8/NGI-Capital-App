import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const { userId } = await auth()
  
  if (!userId) {
    // Send unauthenticated users to sign-in
    return NextResponse.redirect('http://localhost:3001/sign-in')
  }

  // Get the current user
  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || ''
  const domain = email.split('@')[1] || ''
  
  // Admin emails - hardcoded for security
  const adminEmails = [
    'lwhitworth@ngicapitaladvisory.com',
    'anurmamade@ngicapitaladvisory.com'
  ]
  
  // Check if user is an admin
  const isAdmin = adminEmails.includes(email)
  
  if (isAdmin) {
    console.log('[auth/resolve] Admin user detected:', email)
    // Redirect to desktop app dashboard
    // The desktop app is served at /admin path by nginx
    return NextResponse.redirect('http://localhost:3001/admin/dashboard')
  }
  
  // Check if user's domain is allowed for student portal
  // UC system domains only
  const allowedDomains = [
    'berkeley.edu',
    'ucla.edu',
    'ucsd.edu',
    'uci.edu',
    'ucdavis.edu',
    'ucsb.edu',
    'ucsc.edu',
    'ucr.edu',
    'ucmerced.edu'
  ]
  
  if (!domain || !allowedDomains.includes(domain)) {
    console.warn('[auth/resolve] Blocked non-UC domain:', { email, domain })
    // User's domain is not allowed
    return NextResponse.redirect('http://localhost:3001/blocked')
  }
  
  // Valid student - redirect to projects page in student app
  console.log('[auth/resolve] Student user detected:', email)
  return NextResponse.redirect('http://localhost:3001/projects')
}