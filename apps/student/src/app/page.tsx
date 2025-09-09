'use client'

import Link from 'next/link'
import { SignedIn, SignedOut, UserButton, useClerk } from '@clerk/nextjs'
import { useEffect } from 'react'

export default function HomePage() {
  const { signOut } = useClerk()
  
  useEffect(() => {
    // Force sign out on initial page load
    const shouldForceLogout = sessionStorage.getItem('clerk_force_logout') !== 'false'
    
    if (shouldForceLogout) {
      // Sign out silently without redirect
      signOut({ redirectUrl: undefined }).then(() => {
        // Set flag to prevent logout on subsequent navigation
        sessionStorage.setItem('clerk_force_logout', 'false')
      }).catch(() => {
        // User is already signed out or error occurred
        sessionStorage.setItem('clerk_force_logout', 'false')
      })
    }
    
    // Clear the flag when the tab is closed
    const handleBeforeUnload = () => {
      sessionStorage.removeItem('clerk_force_logout')
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [signOut])
  
  return (
    <>
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="font-semibold tracking-tight">NGI Capital Advisory</div>
          <div className="flex items-center gap-4">
            <SignedOut>
              <Link 
                href="/sign-in" 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                Sign In
              </Link>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
              <Link 
                href="/auth/resolve" 
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
              >
                Go to Dashboard
              </Link>
            </SignedIn>
          </div>
        </div>
      </header>
      
      <main>
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Launch your experience with NGI Capital Advisory
            </h1>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Hands-on projects, mentorship, and a pathway from learning to building. 
              Apply to live advisory projects, join the student incubator, and grow with a community of builders.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <SignedOut>
                <Link 
                  href="/sign-in" 
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium"
                >
                  Sign In to Get Started
                </Link>
              </SignedOut>
              <SignedIn>
                <Link 
                  href="/auth/resolve" 
                  className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-medium"
                >
                  Go to Dashboard
                </Link>
              </SignedIn>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-8">
          <h2 className="text-2xl font-semibold text-center mb-8">Programs</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-2">Advisory Projects</h3>
              <p className="text-sm text-muted-foreground">
                Work on active client projects with guidance from NGI partners. Build real deliverables and references.
              </p>
            </div>
            <div className="border rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-2">Student Incubator</h3>
              <p className="text-sm text-muted-foreground">
                Bring your ideas to life with mentorship, capital introductions, and a builder community.
              </p>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="border-t mt-16">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} NGI Capital
        </div>
      </footer>
    </>
  )
}