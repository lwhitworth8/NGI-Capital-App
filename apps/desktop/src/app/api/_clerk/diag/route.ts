import { NextResponse } from 'next/server'

export async function GET() {
  const pk = process.env.CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ''
  const sk = process.env.CLERK_SECRET_KEY || ''
  const issuer = process.env.CLERK_ISSUER || ''
  const audience = process.env.CLERK_AUDIENCE || ''
  const jwks = process.env.CLERK_JWKS_URL || ''
  return NextResponse.json({
    publishableKeyPresent: !!pk,
    secretKeyPresent: !!sk,
    // lengths only for sanity, never expose values
    publishableKeyLen: pk.length,
    secretKeyLen: sk.length,
    // masked previews to compare with dashboard (first 4 and last 4 chars only)
    publishableKeyPreview: pk ? `${pk.slice(0,4)}...${pk.slice(-4)}` : null,
    secretKeyPreview: sk ? `${sk.slice(0,4)}...${sk.slice(-4)}` : null,
    issuer,
    audience,
    jwks,
  })
}
