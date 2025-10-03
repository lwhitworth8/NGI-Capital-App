/**
 * Timezone utilities for handling PST/PDT (Los Angeles time)
 * All dates in the app should be displayed and stored in Pacific Time
 */

/**
 * Format a date in PST/PDT timezone
 */
export function formatDatePST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/**
 * Format a datetime in PST/PDT timezone
 */
export function formatDateTimePST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(d)
}

/**
 * Convert a date input value (YYYY-MM-DD) to PST and return ISO string
 */
export function dateInputToPST(dateString: string): string {
  if (!dateString) return ''
  // Date input gives us YYYY-MM-DD, interpret as PST midnight
  const date = new Date(dateString + 'T00:00:00')
  return date.toISOString().split('T')[0]
}

/**
 * Get current date in PST as YYYY-MM-DD format
 */
export function getCurrentDatePST(): string {
  const now = new Date()
  const pstDate = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  
  // Convert MM/DD/YYYY to YYYY-MM-DD
  const [month, day, year] = pstDate.split('/')
  return `${year}-${month}-${day}`
}

/**
 * Add weeks to a date and return in YYYY-MM-DD format
 */
export function addWeeks(dateString: string, weeks: number): string {
  if (!dateString || !weeks) return ''
  const date = new Date(dateString)
  date.setDate(date.getDate() + (weeks * 7))
  return date.toISOString().split('T')[0]
}

/**
 * Calculate weeks between two dates
 */
export function weeksBetween(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.ceil(diffDays / 7)
}

