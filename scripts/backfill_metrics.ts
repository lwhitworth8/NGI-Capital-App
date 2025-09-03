/*
 Backfill metrics history into SQLite for ticker overlays and macro charts.
 Usage: DATABASE_PATH=ngi_capital.db FRED_API_KEY=... npm run backfill:metrics
*/
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config()
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Database = require('better-sqlite3') as any
// eslint-disable-next-line @typescript-eslint/no-var-requires
const yahooFinance = require('yahoo-finance2').default as any

type RegItem = {
  id: string
  label: string
  unit?: string
  source: 'yfinance' | 'FRED'
  frequency?: 'daily' | 'monthly' | 'quarterly'
  transform?: 'yoy'
}

const REGISTRY: RegItem[] = [
  { id: '^GSPC', label: 'S&P 500', source: 'yfinance' },
  { id: '^IXIC', label: 'NASDAQ Composite', source: 'yfinance' },
  { id: '^DJI', label: 'Dow Jones Industrial Average', source: 'yfinance' },
  { id: '^VIX', label: 'CBOE Volatility Index', source: 'yfinance' },
  { id: '^TNX', label: 'U.S. 10-Year Treasury Yield', source: 'yfinance' },
  { id: '^FVX', label: 'U.S. 5-Year Treasury Yield', source: 'yfinance' },
  { id: '^TYX', label: 'U.S. 30-Year Treasury Yield', source: 'yfinance' },
  { id: 'DX-Y.NYB', label: 'U.S. Dollar Index (DXY)', source: 'yfinance' },
  { id: 'EURUSD=X', label: 'EUR/USD', source: 'yfinance' },
  { id: 'GBPUSD=X', label: 'GBP/USD', source: 'yfinance' },
  { id: 'USDJPY=X', label: 'USD/JPY', source: 'yfinance' },
  { id: 'USDCAD=X', label: 'USD/CAD', source: 'yfinance' },
  { id: 'USDCHF=X', label: 'USD/CHF', source: 'yfinance' },
  { id: 'AUDUSD=X', label: 'AUD/USD', source: 'yfinance' },
  { id: 'CL=F', label: 'WTI Crude ($/bbl)', unit: 'USD/bbl', source: 'yfinance' },
  { id: 'GC=F', label: 'Gold ($/oz)', unit: 'USD/oz', source: 'yfinance' },
  // FRED level series we convert to YoY as needed
  { id: 'DGS10', label: 'U.S. 10-Year Treasury Yield', source: 'FRED', frequency: 'daily' },
  { id: 'DGS2', label: 'U.S. 2-Year Treasury Yield', source: 'FRED', frequency: 'daily' },
  { id: 'T10Y2Y', label: '2s10s Spread (bp)', source: 'FRED', frequency: 'daily' },
  { id: 'UNRATE', label: 'Unemployment Rate', source: 'FRED', frequency: 'monthly' },
  { id: 'CPIAUCSL', label: 'CPI (YoY)', source: 'FRED', frequency: 'monthly', transform: 'yoy' },
  { id: 'PCEPILFE', label: 'Core PCE (YoY)', source: 'FRED', frequency: 'monthly', transform: 'yoy' },
  { id: 'GDPC1', label: 'Real GDP (YoY)', source: 'FRED', frequency: 'quarterly', transform: 'yoy' },
  { id: 'NAPM', label: 'ISM Manufacturing PMI', source: 'FRED', frequency: 'monthly' },
  { id: 'HOUST', label: 'Housing Starts (SAAR)', source: 'FRED', frequency: 'monthly' },
  { id: 'USREC', label: 'U.S. Recession Indicator', source: 'FRED', frequency: 'monthly' },
]

const DB_PATH = process.env.DATABASE_PATH || 'ngi_capital.db'
const db = new Database(DB_PATH)

function ensureSchema() {
  db.exec(`CREATE TABLE IF NOT EXISTS metrics (
    id TEXT PRIMARY KEY,
    label TEXT,
    unit TEXT,
    source TEXT,
    frequency TEXT,
    transform TEXT
  )`)
  db.exec(`CREATE TABLE IF NOT EXISTS metric_history (
    metric_id TEXT NOT NULL,
    ts TEXT NOT NULL,
    value REAL,
    PRIMARY KEY(metric_id, ts)
  )`)
  db.exec(`CREATE TABLE IF NOT EXISTS metric_latest (
    metric_id TEXT PRIMARY KEY,
    ts TEXT,
    value REAL,
    change_abs REAL,
    change_pct REAL
  )`)
}

