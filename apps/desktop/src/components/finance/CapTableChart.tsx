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

  // Normalize: support investor_relations.cap-table shape { members: [{name,balance}], total_equity }
  let classes = data?.classes || []
  if ((!classes || classes.length === 0) && Array.isArray(data?.members)) {
    const total = Number(data?.total_equity || 0)
    const top = (data.members as any[])
      .sort((a,b)=> Number(b.balance||0) - Number(a.balance||0))
      .slice(0, 6)
    const holders = top.map((m:any) => ({
      holder: m.name,
      pctFD: total>0 ? `${((Number(m.balance||0)/total)*100).toFixed(1)}%` : '0.0%',
      shares: `${Number(m.balance||0).toLocaleString()}`
    }))
    classes = [{ name: 'Equity', currency: 'USD', holders }]
  }
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
        <div className="mt-3 text-xs">
          <div className="font-medium text-foreground">{detail?.activeLabel}</div>
          <div className="text-muted-foreground">Top holders</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 mt-1">
            {(classes?.[0]?.holders||[]).slice(0,6).map((h:any, i:number)=>(
              <div key={i} className="flex items-center justify-between border rounded px-2 py-1">
                <span className="truncate mr-2">{h.holder || h.name}</span>
                <span className="tabular-nums text-muted-foreground">{h.pctFD || '-'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

