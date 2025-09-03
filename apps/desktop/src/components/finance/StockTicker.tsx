'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const MetricsTicker = dynamic(() => import('@/components/metrics/MetricsTicker'), { ssr: false });

export default function StockTicker() {
  return (
    <div className="rounded-xl border border-border bg-card p-0 overflow-hidden">
      <MetricsTicker className="w-full" />
    </div>
  );}

