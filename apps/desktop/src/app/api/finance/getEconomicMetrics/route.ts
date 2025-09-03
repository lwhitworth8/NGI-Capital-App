import { NextResponse } from 'next/server'

export const revalidate = 0

const FRED_API = 'https://api.stlouisfed.org/fred/series/observations'
const FRED_KEY = process.env.FRED_API_KEY || ''

async function fredSeries(series_id: string) {
  if (!FRED_KEY) return null
  const url = `${FRED_API}?series_id=${series_id}&api_key=${FRED_KEY}&file_type=json`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null
  const json = await res.json()
  const arr = json?.observations || []
  const last = arr[arr.length - 1]?.value || ''
  return last
}

let CACHE: any = null
let CACHE_TS = 0
const TTL_MS = 1000 * 60 * 60 * 6 // 6 hours default TTL (macro releases are infrequent)

export async function GET() {
  const now = Date.now()
  if (CACHE && now - CACHE_TS < TTL_MS) {
    return NextResponse.json(CACHE)
  }
  try {
    const [cpi, unemployment, gdpNowcast, fedFunds] = await Promise.all([
      fredSeries('CPIAUCSL'),
      fredSeries('UNRATE'),
      fredSeries('GDPC1'),
      fredSeries('FEDFUNDS'),
    ])
    const asOf = new Date().toISOString()
    CACHE = { cpi: cpi || '', unemployment: unemployment || '', gdpNowcast: gdpNowcast || '', fedFunds: fedFunds || '', asOf }
    CACHE_TS = now
    return NextResponse.json(CACHE)
  } catch (e) {
    const asOf = new Date().toISOString()
    const fallback = { cpi: '', unemployment: '', gdpNowcast: '', fedFunds: '', asOf, stale: true }
    return NextResponse.json(fallback)
  }
}
