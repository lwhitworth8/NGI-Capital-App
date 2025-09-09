'use client'

import { SignUp } from '@clerk/nextjs'
import { useTheme } from 'next-themes'
import { getStudentClerkAppearance } from '@/lib/clerkAppearance'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function SignUpPage() {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Use resolved theme after mounting to avoid hydration mismatch
  const currentTheme = mounted ? (resolvedTheme as 'light' | 'dark') : 'light'
  const appearance = getStudentClerkAppearance(currentTheme)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-indigo-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Join NGI Capital Advisory
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create your student account
          </p>
        </div>
        
        <SignUp
          routing="path"
          path="/sign-up"
          afterSignUpUrl="/auth/resolve"
          appearance={appearance}
        />
        
        <div className="mt-6 space-y-3">
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
            <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
              Important Note
            </h3>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              You must use your UC system email address to register. Non-UC emails will not be granted access.
            </p>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/sign-in" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
        
        <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-500">
          <p>
            By signing up, you agree to our{' '}
            <a href="/terms" className="underline hover:text-gray-700 dark:hover:text-gray-300">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="underline hover:text-gray-700 dark:hover:text-gray-300">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

