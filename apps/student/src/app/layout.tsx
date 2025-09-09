import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import ClientRoot from '@/components/ClientRoot'

export const metadata = {
  title: 'NGI Capital',
  description: 'Opportunities and applications for students',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <html lang="en" suppressHydrationWarning>
        <body>
          <ClientRoot>
            {children}
          </ClientRoot>
        </body>
      </html>
    </ClerkProvider>
  )
}