async function backfillYahoo(id: string): Promise<{ ts: string; value: number }[]> {
  const res: any = await yahooFinance.chart(id as any, { period1: '1975-01-01', interval: '1d' } as any)
  const timestamps: number[] = res?.chart?.result?.[0]?.timestamp || []
  const closes: number[] = res?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []
  const arr: { ts: string; value: number }[] = []
  for (let i = 0; i < Math.min(timestamps.length, closes.length); i++) {
    const v = Number(closes[i])
    if (!Number.isFinite(v)) continue
    let val = v
    if (id === '^TNX' || id === '^FVX' || id === '^TYX') {
      val = v // store raw; format layer divides by 10 for display
    }
    arr.push({ ts: new Date(timestamps[i] * 1000).toISOString(), value: val })
  }
  return arr
}

async function backfillFRED(id: string): Promise<{ ts: string; value: number }[]> {
  const key = process.env.FRED_API_KEY || ''
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(id)}&api_key=${key}&file_type=json&observation_start=1975-01-01`
  const r = await fetch(url)
  if (!r.ok) return []
  const j: any = await r.json()
  const obs: any[] = j?.observations || []
  let base = obs.map(o => ({ ts: o.date + 'T00:00:00Z', value: Number(o.value) }))
  // YoY transform if requested
  const reg = REGISTRY.find(x => x.id === id)
  if (reg?.transform === 'yoy') {
    const twelve = 12 * 30 * 24 * 3600 * 1000 // approximate spacing safeguard
    const m = new Map<string, number>(base.map(o => [o.ts.slice(0, 10), o.value]))
    base = base.map(o => {
      const prevKey = new Date(new Date(o.ts).getTime() - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10)
      const prev = m.get(prevKey)
      if (prev && prev !== 0) {
        return { ts: o.ts, value: ((o.value - prev) / Math.abs(prev)) * 100 }
      }
      return { ts: o.ts, value: NaN }
    }).filter(o => Number.isFinite(o.value))
  }
  // Spread to bp for T10Y2Y
  if (id === 'T10Y2Y') {
    base = base.map(o => ({ ts: o.ts, value: Math.round(o.value * 100) }))
  }
  return base
}

function upsertMetric(meta: RegItem) {
  const stmt = db.prepare(`INSERT INTO metrics(id,label,unit,source,frequency,transform) VALUES(?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET label=excluded.label, unit=excluded.unit, source=excluded.source, frequency=excluded.frequency, transform=excluded.transform`)
  stmt.run(meta.id, meta.label, meta.unit || null, meta.source, meta.frequency || null, meta.transform || null)
}

function upsertHistory(id: string, points: { ts: string; value: number }[]) {
  const insert = db.prepare(`INSERT OR IGNORE INTO metric_history(metric_id, ts, value) VALUES(?,?,?)`)
  const trx = db.transaction((items: { ts: string; value: number }[]) => {
    for (const p of items) insert.run(id, p.ts, p.value)
  })
  trx(points)
  // latest row
  const last: any = db.prepare(`SELECT ts, value FROM metric_history WHERE metric_id = ? ORDER BY ts DESC LIMIT 2`).all(id)
  if (last.length > 0) {
    const latest = last[0]
    const prev = last[1]
    const changeAbs = prev ? latest.value - prev.value : 0
    const changePct = prev && prev.value !== 0 ? (changeAbs / Math.abs(prev.value)) * 100 : 0
    db.prepare(`INSERT INTO metric_latest(metric_id, ts, value, change_abs, change_pct)
                VALUES(?,?,?,?,?)
                ON CONFLICT(metric_id) DO UPDATE SET ts=excluded.ts, value=excluded.value, change_abs=excluded.change_abs, change_pct=excluded.change_pct`).run(
      id, latest.ts, latest.value, changeAbs, changePct
    )
  }
}

async function main() {
  ensureSchema()
  for (const reg of REGISTRY) {
    try {
      upsertMetric(reg)
      let series: { ts: string; value: number }[] = []
      if (reg.source === 'yfinance') series = await backfillYahoo(reg.id)
      else series = await backfillFRED(reg.id)
      upsertHistory(reg.id, series)
      console.log(`Backfilled ${reg.id}: ${series.length} points`)
    } catch (e) {
      console.warn(`Backfill failed for ${reg.id}:`, (e as any)?.message)
    }
  }
  console.log('Done.')
}

main().catch(err => { console.error(err); process.exit(1) })
