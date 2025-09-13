import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(req: Request){
  try {
    const url = new URL(req.url)
    const next = url.searchParams.get('next') || '/'
    const { sessionId } = await auth()
    if (sessionId) {
      try { const cc: any = typeof (clerkClient as any) === 'function' ? await (clerkClient as any)() : clerkClient; await cc.sessions?.revokeSession?.(sessionId) } catch {}
    }
    const res = NextResponse.redirect(new URL(next, url))
    // Clear hint cookie used by SSR fetching
    try { res.cookies.set('student_email', '', { path: '/', maxAge: 0 }) } catch {}
    return res
  } catch {
    const url = new URL(req.url)
    return NextResponse.redirect(new URL('/', url))
  }
}

