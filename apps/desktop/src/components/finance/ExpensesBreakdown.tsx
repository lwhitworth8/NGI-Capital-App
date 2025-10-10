'use client';

import React, { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { apiClient } from '@/lib/api'

const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer as any)) as any
const PieChart = dynamic(() => import('recharts').then(m => m.PieChart as any)) as any
const Pie = dynamic(() => import('recharts').then(m => m.Pie as any)) as any
const Cell = dynamic(() => import('recharts').then(m => m.Cell as any)) as any
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip as any)) as any

const COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#6366f1','#06b6d4']

export default function ExpensesBreakdown({ entityId }: { entityId?: number }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const d = await apiClient.request<any>('GET', '/finance/cfo-kpis', undefined, { params: entityId ? { entity_id: entityId } : {} })
        if (!mounted) return
        setData(d)
      } catch {
        setData(null)
      } finally { setLoading(false) }
    })()
    return () => { mounted = false }
  }, [entityId])

  const chartData = useMemo(() => {
    if (!data) return []
    return [
      { name: 'Fixed', value: Number(data?.expenses_fixed || 0) },
      { name: 'Variable', value: Number(data?.expenses_variable || 0) },
    ]
  }, [data])

  return (
    <div className="rounded-xl border border-border bg-card p-4 h-64">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">Expenses Breakdown</h3>
      </div>
      {loading ? (
        <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip />
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80}>
              {chartData.map((_: any, idx: number) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

