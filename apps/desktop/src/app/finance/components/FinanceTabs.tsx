'use client';

import { lazy, Suspense } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const DashboardTab = lazy(() => import('../tabs/dashboard/page'))
const ForecastingTab = lazy(() => import('../tabs/forecasting/page'))
const InvestorsTab = lazy(() => import('../tabs/investors/page'))

interface FinanceTabsProps {
  activeView: string
  setActiveView: (view: string) => void
}

export function FinanceTabs({ activeView, setActiveView }: FinanceTabsProps) {
  return (
    <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
      <div className="mb-6 flex justify-center">
        <TabsList className="h-11 bg-muted/50">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-background px-6">
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="forecasting" className="data-[state=active]:bg-background px-6">
            Forecasting
          </TabsTrigger>
          <TabsTrigger value="investors" className="data-[state=active]:bg-background px-6">
            Investor Management
          </TabsTrigger>
        </TabsList>
      </div>
      
      <Suspense fallback={<div className="p-12 text-center text-sm text-muted-foreground">Loading…</div>}>
        <TabsContent value="dashboard" className="mt-0">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="forecasting" className="mt-0">
          <ForecastingTab />
        </TabsContent>
        <TabsContent value="investors" className="mt-0">
          <InvestorsTab />
        </TabsContent>
      </Suspense>
    </Tabs>
  )
}