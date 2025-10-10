'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import FinanceHeader from './components/FinanceHeader';
import { FinanceTabs } from './components/FinanceTabs';
import dynamic from 'next/dynamic';

const MarketTicker = dynamic(() => import('@/components/finance/MarketTicker'), { ssr: false });

export default function FinancePage() {
  const [activeView, setActiveView] = useState<'dashboard' | 'forecasting' | 'investors'>('dashboard');

  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-background relative">
        {/* Fixed header - stays on top */}
        <FinanceHeader activeView={activeView} setActiveView={setActiveView} />
        
        {/* Scrollable content area */}
        <div className="flex-1 overflow-auto">
          {/* Animated Market Ticker - scrolls with content */}
          <div className="border-b bg-card/30 backdrop-blur-sm py-2">
            <MarketTicker />
          </div>
          
          {/* Main content */}
          <div className="p-6">
            <FinanceTabs activeView={activeView} setActiveView={setActiveView} />
          </div>
        </div>
        
      </div>
    </AppLayout>
  );
}
