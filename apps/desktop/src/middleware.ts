import { clerkMiddleware } from '@clerk/nextjs/server'

// The desktop app trusts that users have been authenticated 
// by the student app and validated by the auth/resolve route
export default clerkMiddleware()

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)'
  ],
}
