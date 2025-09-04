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
  return { nextUrl: { pathname, search: '' }, url: `${origin}${pathname}` }
}

describe('Student middleware routing', () => {
  it('redirects admin emails to /admin/', async () => {
    setAuth({ userId: 'u1', sessionClaims: { email: 'lwhitworth@ngicapitaladvisory.com' } })
    const res: any = await (middleware as any)(makeReq('/projects'))
    expect(res.headers.get('location')).toBe('http://localhost:3001/admin/')
  })

  it('allows UC student email to stay in student app', async () => {
    setAuth({ userId: 'u2', sessionClaims: { email: 'lwhitworth@berkeley.edu' } })
    const res: any = await (middleware as any)(makeReq('/projects'))
    expect(res.headers.get('location')).toBeNull()
  })

  it('blocks non-UC/non-advisory domains', async () => {
    setAuth({ userId: 'u3', sessionClaims: { email: 'someone@gmail.com' } })
    const res: any = await (middleware as any)(makeReq('/applications'))
    expect(res.headers.get('location')).toBe('http://localhost:3001/blocked')
  })
})
