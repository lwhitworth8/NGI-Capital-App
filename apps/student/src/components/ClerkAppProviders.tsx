"use client"
import { ClerkProvider } from '@clerk/nextjs'

export default function ClerkAppProviders({ children }: { children: React.ReactNode }) {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  return (
    <ClerkProvider publishableKey={pk}>
      {children}
    </ClerkProvider>
  )
}

