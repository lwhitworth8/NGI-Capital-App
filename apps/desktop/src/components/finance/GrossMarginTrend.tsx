'use client';

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { apiClient } from '@/lib/api'

const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer as any)) as any
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart as any)) as any
const Line = dynamic(() => import('recharts').then(m => m.Line as any)) as any
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis as any)) as any
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis as any)) as any
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip as any)) as any
const Legend = dynamic(() => import('recharts').then(m => m.Legend as any)) as any

export default function GrossMarginTrend({ entityId, highlight }: { entityId?: number; highlight?: 'revenue'|'cogs'|'gm' }) {
  const [series, setSeries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const d = await apiClient.request<any>('GET', '/finance/gm-trend', undefined, { params: entityId ? { entity_id: entityId } : {} })
        if (!mounted) return
        setSeries(Array.isArray(d?.series) ? d.series : [])
      } catch {
        setSeries([])
      } finally { setLoading(false) }
    })()
    return () => { mounted = false }
  }, [entityId])

  return (
    <div className="rounded-xl border border-border bg-card p-4 h-64">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">Gross Margin Trend</h3>
      </div>
      {loading ? (
        <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#2563eb" dot={false} strokeWidth={highlight==='revenue'?3:2} opacity={highlight && highlight!=='revenue'?0.5:1} />
            <Line type="monotone" dataKey="cogs" stroke="#ef4444" dot={false} strokeWidth={highlight==='cogs'?3:2} opacity={highlight && highlight!=='cogs'?0.5:1} />
            <Line type="monotone" dataKey="gm" stroke="#16a34a" dot={false} strokeWidth={highlight==='gm'?3:2} opacity={highlight && highlight!=='gm'?0.5:1} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
