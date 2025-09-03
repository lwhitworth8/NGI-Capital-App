/* Backfill metrics history into SQLite for ticker overlays and macro charts. */
require('dotenv').config()
const Database = require('better-sqlite3')
const yahooFinance = require('yahoo-finance2').default

const REGISTRY = [
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
  { id: 'DGS10', label: 'U.S. 10-Year Treasury Yield', source: 'FRED', frequency: 'daily' },
  { id: 'DGS2', label: 'U.S. 2-Year Treasury Yield', source: 'FRED', frequency: 'daily' },
  { id: 'ust_5y', label: 'U.S. 5-Year Treasury', unit: '%', source: 'FRED', sourceId: 'DGS5', frequency: 'daily' },
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
const FRED_API_KEY = process.env.FRED_API_KEY || ''

const db = new Database(DB_PATH)

function ensureSchema() {
  db.exec(`CREATE TABLE IF NOT EXISTS metrics (id TEXT PRIMARY KEY, label TEXT, unit TEXT, source TEXT, frequency TEXT, transform TEXT)`)
  db.exec(`CREATE TABLE IF NOT EXISTS metric_history (metric_id TEXT NOT NULL, ts TEXT NOT NULL, value REAL, PRIMARY KEY(metric_id, ts))`)
  db.exec(`CREATE TABLE IF NOT EXISTS metric_latest (metric_id TEXT PRIMARY KEY, ts TEXT, value REAL, change_abs REAL, change_pct REAL)`)
}

async function backfillYahoo(id) {
  try {
    const res = await yahooFinance.chart(id, { period1: '1975-01-01', interval: '1d' })
    const ts = (res && res.chart && res.chart.result && res.chart.result[0] && res.chart.result[0].timestamp) || []
    const closes = (res && res.chart && res.chart.result && res.chart.result[0] && res.chart.result[0].indicators && res.chart.result[0].indicators.quote && res.chart.result[0].indicators.quote[0] && res.chart.result[0].indicators.quote[0].close) || []
    const arr = []
    for (let i = 0; i < Math.min(ts.length, closes.length); i++) {
      const v = Number(closes[i])
      if (!Number.isFinite(v)) continue
      arr.push({ ts: new Date(ts[i] * 1000).toISOString(), value: v })
    }
    if (arr.length > 0) return arr
  } catch {}
  // Fallback to historical endpoint if chart failed or rate-limited
  try {
    const hist = await yahooFinance.historical(id, { period1: '1975-01-01', period2: new Date() })
    return (hist || []).filter(r => Number.isFinite(r.close)).map(r => ({ ts: new Date(r.date).toISOString(), value: Number(r.close) }))
  } catch {}
  return []
}

async function backfillFRED(id, sourceId) {
  if (!FRED_API_KEY) return []
  const series = sourceId || id
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(series)}&api_key=${FRED_API_KEY}&file_type=json&observation_start=1975-01-01`
  const r = await fetch(url)
  if (!r.ok) return []
  const j = await r.json()
  let obs = (j && j.observations) || []
  let base = obs.map(o => ({ ts: o.date + 'T00:00:00Z', value: Number(o.value) }))
  const reg = REGISTRY.find(x => x.id === id)
  if (reg && reg.transform === 'yoy') {
    const byMonth = new Map(base.map(o => [o.ts.slice(0, 7), o.value]))
    base = base.map(o => {
      const d = new Date(o.ts)
      d.setUTCFullYear(d.getUTCFullYear() - 1)
      const prevKey = d.toISOString().slice(0, 7)
      const prev = byMonth.get(prevKey)
      if (prev && prev !== 0) return { ts: o.ts, value: ((o.value - prev) / Math.abs(prev)) * 100 }
      return { ts: o.ts, value: NaN }
    }).filter(o => Number.isFinite(o.value))
  }
  if (series === 'T10Y2Y') base = base.map(o => ({ ts: o.ts, value: Math.round(o.value * 100) }))
  return base
}

function upsertMetric(meta) {
  db.prepare(`INSERT INTO metrics(id,label,unit,source,frequency,transform) VALUES(?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET label=excluded.label, unit=excluded.unit, source=excluded.source, frequency=excluded.frequency, transform=excluded.transform`).run(
    meta.id, meta.label, meta.unit || null, meta.source, meta.frequency || null, meta.transform || null)
}

function upsertHistory(id, points) {
  const insert = db.prepare(`INSERT OR IGNORE INTO metric_history(metric_id, ts, value) VALUES(?,?,?)`)
  const trx = db.transaction(items => { for (const p of items) insert.run(id, p.ts, p.value) })
  trx(points)
  const last = db.prepare(`SELECT ts, value FROM metric_history WHERE metric_id = ? ORDER BY ts DESC LIMIT 2`).all(id)
  if (last.length > 0) {
    const latest = last[0]
    const prev = last[1]
    const changeAbs = prev ? latest.value - prev.value : 0
    const changePct = prev && prev.value !== 0 ? (changeAbs / Math.abs(prev.value)) * 100 : 0
    db.prepare(`INSERT INTO metric_latest(metric_id, ts, value, change_abs, change_pct)
      VALUES(?,?,?,?,?)
      ON CONFLICT(metric_id) DO UPDATE SET ts=excluded.ts, value=excluded.value, change_abs=excluded.change_abs, change_pct=excluded.change_pct`).run(
      id, latest.ts, latest.value, changeAbs, changePct)
  }
}

async function main() {
  ensureSchema()
  for (const reg of REGISTRY) {
    try {
      upsertMetric(reg)
      let series = []
      if (reg.source === 'yfinance') series = await backfillYahoo(reg.id)
      else series = await backfillFRED(reg.id, reg.sourceId)
      upsertHistory(reg.id, series)
      console.log(`Backfilled ${reg.id}: ${series.length} points`)
    } catch (e) {
      console.warn(`Backfill failed for ${reg.id}:`, e && e.message)
    }
  }
  console.log('Done. Database:', DB_PATH)
}

main().catch(err => { console.error(err); process.exit(1) })
