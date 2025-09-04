"use client"

import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from 'next-themes'
import { usePathname } from 'next/navigation'
import StudentSidebar from '@/components/StudentSidebar'

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const onAuth = /^\/(sign-in|sign-up)(\/|$)/.test(pathname || '')
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="theme_preference">
        {onAuth ? (
          <div className="min-h-screen grid place-items-center bg-background text-foreground">
            <main className="w-full max-w-xl px-4">{children}</main>
          </div>
        ) : (
          <div className="min-h-screen flex bg-background text-foreground">
            <StudentSidebar />
            <main className="flex-1">{children}</main>
          </div>
        )}
      </ThemeProvider>
    </ClerkProvider>
  )
}
