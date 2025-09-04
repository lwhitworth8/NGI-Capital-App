import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const allowed = (process.env.ALLOWED_EMAIL_DOMAINS || 'berkeley.edu').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)

export default function middleware(req: NextRequest) {
  // For MVP: allow through; in production, ensure a secure session and enforce domain
  // This is a placeholder – real enforcement would query Clerk session
  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next|api|favicon.ico).*)'] }

