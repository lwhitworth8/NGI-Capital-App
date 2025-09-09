import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',              // Marketing homepage
  '/sign-in(.*)',   // Sign in page
  '/sign-up(.*)',   // Sign up page (if needed)
  '/auth(.*)',      // Auth routes
  '/blocked',       // Blocked page
  '/_next(.*)',     // Next.js assets
  '/favicon.ico',   // Favicon
  '/assets(.*)',    // Static assets
  '/api/webhooks(.*)', // Webhook endpoints
])

export default clerkMiddleware(async (auth, req) => {
  const url = new URL(req.url)
  
  // Check if it's a public route
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  // Get auth status
  const { userId } = await auth()
  
  // If not authenticated, redirect to sign-in
  if (!userId) {
    const signInUrl = new URL('/sign-in', url.origin)
    signInUrl.searchParams.set('redirect_url', url.pathname)
    return NextResponse.redirect(signInUrl)
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