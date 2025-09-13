"use client"
import { ClerkProvider } from '@clerk/nextjs'

export default function ClerkAppProviders({ children }: { children: React.ReactNode }) {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY || ''
  const isStub = !pk || pk.includes('pk_test_stub') || pk.includes('pk_live_stub')
  // If no real key is present at build/runtime, render without Clerk to avoid build failures.
  if (isStub) return <>{children}</>
  return (
    <ClerkProvider publishableKey={pk}>
      {children}
    </ClerkProvider>
  )
}

