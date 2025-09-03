'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { apiClient } from '@/lib/api';

interface Props { entityId?: number }

type Trend = 'up'|'down'|'flat'|null
interface KpiItem { label: string; value: string; trend: Trend; series?: number[]; asOf?: string }

const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer as any), { ssr: false }) as any
const AreaChart = dynamic(() => import('recharts').then(m => m.AreaChart as any), { ssr: false }) as any
const Area = dynamic(() => import('recharts').then(m => m.Area as any), { ssr: false }) as any

export default function FinanceKPICards({ entityId }: Props) {
  const [items, setItems] = useState<KpiItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const data = await apiClient.request<any>('GET', '/finance/kpis', undefined, { params: entityId ? { entity_id: entityId } : {} })
        if (!mounted) return
        const mapped: KpiItem[] = []
        if (data) {
          if (typeof data.cash_position === 'number') mapped.push({ label: 'Cash', value: `$${(data.cash_position || 0).toLocaleString()}`, trend: null })
          if (typeof data.monthly_revenue === 'number') mapped.push({ label: 'MRR', value: `$${(data.monthly_revenue || 0).toLocaleString()}`, trend: null })
          if (typeof data.monthly_expenses === 'number') mapped.push({ label: 'Burn', value: `$${(data.monthly_expenses || 0).toLocaleString()}`, trend: null })
          if (typeof data.total_assets === 'number') mapped.push({ label: 'Runway', value: '-', trend: null })
          // Placeholders for NRR/Open Invoices until backend provides fields
          mapped.push({ label: 'NRR', value: '-', trend: null })
          mapped.push({ label: 'Open Invoices', value: '-', trend: null })
        }
        const asOf: string | undefined = data?.asOf
        setItems(mapped.map(it => ({ ...it, asOf })))
      } catch {
        // Even if no data, show a fixed skeleton/wireframe set for UX
        setItems([
          { label: 'Cash', value: '-', trend: null },
          { label: 'MRR', value: '-', trend: null },
          { label: 'Burn', value: '-', trend: null },
          { label: 'Runway', value: '-', trend: null },
          { label: 'NRR', value: '-', trend: null },
          { label: 'Open Invoices', value: '-', trend: null },
        ])
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [entityId])

  const cards = useMemo(() => {
    if (loading) return new Array(6).fill(null).map((_,i)=>({ key:i, label:'', value:'', trend:null, series:[] }))
    // If no items after load, still show placeholder wireframe cards
    if (!items || items.length === 0) {
      return [
        { label: 'Cash', value: '-', trend: null },
        { label: 'MRR', value: '-', trend: null },
        { label: 'Burn', value: '-', trend: null },
        { label: 'Runway', value: '-', trend: null },
        { label: 'NRR', value: '-', trend: null },
        { label: 'Open Invoices', value: '-', trend: null },
      ]
    }
    return items
  }, [loading, items])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((it: any, idx: number) => (
        <div key={idx} className="ngi-card-elevated p-5">
          <div className="text-xs text-muted-foreground">{loading ? 'Loading…' : it.label}</div>
          <div className="flex items-end justify-between mt-1">
            <div className="text-2xl font-bold">{loading ? '—' : it.value || '—'}</div>
            {!loading && (it.series?.length ? (
              <div className="w-24 h-8">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={it.series.map((v:number)=>({v}))}>
                    <Area dataKey="v" stroke="#16a34a" fill="#86efac" fillOpacity={0.4} isAnimationActive />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="w-24 h-8 bg-muted rounded" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
