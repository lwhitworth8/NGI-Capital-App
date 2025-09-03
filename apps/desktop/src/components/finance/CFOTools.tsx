'use client';

import React from 'react';

interface Props { entityId?: number }

export default function CFOTools({ entityId }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="font-semibold mb-2">CFO Suite</h2>
      <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
        <li>Cash planning — no data</li>
        <li>Scenario modeling — no data</li>
        <li>Forecasts — no data</li>
      </ul>
    </div>
  );
}

