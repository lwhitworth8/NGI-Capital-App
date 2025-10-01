"use client"
import { ThemeProvider } from 'next-themes'
import { usePathname } from 'next/navigation'
import StudentSidebar from '@/components/StudentSidebar'

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/'
  const onMarketing = pathname === '/'
  const onAuth = pathname.startsWith('/sign-in') || pathname.startsWith('/auth/')
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="student_theme">
      {onMarketing ? (
        // Marketing route renders its own fixed theme and layout
        <>{children}</>
      ) : onAuth ? (
        // Allow auth pages (sign-in/up and resolver) to control their own layout
        <div className="min-h-screen bg-background text-foreground">{children}</div>
      ) : (
        <div className="h-screen bg-background text-foreground">
          <StudentSidebar />
          <main className="ml-64 h-screen overflow-y-auto">{children}</main>
        </div>
      )}
    </ThemeProvider>
  )
}
