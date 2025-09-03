export function labelForSymbol(sym?: string, pair?: string): string {
  if (sym === '^GSPC') return 'S&P 500'
  if (sym === '^IXIC') return 'NASDAQ Composite'
  if (sym === '^DJI') return 'Dow Jones Industrial Average'
  if (sym === '^VIX') return 'CBOE Volatility Index'
  if (sym === '^TNX') return 'U.S. 10-Year Treasury Yield'
  if (sym === '^FVX') return 'U.S. 5-Year Treasury Yield'
  if (sym === '^TYX') return 'U.S. 30-Year Treasury Yield'
  if (pair === 'EURUSD=X') return 'EUR/USD'
  if (pair === 'USDJPY=X') return 'USD/JPY'
  return sym || pair || ''
}

export function normalizeYield(symbol: string | undefined, raw: number): number {
  return symbol === '^TNX' || symbol === '^FVX' || symbol === '^TYX' ? raw / 10 : raw
}

export function fmtCurrency(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtIndex(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtPercent(n: number): string { return `${n.toFixed(2)}%` }

// Compute next marquee offset with modulo wrap
export function nextOffset(current: number, dtSec: number, speedPxPerSec: number, firstListWidth: number): number {
  let next = current - speedPxPerSec * dtSec
  if (-next >= firstListWidth && firstListWidth > 0) {
    next = next + firstListWidth
  }
  return next
}

// US market session
export function isUSMarketOpen(date = new Date()): boolean {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit' })
  const parts = Object.fromEntries(fmt.formatToParts(date).map(p => [p.type, p.value])) as any
  const wd = parts.weekday as string
  const hm = `${parts.hour}:${parts.minute}`
  const isWeekend = wd === 'Sat' || wd === 'Sun'
  return !isWeekend && hm >= '09:30' && hm <= '16:00'
}

export function isStale(asOfISO?: string, ttlMs = 6 * 60 * 60 * 1000): boolean {
  if (!asOfISO) return true
  const t = Date.parse(asOfISO)
  if (!Number.isFinite(t)) return true
  return Date.now() - t > ttlMs
}

