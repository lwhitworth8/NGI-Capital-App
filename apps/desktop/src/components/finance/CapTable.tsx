'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { apiClient } from '@/lib/api';

interface HolderRow {
  holder: string;
  shares: string;
  pctClass: string;
  pctFD: string;
  costBasis: string;
  asOf: string;
  notes?: string;
}

interface CapClass {
  name: string;
  series?: string;
  currency: string;
  holders: HolderRow[];
}

interface CapSummary {
  fdShares: string;
  fdOwnershipPctByClass: { class: string; pct: string }[];
}

interface CapRounds { name: string; date: string; preMoney: string; postMoney: string; newMoney: string }

interface CapTableResponse {
  summary: CapSummary;
  classes: CapClass[];
  rounds: CapRounds[];
}

export default function CapTable({ entityId }: { entityId?: number }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CapTableResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const json = await apiClient.request<CapTableResponse>(
          'GET',
          '/investor-relations/cap-table',
          undefined,
          { params: entityId ? { entity_id: entityId } : {} },
        )
        setData(json)
      } catch {
        setData({ summary: { fdShares: '', fdOwnershipPctByClass: [] }, classes: [], rounds: [] })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [entityId])

  const columns = useMemo(() => ([
    { key: 'holder', label: 'Holder' },
    { key: 'shares', label: 'Shares' },
    { key: 'pctClass', label: '% Class' },
    { key: 'pctFD', label: '% FD' },
    { key: 'costBasis', label: 'Cost Basis' },
    { key: 'asOf', label: 'As Of' },
    { key: 'notes', label: 'Notes' },
  ]), []);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold mb-1">Summary</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="text-sm text-muted-foreground">FD Shares: {data?.summary?.fdShares || '-'}</div>
        )}
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : (
        (data?.classes || []).map((cls, idx) => (
          <div key={idx} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">{cls.name}{cls.series ? ` ${cls.series}` : ''}</div>
              <div className="text-xs text-muted-foreground">Currency: {cls.currency}</div>
            </div>
            <DataTable<HolderRow>
              data={cls.holders || []}
              columns={columns as any}
              loading={false}
              emptyText="No holders"
              pagination={true}
            />
          </div>
        ))
      )}
    </div>
  );
}


