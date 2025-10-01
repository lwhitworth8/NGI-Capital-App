'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { apiClient } from '@/lib/api';

const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer as any)) as any
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart as any)) as any
const Bar = dynamic(() => import('recharts').then(m => m.Bar as any)) as any
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis as any)) as any
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis as any)) as any
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip as any)) as any
const Legend = dynamic(() => import('recharts').then(m => m.Legend as any)) as any

interface Props { entityId?: number }

export default function CapTableChart({ entityId }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const j = await apiClient.request<any>(
          'GET',
          '/investor-relations/cap-table',
          undefined,
          { params: entityId ? { entity_id: entityId } : {} },
        )
        setData(j)
      } catch {
        setData({ classes: [] })
      } finally { setLoading(false) }
    }
    load()
  }, [entityId])

  const classes = data?.classes || []
  const chartData = classes.map((c:any) => ({ name: `${c.name}${c.series?` ${c.series}`:''}`, value: (c.holders?.length || 0) }))

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-center">
        <h2 className="font-semibold">Capital Table</h2>
      </div>
      {loading ? (
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Loading.</div>
      ) : classes.length === 0 ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-full h-full rounded bg-gradient-to-t from-blue-500/40 to-blue-300/10" aria-label="Cap table placeholder" />
        </div>
      ) : (
        <div className="h-48 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" hide/>
              <YAxis hide/>
              <Tooltip/>
              <Legend/>
              <Bar dataKey="value" stackId="a" fill="#60a5fa" onClick={(d:any)=>setDetail(d)} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {detail && (
        <div className="mt-2 text-xs text-muted-foreground">Click detected: {detail?.activeLabel}</div>
      )}
    </div>
  )
}

