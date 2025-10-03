"use client"

import { useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SignIn, useSignIn, useUser, useClerk } from '@clerk/nextjs'

export default function SignInPage() {
  const { signIn, isLoaded } = useSignIn()
  const { isSignedIn, user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()

  // If already signed in, redirect to appropriate dashboard
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const email = user.primaryEmailAddress?.emailAddress || ''
      
      // Check if admin email
      if (email.endsWith('@ngicapitaladvisory.com')) {
        window.location.href = 'http://localhost:3001/admin/dashboard'
      } else {
        router.push('/projects')
      }
    }
  }, [isLoaded, isSignedIn, user, router])

  // If there's a stale session, sign out first
  const handleGoogleSignIn = useCallback(async () => {
    try {
      if (!isLoaded) return
      
      // If user is somehow signed in, sign them out first
      if (isSignedIn) {
        await signOut()
        // Wait a bit for sign out to complete
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      await signIn?.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/auth/resolve',
        redirectUrlComplete: '/auth/resolve',
      })
    } catch (e) {
      console.error('Google sign-in failed', e)
    }
  }, [isLoaded, signIn, isSignedIn, signOut])

  const onGoogle = handleGoogleSignIn

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-b from-black via-black via-60% to-[#0b1e47] flex flex-col overflow-hidden">
      {/* Header – match marketing navbar styling */}
      <header className="w-full h-16 bg-black text-white">
        <div className="mx-auto max-w-7xl px-8 h-16 flex items-center justify-between">
          <div className="text-2xl font-bold tracking-tight">NGI Capital</div>
          <Link href="/" className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors text-sm font-medium">
            Back to home
          </Link>
        </div>
      </header>

      {/* Main card – positioned higher, responsive top padding, no scroll */}
      <main className="relative z-10 flex-1 flex items-start justify-center px-4 pt-6 sm:pt-8 md:pt-12 lg:pt-16 xl:pt-24">
        <section aria-label="Sign in" className="w-full max-w-md">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
            <div className="px-7 pt-7 pb-6 text-center">
              <h1 className="text-2xl md:text-[28px] leading-tight font-semibold text-white tracking-tight">
                Sign in to become the Next Generation of Investors
              </h1>
              <p className="mt-2 text-sm text-zinc-400">
                Use your university or NGI Capital email to continue.
              </p>
              <div className="mt-6">
                <button
                  onClick={onGoogle}
                  disabled={!isLoaded}
                  className="w-full inline-flex items-center justify-center gap-3 rounded-xl bg-white text-zinc-900 hover:bg-zinc-100 active:scale-[0.99] transition-all h-11 font-medium disabled:opacity-70"
                  aria-label="Continue with Google"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>
              </div>
              <p className="mt-4 text-[11px] text-zinc-400">
                We use Google for secure sign‑in. We never see your password.
              </p>
            </div>
            <div className="px-7 pb-6 text-center">
              <p className="text-[11px] text-zinc-500">
                By continuing, you agree to our
                {' '}<a href="#" className="text-zinc-300 hover:text-white underline underline-offset-2">Terms</a>
                {' '}and{' '}
                <a href="#" className="text-zinc-300 hover:text-white underline underline-offset-2">Privacy Policy</a>.
              </p>
              <p className="mt-2 text-[11px] text-zinc-500">
                Need help? <a href="mailto:support@ngicapitaladvisory.com" className="text-zinc-300 hover:text-white underline underline-offset-2">Contact support</a>
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Hidden Clerk SignIn to keep internals happy (branding removed) */}
      <div className="hidden" aria-hidden>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          redirectUrl="/auth/resolve"
          afterSignInUrl="/auth/resolve"
          appearance={{
            elements: { rootBox: 'hidden', card: 'hidden', footer: 'hidden' },
            layout: { socialButtonsPlacement: 'top', socialButtonsVariant: 'blockButton' },
          }}
        />
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M23.04 12.2615C23.04 11.4461 22.9662 10.6615 22.8296 9.90771H12V14.3577H18.1896C17.922 15.7892 17.12 16.9861 15.894 17.8269V20.7138H19.62C21.8076 18.7138 23.04 15.7615 23.04 12.2615Z" fill="#4285F4"/>
      <path d="M12 23.5C15.24 23.5 17.9568 22.4269 19.62 20.7138L15.894 17.8269C14.9916 18.4269 13.728 18.8077 12 18.8077C8.874 18.8077 6.2436 16.7885 5.30399 14.0115H1.45439V16.9885C3.10879 20.7231 7.242 23.5 12 23.5Z" fill="#34A853"/>
      <path d="M5.30398 14.0115C5.064 13.4115 4.926 12.7654 4.926 12.0885C4.926 11.4115 5.064 10.7654 5.30398 10.1654V7.18848H1.45439C0.690391 8.74154 0.25 10.3729 0.25 12.0885C0.25 13.804 0.690391 15.4354 1.45439 16.9885L5.30398 14.0115Z" fill="#FBBC05"/>
      <path d="M12 5.26923C13.9056 5.26923 15.5568 5.92308 16.878 7.16923L19.7136 4.33385C17.9496 2.69231 15.24 1.5 12 1.5C7.242 1.5 3.10879 4.27692 1.45439 8.01154L5.30399 10.9885C6.2436 8.21154 8.874 6.19231 12 6.19231V5.26923Z" fill="#EA4335"/>
    </svg>
  )
}
