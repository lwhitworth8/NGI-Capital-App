import { computePostAuthRedirect } from '@/lib/auth/computeRedirect'

describe('computePostAuthRedirect', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_STUDENT_BASE_URL = 'http://localhost:3001/'
    process.env.NEXT_PUBLIC_ADMIN_BASE_URL = 'http://localhost:3001/admin/'
    process.env.PARTNER_EMAILS = 'lwhitworth@ngicapitaladvisory.com,anurmamade@ngicapitaladvisory.com'
  })

  it('routes partner to admin base', () => {
    const url = computePostAuthRedirect({
      email: 'lwhitworth@ngicapitaladvisory.com',
      role: null,
      reqUrl: 'http://localhost:3001/auth/resolve',
    })
    expect(url).toBe('http://localhost:3001/admin/')
  })

  it('routes UC student to student base', () => {
    const url = computePostAuthRedirect({
      email: 'lwhitworth@berkeley.edu',
      role: null,
      reqUrl: 'http://localhost:3001/auth/resolve',
    })
    expect(url).toBe('http://localhost:3001/')
  })
})

