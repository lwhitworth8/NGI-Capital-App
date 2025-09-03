import { NextResponse } from 'next/server'
import yahooFinance from 'yahoo-finance2'

export const revalidate = 0

function isUSMarketOpen(date = new Date()) {
  // Basic guardrails: weekdays 9:30-16:00 US/Eastern
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit' })
  const parts = Object.fromEntries(fmt.formatToParts(date).map(p => [p.type, p.value])) as any
  const wd = parts.weekday as string
  const hm = `${parts.hour}:${parts.minute}`
  const isWeekend = wd === 'Sat' || wd === 'Sun'
  return !isWeekend && hm >= '09:30' && hm <= '16:00'
}

export async function GET() {
  try {
    const indexSymbols = ['^GSPC', '^IXIC', '^DJI', '^VIX', 'DX-Y.NYB', 'GC=F', 'CL=F']
    const quotes = await yahooFinance.quote(indexSymbols as any)
    const indices = (Array.isArray(quotes) ? quotes : [quotes]).map((q: any) => ({
      symbol: q.symbol,
      name: q.shortName || q.symbol,
      value: (q.regularMarketPrice ?? q.ask ?? q.bid ?? 0).toString(),
      changePct: (q.regularMarketChangePercent ?? 0).toFixed(2),
    }))

    // Treasury yields via Yahoo tickers (10Y, 2Y, 30Y)
    const yieldSymbols = ['^TNX', '^FVX', '^TYX']
    const yq = await yahooFinance.quote(yieldSymbols as any)
    const yields = (Array.isArray(yq) ? yq : [yq]).map((q: any) => ({
      symbol: q.symbol,
      name: q.symbol,
      value: (q.regularMarketPrice ?? 0).toString(),
      changePct: (q.regularMarketChangePercent ?? 0).toFixed(2),
    }))

    // FX via Yahoo (EURUSD=X, USDJPY=X)
    const fxSymbols = ['EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDCAD=X', 'USDCHF=X', 'AUDUSD=X']
    const fxq = await yahooFinance.quote(fxSymbols as any)
    const fx = (Array.isArray(fxq) ? fxq : [fxq]).map((q: any) => ({
      symbol: q.symbol,
      pair: q.symbol,
      value: (q.regularMarketPrice ?? 0).toString(),
      changePct: (q.regularMarketChangePercent ?? 0).toFixed(2),
    }))

    const asOf = new Date().toISOString()
    const marketOpen = isUSMarketOpen()
    return NextResponse.json({ indices, yields, fx, asOf, marketOpen })
  } catch (e) {
    const asOf = new Date().toISOString()
    return NextResponse.json({ indices: [], yields: [], fx: [], asOf, marketOpen: false })
  }
}
