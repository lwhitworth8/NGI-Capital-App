import { isAllowedStudentDomain, allowedDomains } from '@/lib/gating'

describe('Student domain gating', () => {
  test('Allows UC domains', () => {
    expect(isAllowedStudentDomain('user@berkeley.edu')).toBe(true)
  })
  test('Allows advisory domain', () => {
    expect(isAllowedStudentDomain('user@ngicapitaladvisory.com')).toBe(true)
  })
  test('Rejects non-UC/non-advisory domains', () => {
    expect(isAllowedStudentDomain('user@gmail.com')).toBe(false)
  })
})
