import { decideAdminAccess, isAdminEmail } from '@/lib/adminAccess'

describe('Admin gating', () => {
  const studentPath = '/ngi-advisory/projects'

  test('Non-admin email is redirected', () => {
    const email = 'lwhitworth@berkeley.edu'
    const decision = decideAdminAccess(email, studentPath)
    expect(decision.action).toBe('redirect')
  })

  test('Random gmail is redirected', () => {
    const email = 'someone@gmail.com'
    expect(decideAdminAccess(email, '/admin')).toEqual({ action: 'redirect' })
  })

  test('Admin email is allowed', () => {
    const email = 'lwhitworth@ngicapitaladvisory.com'
    expect(isAdminEmail(email)).toBe(true)
    expect(decideAdminAccess(email, '/')).toEqual({ action: 'allow' })
  })

  test('Env-extended admin list works', () => {
    process.env.NEXT_PUBLIC_ADVISORY_ADMINS = 'extra@ngicapitaladvisory.com'
    expect(isAdminEmail('extra@ngicapitaladvisory.com')).toBe(true)
  })
})

