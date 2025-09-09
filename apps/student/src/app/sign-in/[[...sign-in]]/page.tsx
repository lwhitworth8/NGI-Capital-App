"use client"

import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #0b0f14 0%, #0b0f14 18%, rgba(37,99,235,0.12) 60%, rgba(37,99,235,0.22) 100%), #0b0f14'
    }}>
      <SignIn 
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        redirectUrl="/auth/resolve"
        afterSignInUrl="/auth/resolve"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-zinc-900 shadow-2xl",
            headerTitle: "text-white",
            headerSubtitle: "text-gray-400",
            socialButtonsBlockButton: "bg-white hover:bg-gray-50 border-gray-300",
            formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
            footerActionLink: "text-blue-400 hover:text-blue-300",
            identityPreviewText: "text-gray-200",
            identityPreviewEditButtonIcon: "text-blue-400",
            formFieldLabel: "text-gray-200",
            formFieldInput: "bg-zinc-800 border-zinc-700 text-white",
            dividerLine: "bg-zinc-700",
            dividerText: "text-gray-400",
            formFieldErrorText: "text-red-400",
            formFieldSuccessText: "text-green-400",
            otpCodeFieldInput: "bg-zinc-800 border-zinc-700 text-white",
            formResendCodeLink: "text-blue-400",
            alert: "bg-zinc-800 border-zinc-700",
            alertText: "text-gray-200"
          },
          layout: {
            socialButtonsPlacement: 'top',
            socialButtonsVariant: 'blockButton'
          },
          variables: {
            colorPrimary: "#3b82f6",
            colorText: "white",
            colorTextOnPrimaryBackground: "white",
            colorBackground: "#18181b",
            colorInputBackground: "#27272a",
            colorInputText: "white",
            borderRadius: "0.5rem"
          }
        }}
      />
    </div>
  )
}