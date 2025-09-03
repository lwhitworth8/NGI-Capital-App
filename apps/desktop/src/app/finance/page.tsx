'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/lib/context/AppContext';
import MarketTicker from '@/components/finance/MarketTicker';
import FinanceKPICards from '@/components/finance/FinanceKPICards';
import CapTableChart from '@/components/finance/CapTableChart';
import EntitySelectorInline from '@/components/finance/EntitySelectorInline';
import ForecastTool from '@/components/finance/ForecastTool';
import Link from 'next/link';

export default function FinanceDashboardPage() {
  const { state } = useApp();
  const entityId = useMemo(() => Number(state.currentEntity?.id || 0), [state.currentEntity]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Finance Dashboard</h1>

      {/* Top: NASDAQ-style live ticker flush with content edges */}
      <div className="-mx-6">
        <MarketTicker />
      </div>

      {/* Entity selector inline */}
      <EntitySelectorInline />

      {/* Row 2: Finance KPIs + Capital Table chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <FinanceKPICards entityId={entityId} />
        </div>
        <CapTableChart entityId={entityId} />
      </div>

      {/* Forecasting Tool */}
      <ForecastTool entityId={entityId} />
    </div>
  );
}
