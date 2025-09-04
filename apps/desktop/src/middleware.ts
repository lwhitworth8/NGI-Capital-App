import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { decideAdminAccess, isAdminEmail } from '@/lib/adminAccess';
import type { NextRequest } from 'next/server';

if (process.env.NODE_ENV !== 'production') {
  // Debug hints to confirm keys are present at server runtime (no values printed)
  // These appear in the Next.js terminal logs
  // eslint-disable-next-line no-console
  console.log(
    'Clerk middleware keys present:',
    'pk=', !!(process.env.CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
    'sk=', !!process.env.CLERK_SECRET_KEY
  );
}

function stripQuotes(s: string): string {
  return s.replace(/^['"]|['"]$/g, '').trim();
}

// Keep env clean in dev logs (but do NOT pass as options)
stripQuotes(process.env.CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '');
stripQuotes(process.env.CLERK_SECRET_KEY || '');

// Define public routes explicitly (not protected by Clerk)
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/_clerk/diag',
])

function emailFromAuth(auth: any, req: NextRequest): string {
  try {
    const c: any = auth?.sessionClaims || {}
    const raw = (
      c.email || c.email_address || c.primary_email || c.primary_email_address || c.sub || ''
    ).toString()
    if (raw) return raw.toLowerCase()
  } catch {}
  try {
    const cookieHeader = req.headers.get('cookie') || ''
    const m = cookieHeader.match(/(?:^|; )student_email=([^;]+)/)
    if (m && m[1]) return decodeURIComponent(m[1]).toLowerCase()
  } catch {}
  try {
    const hdr = req.headers.get('x-student-email')
    if (hdr) return hdr.toLowerCase()
  } catch {}
  return ''
}

export default clerkMiddleware({
  publicRoutes: ['/sign-in(.*)', '/sign-up(.*)', '/api/_clerk/diag'],
  afterAuth(auth, req) {
    if (!auth.userId) {
      if (isPublicRoute(req)) return NextResponse.next()
      const signIn = new URL('/sign-in', req.url)
      const back = `${req.nextUrl.pathname}${req.nextUrl.search}`
      signIn.searchParams.set('returnBackUrl', back || '/')
      return NextResponse.redirect(signIn)
    }
    try {
      const email = emailFromAuth(auth, req)
      // Compute robust student base: prefer env if set; else same-origin root
      const envBase = (process.env.NEXT_PUBLIC_STUDENT_BASE_URL || '').trim()
      const base = envBase ? envBase.replace(/\/$/, '') : (() => {
        try { const u = new URL(req.url); return `${u.protocol}//${u.host}` } catch { return '' }
      })()
      const decision = decideAdminAccess(email, req.nextUrl.pathname)
      if (decision.action === 'redirect') {
        const target = base ? `${base}/projects` : '/projects'
        return NextResponse.redirect(target)
      }
    } catch {}
    return NextResponse.next()
  },
})

export const config = {
  matcher: [
    // Run on application routes (exclude Next internals & static assets)
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)'
    // Do not match '/api' so external backend rewrites are not intercepted by Clerk middleware
  ],
};
