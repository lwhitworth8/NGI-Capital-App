"use client";

import React, { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import GrossMarginTrend from './GrossMarginTrend'
import ExpensesBreakdown from './ExpensesBreakdown'

export default function CFOKPICards({ entityId }: { entityId?: number }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const d = await apiClient.request<any>('GET', '/finance/cfo-kpis', undefined, { params: entityId ? { entity_id: entityId } : {} })
        if (!mounted) return
        setData(d)
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [entityId])

  const items = [
    { label: 'Revenue (MTD)', key: 'revenue', fmt: (v:any)=> `$${Number(v||0).toLocaleString()}` },
    { label: 'COGS (MTD)', key: 'cogs', fmt: (v:any)=> `$${Number(v||0).toLocaleString()}` },
    { label: 'Gross Margin', key: 'gross_margin', fmt: (v:any)=> `$${Number(v||0).toLocaleString()}` },
    { label: 'GM %', key: 'gross_margin_pct', fmt: (v:any)=> `${Number(v||0).toFixed(1)}%` },
    { label: 'Fixed Costs', key: 'expenses_fixed', fmt: (v:any)=> `$${Number(v||0).toLocaleString()}` },
    { label: 'Variable Costs', key: 'expenses_variable', fmt: (v:any)=> `$${Number(v||0).toLocaleString()}` },
    { label: 'Burn (approx)', key: 'burn', fmt: (v:any)=> `$${Number(v||0).toLocaleString()}` },
    { label: 'Cash', key: 'cash', fmt: (v:any)=> `$${Number(v||0).toLocaleString()}` },
    { label: 'Runway (mo)', key: 'runway_months', fmt: (v:any)=> `${Number(v||0).toFixed(1)}` },
    { label: 'A/R', key: 'ar_balance', fmt: (v:any)=> `$${Number(v||0).toLocaleString()}` },
    { label: 'A/P', key: 'ap_balance', fmt: (v:any)=> `$${Number(v||0).toLocaleString()}` },
  ]

  const advisoryItems = [
    { label: 'Utilization', key: 'utilization_pct', fmt: (v:any)=> `${Number(v||0).toFixed(1)}%` },
    { label: 'Billable Mix', key: 'billable_mix_pct', fmt: (v:any)=> `${Number(v||0).toFixed(1)}%` },
  ]

  const openDetail = (key: string) => {
    setSelectedKey(prev => (prev === key ? null : key))
  }

  const detailView = () => {
    if (!selectedKey) return null
    if (['revenue','cogs','gross_margin','gross_margin_pct'].includes(selectedKey)) {
      const map: any = { revenue:'revenue', cogs:'cogs', gross_margin:'gm', gross_margin_pct:'gm' }
      return <GrossMarginTrend entityId={entityId} highlight={map[selectedKey]} />
    }
    if (['expenses_fixed','expenses_variable'].includes(selectedKey)) {
      return <ExpensesBreakdown entityId={entityId} />
    }
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Detailed trend coming soon.
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((it, idx) => (
          <motion.div
            key={idx}
            role="button"
            tabIndex={0}
            onClick={() => openDetail(it.key)}
            onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' ') openDetail(it.key) }}
            className={`ngi-card-elevated p-4 relative overflow-hidden ${selectedKey===it.key ? 'ring-2 ring-primary' : ''}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            whileHover={{ scale: 1.01 }}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
            <div className="text-xs text-muted-foreground">{it.label}</div>
            <div className="text-2xl font-semibold tabular-nums relative">
              {loading ? '-' : it.fmt?.(data?.[it.key]) ?? '-'}
            </div>
          </motion.div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        {advisoryItems.map((it, idx) => (
          <motion.div
            key={idx}
            role="button"
            tabIndex={0}
            onClick={() => openDetail(`advisory.${it.key}`)}
            onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' ') openDetail(`advisory.${it.key}`) }}
            className={`ngi-card-elevated p-4 ${selectedKey===('advisory.'+it.key) ? 'ring-2 ring-primary' : ''}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + idx * 0.05 }}
            whileHover={{ scale: 1.01 }}
          >
            <div className="text-xs text-muted-foreground">{it.label}</div>
            <div className="text-xl font-semibold tabular-nums">
              {loading ? '-' : it.fmt?.(data?.advisory?.[it.key]) ?? '-'}
            </div>
          </motion.div>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {selectedKey && (
          <motion.div
            key={selectedKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mt-4"
          >
            {detailView()}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
