import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',                 // Marketing homepage
  '/projects(.*)',     // Projects is public per spec
  '/learning(.*)',     // Learning is public per spec
  '/sign-in(.*)',      // Sign in page
  '/sign-up(.*)',      // Sign up page (if needed)
  '/auth(.*)',         // Auth routes
  '/blocked',          // Blocked page
  '/_next(.*)',        // Next.js assets
  '/favicon.ico',      // Favicon
  '/assets(.*)',       // Static assets
  '/api/webhooks(.*)', // Webhook endpoints
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

  // If authenticated, block non-allowed domains (admin routing handled by backend/Desktop)
  try {
    const email = (
      (sessionClaims as any)?.email ||
      (sessionClaims as any)?.email_address ||
      (sessionClaims as any)?.primary_email_address ||
      ''
    ) as string
    const em = (email || '').toLowerCase()

    // Domain gating (best-effort)
    const allowed = (process.env.ALLOWED_EMAIL_DOMAINS || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
    if (allowed.length > 0) {
      const domain = em.includes('@') ? em.split('@')[1] : ''
      if (!domain || !allowed.includes(domain)) {
        return NextResponse.redirect(new URL('/blocked', url.origin))
      }
    }
  } catch {}

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
