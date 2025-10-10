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
        <div className="flex h-screen bg-background text-foreground">
          <StudentSidebar />
          <main className="flex-1 h-full overflow-y-auto no-scrollbar">{children}</main>
        </div>
      )}
    </ThemeProvider>
  )
}
