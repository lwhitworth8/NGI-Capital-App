// Stub NextResponse to avoid importing Next's server Request in jsdom
jest.mock('next/server', () => {
  const makeRes = (location?: string) => ({ headers: { get: (k: string) => (k.toLowerCase() === 'location' ? (location || null) : null) } })
  return {
    __esModule: true,
    NextResponse: {
      next: () => makeRes(),
      redirect: (url: string) => makeRes(url),
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
    createRouteMatcher: (routes: string[]) => {
      return (_req: any) => false // not used in these tests
    },
    clerkMiddleware: (options: any) => {
      // Return a NextMiddleware-like function that directly invokes afterAuth
      return (req: any) => {
        if (options?.afterAuth) {
          return options.afterAuth(mockAuth, req)
        }
        return NextResponse.next()
      }
    },
  }
})

// Important: import the middleware AFTER the mock is set up
import middleware from '@/middleware'

describe('Desktop middleware admin gating', () => {
  const studentBase = 'https://students.localhost'
  const origEnv = process.env.NEXT_PUBLIC_STUDENT_BASE_URL
  beforeAll(() => {
    process.env.NEXT_PUBLIC_STUDENT_BASE_URL = studentBase
  })
  afterAll(() => {
    process.env.NEXT_PUBLIC_STUDENT_BASE_URL = origEnv
  })

  function makeReq(pathname: string): any {
    return { nextUrl: { pathname }, url: `http://localhost${pathname}` }
  }

  it('redirects non-admin email to Student portal', async () => {
    // Set non-admin email
    setAuth({ userId: 'user_2', sessionClaims: { email: 'lwhitworth@berkeley.edu' }, redirectToSignIn: jest.fn() })
    const res = await (middleware as any)(makeReq('/ngi-advisory/projects'))
    expect(res.headers.get('location')).toBe(`${studentBase}/projects`)
  })

  it('allows admin emails', async () => {
    setAuth({ userId: 'user_3', sessionClaims: { email: 'lwhitworth@ngicapitaladvisory.com' }, redirectToSignIn: jest.fn() })
    const res = await (middleware as any)(makeReq('/ngi-advisory/projects'))
    // Allowed path yields NextResponse.next (no redirect header)
    expect(res.headers.get('location')).toBeNull()
  })
})
