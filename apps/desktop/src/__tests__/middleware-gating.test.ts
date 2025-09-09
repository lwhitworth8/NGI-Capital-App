// Stub NextResponse to avoid importing Next's server Request in jsdom
jest.mock('next/server', () => {
  const makeRes = (location?: string) => ({ headers: { get: (k: string) => (k.toLowerCase() === 'location' ? (location || null) : null) } })
  return {
    __esModule: true,
    NextResponse: {
      next: () => makeRes(),
      redirect: (url: string | URL) => makeRes(typeof url === 'string' ? url : url.toString()),
    },
  }
})
import { NextResponse } from 'next/server'

// Mock Clerk server helpers to capture the afterAuth handler
let setAuth: (a: any) => void
jest.mock('@clerk/nextjs/server', () => {
  let mockAuth: any = {
    userId: 'user_1',
    sessionClaims: { email: 'someone@example.com' },
    redirectToSignIn: ({ returnBackUrl }: any) => NextResponse.redirect(returnBackUrl || '/sign-in'),
  }
  setAuth = (a: any) => { mockAuth = a }
  return {
    __esModule: true,
    createRouteMatcher: (_routes: string[]) => {
      return (_req: any) => false
    },
    clerkMiddleware: (arg: any) => {
      if (typeof arg === 'function') {
        return (req: any) => (arg as any)(() => mockAuth, req)
      }
      const options = arg || {}
      return (req: any) => {
        if (options.afterAuth) return options.afterAuth(mockAuth, req)
        return NextResponse.next()
      }
    },
  }
})

// Important: import the middleware AFTER the mock is set up
import middleware from '@/middleware'

describe('Desktop middleware admin gating', () => {
  const studentBase = 'http://localhost'
  const origStudentBase = process.env.NEXT_PUBLIC_STUDENT_BASE_URL
  const origPartners = process.env.PARTNER_EMAILS
  beforeAll(() => {
    process.env.NEXT_PUBLIC_STUDENT_BASE_URL = studentBase
    process.env.PARTNER_EMAILS = 'lwhitworth@ngicapitaladvisory.com,anurmamade@ngicapitaladvisory.com'
  })
  afterAll(() => {
    process.env.NEXT_PUBLIC_STUDENT_BASE_URL = origStudentBase
    process.env.PARTNER_EMAILS = origPartners
  })

  function makeReq(pathname: string): any {
    return { nextUrl: { pathname }, url: `http://localhost${pathname}` }
  }

  it('redirects non-admin email to Student portal /projects', async () => {
    // Set non-admin email
    setAuth({ userId: 'user_2', sessionClaims: { email: 'lwhitworth@berkeley.edu' }, redirectToSignIn: jest.fn() })
    const res = await (middleware as any)(makeReq('/admin/ngi-advisory/projects'))
    expect(res.headers.get('location')).toBe(`${studentBase}/projects`)
  })

  it('allows admin emails', async () => {
    setAuth({ userId: 'user_3', sessionClaims: { email: 'lwhitworth@ngicapitaladvisory.com' }, redirectToSignIn: jest.fn() })
    const res = await (middleware as any)(makeReq('/ngi-advisory/projects'))
    // Allowed path yields NextResponse.next (no redirect header)
    expect(res.headers.get('location')).toBeNull()
  })
})
