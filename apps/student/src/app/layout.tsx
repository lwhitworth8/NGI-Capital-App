import './globals.css'
import ClientRoot from '@/components/ClientRoot'
import ClerkAppProviders from '@/components/ClerkAppProviders'

// Force dynamic rendering to avoid build-time prerender failures when
// Clerk keys are not available during Vercel build.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'NGI Capital',
  description: 'Opportunities and applications for students',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ClerkAppProviders>
          <ClientRoot>
            {children}
          </ClientRoot>
        </ClerkAppProviders>
      </body>
    </html>
  )
}
