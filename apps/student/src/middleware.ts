import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',                 // Marketing homepage
  '/projects(.*)',     // Projects is public per spec
  '/learning(.*)',     // Learning Center is public per spec
  '/sign-in(.*)',      // Sign in page
  '/sign-up(.*)',      // Sign up page (if needed)
  '/auth(.*)',         // Auth routes
  '/blocked',          // Blocked page
  '/_next(.*)',        // Next.js assets
  '/favicon.ico',      // Favicon
  '/assets(.*)',       // Static assets
  '/api/webhooks(.*)', // Webhook endpoints
])

// Routes that require auth but skip domain checking (will be checked by backend)
const skipDomainCheckRoutes = createRouteMatcher([
  '/settings(.*)',     // User settings
  '/my-projects(.*)',  // User's projects
])

export default clerkMiddleware(async (auth, req) => {
  const url = new URL(req.url)
  
  // Check if it's a public route
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  // Get auth status
  const { userId, sessionClaims } = await auth()
  
  // If not authenticated, redirect to sign-in
  if (!userId) {
    const signInUrl = new URL('/sign-in', url.origin)
    signInUrl.searchParams.set('redirect_url', url.pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Skip domain checking for certain routes (backend will validate)
  if (skipDomainCheckRoutes(req)) {
    console.log('[middleware] Skipping domain check for:', url.pathname)
    return NextResponse.next()
  }

  // If authenticated, block non-allowed domains (admin routing handled by backend/Desktop)
  try {
    // Try multiple ways to get email from Clerk session
    const email = (
      (sessionClaims as any)?.email ||
      (sessionClaims as any)?.email_address ||
      (sessionClaims as any)?.primary_email_address ||
      (sessionClaims as any)?.emailAddress ||
      (sessionClaims as any)?.primaryEmailAddress ||
      ''
    ) as string
    const em = (email || '').toLowerCase()

    console.log('[middleware] Email check:', { 
      path: url.pathname,
      email: em, 
      userId,
      sessionClaimsKeys: Object.keys(sessionClaims || {})
    })

    // Domain gating - allow all UC system domains by default
    const allowed = (process.env.ALLOWED_EMAIL_DOMAINS || 'berkeley.edu,ucla.edu,ucsd.edu,uci.edu,ucdavis.edu,ucsb.edu,ucsc.edu,ucr.edu,ucmerced.edu')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
    
    if (allowed.length > 0 && em) {
      const domain = em.includes('@') ? em.split('@')[1] : ''
      if (!domain || !allowed.includes(domain)) {
        console.warn('[middleware] Blocking non-UC domain:', { email: em, domain, allowed })
        return NextResponse.redirect(new URL('/blocked', url.origin))
      }
    } else if (!em) {
      console.warn('[middleware] No email found in session, allowing through (will be checked by API)')
      // Don't block if we can't get email - let the backend handle it
    }
  } catch (err) {
    console.error('[middleware] Error checking domain:', err)
  }

  // User is authenticated, continue to the page
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
