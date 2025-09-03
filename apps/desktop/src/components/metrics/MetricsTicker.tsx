"use client";
import React, { useMemo, useState } from "react";
import { MetricChip } from "./MetricChip";
import { MetricModal } from "./MetricModal";
import { apiClient } from "@/lib/api";
import useSWR from "swr";

type Dashboard = { total_aum?: number; monthly_revenue?: number; monthly_expenses?: number; pending_approvals_count?: number; entity_count?: number }

const fetcher = async (): Promise<Dashboard> => {
  try { return await apiClient.getDashboardMetrics() as any } catch { return {} }
}

export default function MetricsTicker({ className }: { className?: string }) {
  const { data } = useSWR('dashboard_metrics', fetcher, { refreshInterval: 60000 })
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<{ label: string; value: number; unit?: string } | null>(null)

  const items = useMemo(() => {
    const a = data?.total_aum ?? 0
    const r = data?.monthly_revenue ?? 0
    const e = data?.monthly_expenses ?? 0
    const p = data?.pending_approvals_count ?? 0
    const c = (data as any)?.entity_count ?? 0
    return [
      { id:'aum', label:'Total Assets', value: a, unit:'$' },
      { id:'rev', label:'Monthly Revenue', value: r, unit:'$' },
      { id:'exp', label:'Monthly Expenses', value: e, unit:'$' },
      { id:'pending', label:'Pending Approvals', value: p },
      { id:'entities', label:'Entities', value: c },
    ]
  }, [data])

  const series = [{ date: new Date().toISOString().slice(0,10), value: active?.value ?? 0 }]

  return (
    <div className={`w-full border-b border-border ${className || ''}`}>
      <div className="relative overflow-hidden py-2">
        <div className="flex gap-4 whitespace-nowrap ticker-run" role="marquee" aria-label="Key metrics ticker">
          {items.map(m => (
            <MetricChip
              key={m.id}
              label={m.label}
              unit={m.unit}
              value={typeof m.value === 'number' && m.unit === '$' ? m.value.toLocaleString() : m.value}
              onClick={()=>{ setActive({ label: m.label, value: Number(m.value||0), unit: m.unit }); setOpen(true); }}
            />
          ))}
        </div>
      </div>
      {active && (
        <MetricModal open={open} onClose={()=>setOpen(false)} title={active.label} series={series} />
      )}
      <style jsx>{`
        @keyframes ngi-scroll-x {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-run { animation: ngi-scroll-x 30s linear infinite; }
        .ticker-run:hover, .ticker-run:focus-within { animation-play-state: paused; }
      `}</style>
    </div>
  )
}
