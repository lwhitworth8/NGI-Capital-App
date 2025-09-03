'use client';

import React from 'react';

interface Props { entityId?: number }

export default function MarketMetrics({ entityId }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="font-semibold mb-2">Financial Market Metrics</h2>
      <p className="text-sm text-muted-foreground">No data available.</p>
    </div>
  );
}

