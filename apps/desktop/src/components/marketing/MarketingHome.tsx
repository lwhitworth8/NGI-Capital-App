"use client"

export default function MarketingHome() {
  const issuer = (process.env.NEXT_PUBLIC_CLERK_ISSUER || '').toString().replace(/\/$/, '')
  // Force re-auth every time from marketing button: sign out ? hosted sign-in
  const href = issuer ? `${issuer}/sign-out?redirect_url=${encodeURIComponent(issuer + '/sign-in')}` : '/sign-in'
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-10">
      <h1 className="text-3xl font-bold">NGI Capital</h1>
      <p className="text-sm text-gray-600">Welcome. Please sign in to continue.</p>
      <a className="px-4 py-2 rounded bg-black text-white" href={href}>Sign in</a>
    </main>
  )
}

