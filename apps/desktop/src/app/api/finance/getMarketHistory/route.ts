import { NextRequest, NextResponse } from 'next/server'
import yahooFinance from 'yahoo-finance2'

export const revalidate = 0

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol') || ''
  const fred = searchParams.get('fred') || ''

  try {
    if (symbol) {
      console.log(`[getMarketHistory] Fetching Yahoo Finance data for symbol: ${symbol}`)
      
      // Use historical endpoint for better data availability
      const result = await yahooFinance.historical(symbol as any, {
        period1: '1975-01-01',
        period2: new Date().toISOString().split('T')[0],
        interval: '1mo',
      } as any)
      
      console.log(`[getMarketHistory] Raw result length: ${result?.length || 0}`)
      
      // Map historical data to our format
      const points = (result || [])
        .filter((r: any) => r.close != null && !isNaN(r.close))
        .map((r: any) => ({
          t: r.date instanceof Date ? r.date.toISOString() : new Date(r.date).toISOString(),
          v: Number(r.close),
        }))
        .sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime())
      
      console.log(`[getMarketHistory] Successfully fetched ${points.length} data points for ${symbol}`)
      return NextResponse.json({ series: points })
    }
    // FRED 50y history
    const FRED_KEY = process.env.FRED_API_KEY || ''
    if (fred && FRED_KEY) {
      console.log(`[getMarketHistory] Fetching FRED data for series: ${fred}`)
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${fred}&api_key=${FRED_KEY}&file_type=json&observation_start=1975-01-01`
      const r = await fetch(url, { cache: 'no-store' })
      const j = await r.json()
      const series = (j?.observations || [])
        .map((o: any) => ({ t: o.date, v: Number(o.value) }))
        .filter((p: any) => p.t && p.v != null && !isNaN(p.v))
      console.log(`[getMarketHistory] Successfully fetched ${series.length} FRED data points for ${fred}`)
      return NextResponse.json({ series })
    }
    console.log('[getMarketHistory] No symbol or FRED series provided')
    return NextResponse.json({ series: [] })
  } catch (e) {
    console.error('[getMarketHistory] Error fetching historical data:', e)
    return NextResponse.json({ series: [], error: e instanceof Error ? e.message : 'Unknown error' })
  }
}
