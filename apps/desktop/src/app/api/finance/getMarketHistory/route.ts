import { NextRequest, NextResponse } from 'next/server'
import yahooFinance from 'yahoo-finance2'

export const revalidate = 0

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol') || ''
  const fred = searchParams.get('fred') || ''

  try {
    if (symbol) {
      const result = await yahooFinance.chart(symbol as any, { period1: '1975-01-01', interval: '1mo' } as any)
      const points = (result.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []).map((v: number, i: number) => ({
        t: result.chart.result[0].timestamp?.[i] ? new Date(result.chart.result[0].timestamp[i] * 1000).toISOString() : '',
        v,
      }))
      return NextResponse.json({ series: points })
    }
    // FRED 50y history
    const FRED_KEY = process.env.FRED_API_KEY || ''
    if (fred && FRED_KEY) {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${fred}&api_key=${FRED_KEY}&file_type=json&observation_start=1975-01-01`
      const r = await fetch(url, { cache: 'no-store' })
      const j = await r.json()
      const series = (j?.observations || []).map((o: any) => ({ t: o.date, v: Number(o.value) }))
      return NextResponse.json({ series })
    }
    return NextResponse.json({ series: [] })
  } catch (e) {
    return NextResponse.json({ series: [] })
  }
}

