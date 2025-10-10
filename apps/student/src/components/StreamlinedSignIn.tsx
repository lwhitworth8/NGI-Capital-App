'use client'

import { useCallback } from 'react'
import { useSignIn, useClerk } from '@clerk/nextjs'

interface StreamlinedSignInProps {
  className?: string
  variant?: 'button' | 'nav' | 'cta'
  children?: React.ReactNode
  onClick?: () => void
}

export default function StreamlinedSignIn({ 
  className = '', 
  variant = 'button',
  children,
  onClick
}: StreamlinedSignInProps) {
  const { signIn, isLoaded } = useSignIn()
  const { signOut } = useClerk()

  const handleGoogleSignIn = useCallback(async () => {
    try {
      if (!isLoaded) return
      
      // Call onClick callback if provided
      onClick?.()
      
      // Sign out any existing session first
      try {
        await signOut()
        await new Promise(resolve => setTimeout(resolve, 300))
      } catch {}
      
      // Open Google sign-in with Clerk
      await signIn?.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/auth/resolve',
        redirectUrlComplete: '/auth/resolve',
      })
    } catch (error) {
      console.error('Google sign-in failed:', error)
    }
  }, [isLoaded, signIn, signOut, onClick])

  const getButtonStyles = () => {
    switch (variant) {
      case 'nav':
        return 'px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 font-medium text-sm shadow-lg hover:shadow-xl hover:scale-105'
      case 'cta':
        return 'px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 font-semibold text-base shadow-lg hover:shadow-xl hover:scale-105'
      default:
        return 'px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 font-medium'
    }
  }

  return (
    <button
      onClick={handleGoogleSignIn}
      disabled={!isLoaded}
      className={`${getButtonStyles()} ${className} disabled:opacity-70 disabled:cursor-not-allowed`}
    >
      {children || (
        <div className="flex items-center gap-2">
          <GoogleIcon />
          Sign In with Google
        </div>
      )}
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M23.04 12.2615C23.04 11.4461 22.9662 10.6615 22.8296 9.90771H12V14.3577H18.1896C17.922 15.7892 17.12 16.9861 15.894 17.8269V20.7138H19.62C21.8076 18.7138 23.04 15.7615 23.04 12.2615Z" fill="#4285F4"/>
      <path d="M12 23.5C15.24 23.5 17.9568 22.4269 19.62 20.7138L15.894 17.8269C14.9916 18.4269 13.728 18.8077 12 18.8077C8.874 18.8077 6.2436 16.7885 5.30399 14.0115H1.45439V16.9885C3.10879 20.7231 7.242 23.5 12 23.5Z" fill="#34A853"/>
      <path d="M5.30398 14.0115C5.064 13.4115 4.926 12.7654 4.926 12.0885C4.926 11.4115 5.064 10.7654 5.30398 10.1654V7.18848H1.45439C0.690391 8.74154 0.25 10.3729 0.25 12.0885C0.25 13.804 0.690391 15.4354 1.45439 16.9885L5.30398 14.0115Z" fill="#FBBC05"/>
      <path d="M12 5.26923C13.9056 5.26923 15.5568 5.92308 16.878 7.16923L19.7136 4.33385C17.9496 2.69231 15.24 1.5 12 1.5C7.242 1.5 3.10879 4.27692 1.45439 8.01154L5.30399 10.9885C6.2436 8.21154 8.874 6.19231 12 6.19231V5.26923Z" fill="#EA4335"/>
    </svg>
  )
}
