// Integration-style tests for Student middleware routing

import type { NextRequest } from 'next/server'

let setAuth: (a: any) => void
jest.mock('@clerk/nextjs/server', () => {
  let mockAuth: any = { userId: null, sessionClaims: {} }
  setAuth = (a: any) => { mockAuth = a }
  return {
    __esModule: true,
    createRouteMatcher: (_routes: string[]) => {
      return (_req: any) => false
    },
    clerkMiddleware: (arg: any) => {
      // Support both signatures: clerkMiddleware(handler) and clerkMiddleware({ afterAuth })
      if (typeof arg === 'function') {
        return (req: any) => arg(mockAuth, req)
      }
      const options = arg || {}
      return (req: any) => {
        if (options.afterAuth) return options.afterAuth(mockAuth, req)
        return require('next/server').NextResponse.next()
      }
    },
  }
})

// Stub NextResponse to avoid importing Next's Request
jest.mock('next/server', () => {
  const makeRes = (location?: string) => ({
    headers: { get: (k: string) => (k.toLowerCase() === 'location' ? (location || null) : null) },
    cookies: { set: (_k: string, _v: string, _o?: any) => {} },
  })
  return {
    __esModule: true,
    NextResponse: {
      next: () => makeRes(),
      redirect: (url: string | URL) => makeRes(typeof url === 'string' ? url : url.toString()),
    },
  }
})

// Import the middleware AFTER mocks
import middleware from '@/middleware'

function makeReq(pathname: string): any {
  const origin = 'http://localhost:3001'
  return {
    nextUrl: { pathname, search: '', host: 'localhost:3001', protocol: 'http:' },
    url: `${origin}${pathname}`,
    headers: { get: (k: string) => {
      const kk = (k || '').toLowerCase()
      if (kk === 'x-forwarded-host' || kk === 'host') return 'localhost:3001'
      if (kk === 'x-forwarded-proto') return 'http'
      return null
    } },
  }
}

describe('Student middleware routing', () => {
  const origPartners = process.env.PARTNER_EMAILS
  const origAdminBase = process.env.NEXT_PUBLIC_ADMIN_BASE_URL
  const origAllowed = process.env.ALLOWED_EMAIL_DOMAINS
  beforeAll(() => {
    process.env.PARTNER_EMAILS = 'lwhitworth@ngicapitaladvisory.com,anurmamade@ngicapitaladvisory.com'
    process.env.NEXT_PUBLIC_ADMIN_BASE_URL = 'http://localhost:3001/admin'
    process.env.ALLOWED_EMAIL_DOMAINS = 'berkeley.edu,ngicapitaladvisory.com'
  })
  afterAll(() => {
    process.env.PARTNER_EMAILS = origPartners
    process.env.NEXT_PUBLIC_ADMIN_BASE_URL = origAdminBase
    process.env.ALLOWED_EMAIL_DOMAINS = origAllowed
  })
  it('redirects partner emails to admin base for student sections', async () => {
    setAuth({ userId: 'u1', sessionClaims: { email: 'lwhitworth@ngicapitaladvisory.com' } })
    const res: any = await (middleware as any)(makeReq('/projects'))
    expect(res.headers.get('location')).toBe('http://localhost:3001/admin/dashboard')
  })
  it('allows unauthenticated users to access /projects (public)', async () => {
    setAuth({ userId: null, sessionClaims: {} })
    const res: any = await (middleware as any)(makeReq('/projects'))
    expect(res.headers.get('location')).toBeNull()
  })
  it('allows unauthenticated users to access /learning (public)', async () => {
    setAuth({ userId: null, sessionClaims: {} })
    const res: any = await (middleware as any)(makeReq('/learning'))
    expect(res.headers.get('location')).toBeNull()
  })
  // Marketing root no longer forces logout to avoid loops

  it('allows UC student email to stay in student app', async () => {
    setAuth({ userId: 'u2', sessionClaims: { email: 'lwhitworth@berkeley.edu' } })
    const res: any = await (middleware as any)(makeReq('/projects'))
    expect(res.headers.get('location')).toBeNull()
  })

  it('blocks non-UC/non-advisory domains on gated pages', async () => {
    setAuth({ userId: 'u3', sessionClaims: { email: 'someone@gmail.com' } })
    const res: any = await (middleware as any)(makeReq('/applications'))
    expect(res.headers.get('location')).toBe('http://localhost:3001/blocked')
  })

  it('allows nested sign-in routes without redirect loops', async () => {
    setAuth({ userId: null, sessionClaims: {} })
    const res: any = await (middleware as any)(makeReq('/sign-in/verify'))
    expect(res.headers.get('location')).toBeNull()
  })
})
