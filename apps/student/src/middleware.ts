import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'
import { allowedDomains, isAllowedStudentDomain } from '@/lib/gating'

const publicRoutes = [
  '/blocked',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/projects(.*)',
  '/learning(.*)'
]
const isPublicRoute = createRouteMatcher(publicRoutes)

export default clerkMiddleware((authAny: any, req: NextRequest) => {
  const auth = authAny as any
  // Unauthenticated → sign in (unless public route)
  if (!auth.userId) {
    if (isPublicRoute(req)) return NextResponse.next()
    const signIn = new URL('/sign-in', req.url)
    // Avoid infinite nesting by using path+search (not full absolute URL)
    const back = `${req.nextUrl.pathname}${req.nextUrl.search}`
    signIn.searchParams.set('returnBackUrl', back || '/')
    return NextResponse.redirect(signIn)
  }

  // Enforce domain restriction when authenticated
  try {
    const claims: any = auth.sessionClaims as any
    const raw = (claims?.email || claims?.email_address || claims?.primary_email_address || claims?.sub || '').toString()
    const email = raw.toLowerCase()
    const domain = email.includes('@') ? email.split('@')[1] : ''

    // Admin emails should use the Admin app (Desktop). Redirect to /admin/.
    const adminEmails = new Set([
      'lwhitworth@ngicapitaladvisory.com',
      'anurmamade@ngicapitaladvisory.com',
    ])
    if (email && adminEmails.has(email)) {
      const res = NextResponse.redirect(new URL('/admin/', req.url))
      // Set a small hint cookie that Admin middleware can also read as fallback
      res.cookies.set('student_email', email, { path: '/', sameSite: 'lax' })
      return res
    }
    if (auth.userId && (!domain || !allowedDomains.includes(domain))) {
      return NextResponse.redirect(new URL('/blocked', req.url))
    }

    // Surface email to app/backend via cookie for SSR+API calls
    if (email) {
      const res = NextResponse.next()
      res.cookies.set('student_email', email, { path: '/', sameSite: 'lax' })
      return res
    }
  } catch {}
  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|api|favicon.ico).*)',
  ],
}
