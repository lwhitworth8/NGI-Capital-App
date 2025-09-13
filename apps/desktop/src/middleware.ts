import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth()
  // Clone incoming headers so we can forward X-Admin-Email to the backend
  const requestHeaders = new Headers(req.headers)
  if (userId) {
    try {
      const claims: any = sessionClaims || {}
      const email = (claims.email || claims.email_address || claims.primary_email_address || '').toString().toLowerCase()
      if (email) requestHeaders.set('X-Admin-Email', email)
    } catch {}
  }
  return NextResponse.next({ request: { headers: requestHeaders } })
})

export const config = {
  matcher: [
    // Ensure API requests carry X-Admin-Email so backend env-admin fallback can authorize reliably
    '/api/:path*',
  ],
}
