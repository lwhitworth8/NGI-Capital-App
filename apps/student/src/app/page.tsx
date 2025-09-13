'use client'

import Link from 'next/link'
import { useClerk } from '@clerk/nextjs'
import { useEffect } from 'react'

export default function HomePage() {
  const { signOut } = useClerk()
  
  useEffect(() => {
    try { signOut({ redirectUrl: undefined }).catch(() => {}) } catch {}
  }, [signOut])
  
  return (
    <>
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="font-semibold tracking-tight">NGI Capital Advisory</div>
          <div className="flex items-center gap-4">
            <Link 
              href="/sign-in" 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Sign In
            </Link>
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
              <Link 
                href="/sign-in" 
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium"
              >
                Sign In to Get Started
              </Link>
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
          (c) {new Date().getFullYear()} NGI Capital
        </div>
      </footer>
    </>
  )
}

