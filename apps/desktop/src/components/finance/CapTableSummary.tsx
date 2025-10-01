'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

interface ClassItem { name: string; series?: string; currency?: string; holders?: any[] }
interface Summary { fdShares?: string; fdOwnershipPctByClass?: { class: string; pct: string }[]; optionPool?: string }

export default function CapTableSummary({ entityId }: { entityId?: number }) {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [classes, setClasses] = useState<ClassItem[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const j = await apiClient.request<any>(
          'GET',
          '/investor-relations/cap-table',
          undefined,
          { params: entityId ? { entity_id: entityId } : {} },
        )
        setSummary(j?.summary || null)
        setClasses(Array.isArray(j?.classes) ? j.classes : [])
      } catch {
        setSummary(null)
        setClasses([])
      } finally { setLoading(false) }
    }
    load()
  }, [entityId])

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">Cap Table Summary</h2>
        <a href="/finance" className="text-sm text-blue-600 hover:underline">Open detailed equity ?</a>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="text-sm text-muted-foreground space-y-2">
          <div>FD Shares: <span className="text-foreground font-medium">{summary?.fdShares || '-'}</span></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {classes.slice(0,4).map((c, i) => (
              <div key={i} className="flex items-center justify-between">
                <span>{c.name}{c.series ? ` ${c.series}` : ''}</span>
                <span className="text-foreground font-medium">{c?.holders?.length || 0} holders</span>
              </div>
            ))}
          </div>
          <div className="text-xs">Option Pool: {summary?.optionPool || '-'}</div>
        </div>
      )}
    </div>
  )
}
