import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

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
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/_clerk/diag',
])

export default clerkMiddleware({
  publicRoutes: [
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/_clerk/diag',
  ],
  afterAuth(auth, req) {
    if (!auth.userId && !isPublicRoute(req)) {
      return auth.redirectToSignIn({ returnBackUrl: req.url })
    }
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
