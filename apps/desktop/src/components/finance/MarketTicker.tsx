'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { formatDate } from '@/lib/utils';
import { prettyLabel, formatMetric } from '@/lib/metrics/labels';
import { apiClient } from '@/lib/api';

type IndexItem = { name: string; value: string; changePct: string; symbol?: string }
type YieldItem = { name: string; value: string; changePct: string; symbol?: string }
type FxItem = { pair: string; value: string; changePct: string }

// Mapping helpers
function labelForSymbol(sym?: string, pair?: string): string {
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

function fmtCurrency(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtIndex(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtPercent(n: number) {
  return `${n.toFixed(2)}%`
}

function normalizeYield(symbol: string | undefined, raw: number): number {
  // Yahoo yield indices are 10x (e.g., ^TNX=10*10Y). Divide by 10.
  if (symbol === '^TNX' || symbol === '^FVX' || symbol === '^TYX') return raw / 10
  return raw
}

function TickerItem({ label, value, change, onClick, role }: { label: string; value: string; change: string; onClick?: () => void; role?: string }) {
  const ch = Number(change)
  const color = ch > 0 ? 'text-green-600' : ch < 0 ? 'text-red-600' : 'text-muted-foreground'
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2 px-4 py-2 tabular-nums" aria-label={label} role={role}>
      <span className="font-medium whitespace-nowrap">{label}</span>
      <span className="text-sm text-foreground whitespace-nowrap">{value}</span>
      <span className={`text-xs ${color} whitespace-nowrap`}>{Number.isFinite(ch) ? ch.toFixed(2) : '0.00'}%</span>
    </button>
  )
}

function Overlay({ title, onClose, metricId, rawSymbol, fredSeries }: { title: string; onClose: () => void; metricId?: string; rawSymbol?: string; fredSeries?: string }) {
  const [series, setSeries] = useState<{ t: string; v: number }[]>([])
  const [usrec, setUsrec] = useState<{ t: string; v: number }[]>([])
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const id = metricId || rawSymbol || fredSeries || ''
    if (!id) return
    // Primary: try backend metrics store (DB-backed). If empty, fall back to Next API live fetch.
    apiClient.request('GET', `/metrics/${encodeURIComponent(id)}/history`).then(async (j:any) => {
      const hist = Array.isArray(j?.history) ? j.history : []
      if (hist.length > 0) { setSeries(hist); setLoaded(true); return }
      // Fallback: Yahoo/FRED via Next route
      try {
        if (rawSymbol) {
          const r = await fetch(`/api/finance/getMarketHistory?symbol=${encodeURIComponent(rawSymbol)}`)
          const jj: any = await r.json()
          if (Array.isArray(jj?.series) && jj.series.length > 0) {
            const needsDiv10 = rawSymbol === '^TNX' || rawSymbol === '^FVX' || rawSymbol === '^TYX'
            const ser = needsDiv10 ? jj.series.map((p:any)=>({ t: p.t, v: typeof p.v === 'number' ? p.v/10 : p.v })) : jj.series
            setSeries(ser); setLoaded(true); return
          }
        }
        if (fredSeries) {
          const r = await fetch(`/api/finance/getMarketHistory?fred=${encodeURIComponent(fredSeries)}`)
          const jj: any = await r.json()
          if (Array.isArray(jj?.series) && jj.series.length > 0) { setSeries(jj.series); setLoaded(true); return }
        }
        setSeries([]); setLoaded(true)
      } catch {
        setSeries([]); setLoaded(true)
      }
    }).catch(() => { setSeries([]); setLoaded(true) })
    // recession shading (optional)
    apiClient.request('GET', `/metrics/${encodeURIComponent('USREC')}/history`).then((j:any)=> setUsrec(j.history || [])).catch(()=>setUsrec([]))
  }, [metricId, rawSymbol, fredSeries])
  // simple CSV download
  const downloadCSV = () => {
    const csv = 'date,value\n' + series.map(p => `${p.t},${p.v}`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${title.replace(/\s+/g,'_')}.csv`; a.click(); URL.revokeObjectURL(url)
  }
  const AreaChart = dynamic(() => import('recharts').then(m => m.AreaChart as any)) as any
  const Area = dynamic(() => import('recharts').then(m => m.Area as any)) as any
  const XAxis = dynamic(() => import('recharts').then(m => m.XAxis as any)) as any
  const YAxis = dynamic(() => import('recharts').then(m => m.YAxis as any)) as any
  const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip as any)) as any
  const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid as any)) as any
  const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer as any)) as any

  // brand colors
  const stroke = 'var(--primary, #2563eb)'
  const fillFrom = 'rgba(37, 99, 235, 0.30)'
  const fillTo = 'rgba(37, 99, 235, 0.00)'

  const loading = !loaded
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" role="dialog" aria-modal="true">
      <div className="bg-card w-full max-w-6xl rounded-xl shadow-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-foreground tabular-nums">{title}</h2>
          <div className="space-x-2">
            <button className="text-sm px-3 py-1 rounded-md border" onClick={downloadCSV}>Download CSV</button>
            <button className="text-sm px-3 py-1 rounded-md border" onClick={onClose}>Close</button>
          </div>
        </div>
        <div className="h-[420px]">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">Loading series...</div>
          ) : series.length === 0 ? (
            <div className="w-full h-full rounded bg-gradient-to-t from-blue-500/30 to-blue-300/5" aria-label="No data" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="tickerGrad" x1="0" x2="0" y1="1" y2="0">
                    <stop offset="0%" stopColor={fillFrom} />
                    <stop offset="90%" stopColor={fillTo} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(120,120,120,0.15)" vertical={false} />
                <XAxis dataKey="t" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={48} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
                <Tooltip labelFormatter={(v:any)=>formatDate(v)} formatter={(v:any)=>[v,'']} wrapperStyle={{ fontVariantNumeric: 'tabular-nums' as any }}/>
                <Area type="monotone" dataKey="v" stroke={stroke} fill="url(#tickerGrad)" strokeWidth={2} isAnimationActive dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

function useUSMarketSession() {
  const [open, setOpen] = useState(true)
  useEffect(() => {
    const check = () => {
      const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit' })
      const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value])) as any
      const wd = parts.weekday as string
      const hm = `${parts.hour}:${parts.minute}`
      const isWeekend = wd === 'Sat' || wd === 'Sun'
      const marketOpen = !isWeekend && hm >= '09:30' && hm <= '16:00'
      setOpen(marketOpen)
    }
    check()
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [])
  return open
}

export default function MarketTicker() {
  const marketOpen = useUSMarketSession()
  const [indices, setIndices] = useState<IndexItem[]>([])
  const [yields, setYields] = useState<YieldItem[]>([])
  const [fx, setFx] = useState<FxItem[]>([])
  const [overlay, setOverlay] = useState<{title: string; symbol?: string; fred?: string} | null>(null)
  const [paused, setPaused] = useState(false)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const [offset, setOffset] = useState(0) // negative px translateX
  const speed = 40 // px/sec

  const load = async () => {
    try {
      const [mm, em] = await Promise.all([
        fetch('/api/finance/getMarketMetrics').then(r=>r.json()),
        fetch('/api/finance/getEconomicMetrics').then(r=>r.json()),
      ])
      const idx = (mm.indices || []).map((q: any) => ({
        name: prettyLabel(q.symbol || q.name),
        value: formatMetric(Number(q.value ?? 0), q.symbol || q.name),
        changePct: String(q.changePct ?? '0'),
        symbol: q.symbol,
      }))
      // Add VIX if not present
      if (!idx.some((i:any)=>i.symbol==='^VIX') && Array.isArray(mm.indices)) {
        // Try to compute VIX if provided via API in future; else skip
      }
      const yi = (mm.yields || []).map((q: any) => ({
        name: prettyLabel(q.symbol),
        value: formatMetric(Number(q.value ?? 0), q.symbol),
        changePct: String(q.changePct ?? '0'),
        symbol: q.symbol,
      }))
      const fxItems = (mm.fx || []).map((q: any) => ({
        pair: q.symbol,
        value: formatMetric(Number(q.value ?? 0), q.symbol),
        changePct: String(q.changePct ?? '0'),
      }))
      setIndices(idx)
      setYields(yi as any)
      setFx(fxItems)
      // We still track freshness internally if needed for tooltips/overlay in future
      // but do not display an as-of label on the marquee per request.
    } catch {}
  }

  useEffect(() => {
    load()
    // poll only during market session; otherwise backoff
    const interval = marketOpen ? 15_000 : 5 * 60_000
    const id = setInterval(() => { if (marketOpen) load() }, interval)
    return () => clearInterval(id)
  }, [marketOpen])

  // Marquee animation using rAF with modulo wrap, preserving position across pauses/overlays
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const step = (t: number) => {
      const list = listRef.current
      if (!list) { raf = requestAnimationFrame(step); return }
      const dt = Math.max(0, Math.min(100, t - last)) / 1000 // seconds, clamp to avoid jumps
      last = t
      if (!paused) {
        const w = list.offsetWidth || 1
        let next = offset - speed * dt
        // modulo wrap: when left of first list more than its width, wrap forward by width
        if (-next >= w) {
          next = next + w
        }
        setOffset(next)
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [paused, offset])

  return (
    <div className="relative w-full overflow-hidden" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)}>
      {/* Track: duplicate stream for seamless circular marquee */}
      <div ref={trackRef} className="flex whitespace-nowrap will-change-transform" style={{ transform: `translateX(${offset}px)` }}>
        <div ref={listRef} className="flex" aria-hidden={false}>
          {[...indices, ...yields as any, ...fx as any].map((it: any, i: number) => (
            <TickerItem key={`a-${i}`} role="listitem" label={it.name || prettyLabel(it.symbol || it.pair)} value={it.value || ''} change={it.changePct || '0'} onClick={() => setOverlay({ title: (it.name || prettyLabel(it.symbol || it.pair)), symbol: it.symbol || it.pair })} />
          ))}
        </div>
        <div className="flex" aria-hidden>
          {[...indices, ...yields as any, ...fx as any].map((it: any, i: number) => (
            <TickerItem key={`b-${i}`} role="listitem" label={it.name || prettyLabel(it.symbol || it.pair)} value={it.value || ''} change={it.changePct || '0'} onClick={() => setOverlay({ title: (it.name || prettyLabel(it.symbol || it.pair)), symbol: it.symbol || it.pair })} />
          ))}
        </div>
      </div>

      {overlay && (
        <Overlay
          title={overlay.title}
          onClose={()=>{ setOverlay(null); setPaused(false) }}
          metricId={mapMetricId(overlay.symbol)}
          rawSymbol={overlay.symbol}
          fredSeries={mapFredSeries(overlay.symbol)}
        />
      )}
    </div>
  )
}

// CSS keyframes via global layer (assumes Tailwind present)
// We avoid touching global config; this relies on existing Tailwind setup.

function mapMetricId(sym?: string) {
  if (!sym) return sym
  // Map Yahoo 5Y (^FVX) to our canonical DB metric id if present
  if (sym === '^FVX') return 'ust_5y'
  return sym
}

function mapFredSeries(sym?: string) {
  if (!sym) return undefined
  // FRED series mapping when we use DB metric aliases
  if (sym === '^FVX') return 'DGS5'
  return undefined
}
