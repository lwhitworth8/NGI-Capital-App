import { NextResponse } from 'next/server'
import yahooFinance from 'yahoo-finance2'

export const revalidate = 0

export async function GET() {
  try {
    const symbols = ['AAPL','MSFT','NVDA','META','AMZN','GOOGL']
    const quotes = await yahooFinance.quote(symbols as any)
    const items = (Array.isArray(quotes) ? quotes : [quotes]).map((q: any) => ({
      symbol: q.symbol,
      last: (q.regularMarketPrice ?? 0).toString(),
      changePct: (q.regularMarketChangePercent ?? 0).toFixed(2),
    }))
    return NextResponse.json({ items })
  } catch (e) {
    return NextResponse.json({ items: [] })
  }
}

