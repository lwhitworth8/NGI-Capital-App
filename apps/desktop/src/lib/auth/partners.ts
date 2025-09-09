export const PARTNER_EMAILS: string[] = (process.env.PARTNER_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export function isPartner(email?: string | null): boolean {
  return !!email && PARTNER_EMAILS.includes(email.toLowerCase())
}

export function destinationForEmail(email?: string | null): string {
  return isPartner(email) ? "/admin" : "/projects"
}

