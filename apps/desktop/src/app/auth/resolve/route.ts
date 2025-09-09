import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const { userId } = await auth()
  
  if (!userId) {
    // Send unauthenticated users to sign-in
    return NextResponse.redirect('http://localhost:3001/sign-in')
  }

  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || ''
  
  // Check if user is an admin - hardcoded for security
  const adminEmails = [
    'lwhitworth@ngicapitaladvisory.com',
    'anurmamade@ngicapitaladvisory.com'
  ]
  
  const isAdmin = adminEmails.includes(email)
  
  if (isAdmin) {
    // Valid admin - redirect to dashboard within the desktop app
    const url = new URL(req.url)
    return NextResponse.redirect(new URL('/dashboard', url.origin))
  }
  
  // Non-admin user - redirect to student portal
  return NextResponse.redirect('http://localhost:3001/projects')
}