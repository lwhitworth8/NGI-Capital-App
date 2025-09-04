export const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || 'berkeley.edu,ucla.edu,ucsd.edu,uci.edu,ucdavis.edu,ucsb.edu,ucsc.edu,ucr.edu,ucmerced.edu,ngicapitaladvisory.com')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean)

export function isAllowedStudentDomain(email: string): boolean {
  const lower = (email || '').toLowerCase()
  const domain = lower.includes('@') ? lower.split('@')[1] : ''
  return !!domain && allowedDomains.includes(domain)
}

