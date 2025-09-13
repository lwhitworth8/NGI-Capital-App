"use client"
import { ClerkProvider } from '@clerk/nextjs'

export default function ClerkAppProviders({ children }: { children: React.ReactNode }) {
  const raw = (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '').toString()
  const looksPlaceholder = /your\s+clerk\s+publishable\s+key/i.test(raw)
  const looksValid = /^pk_(live|test)_/i.test(raw)
  const pk = looksPlaceholder || !looksValid ? 'pk_test_stub_0000000000000000000000000000' : raw
  return <ClerkProvider publishableKey={pk}>{children}</ClerkProvider>
}

