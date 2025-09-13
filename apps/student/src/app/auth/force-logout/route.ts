import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(req: Request){
  try {
    const url = new URL(req.url)
    const next = url.searchParams.get('next') || '/'
    const { sessionId } = await auth()
    if (sessionId) {
      try { await clerkClient.sessions.revokeSession(sessionId) } catch {}
    }
    const res = NextResponse.redirect(next)
    // Clear hint cookie used by SSR fetching
    try { res.cookies.set('student_email', '', { path: '/', maxAge: 0 }) } catch {}
    return res
  } catch {
    return NextResponse.redirect('/')
  }
}
