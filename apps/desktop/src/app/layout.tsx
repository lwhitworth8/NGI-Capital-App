import './globals.css'
import type { Metadata } from 'next'
import { Providers } from './providers'

// Ensure dynamic rendering to avoid build-time type/env coupling when
// Clerk and providers load; keeps runtime consistent across environments.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'NGI Capital Internal System',
  description: 'Internal Business and Financial Management System for NGI Capital',
  robots: 'noindex, nofollow', // Prevent search engine indexing
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head></head>
      <body className="min-h-screen bg-background text-foreground">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
