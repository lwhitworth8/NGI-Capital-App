"use client";

import React, { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context/AppContext'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/lib/api'
import CapTable from '@/components/finance/CapTable'
import { MetricModal } from '@/components/finance/MetricModal'
import { DateRangeSelector } from '@/components/finance/DateRangeSelector'
import { CashRunwayModal } from '@/components/finance/CashRunwayModal'
import FinanceRatiosModal from '@/components/finance/FinanceRatiosModal'
import { motion } from 'framer-motion'
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnimatedText } from '@ngi/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { MetricConfig } from '@/lib/finance/entity-configs'
import type { DateRange } from 'react-day-picker'

// Modern Metric Card Component - Clean Design
interface MetricCardProps {
  label: string
  value: string | number
  change?: number
  changeLabel?: string
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  className?: string
  onClick?: () => void
}

function MetricCard({ label, value, change, changeLabel, subtitle, trend, className, onClick }: MetricCardProps) {
  const getTrendColor = () => {
    if (!trend) return 'text-muted-foreground'
    if (trend === 'up') return 'text-green-600 dark:text-green-400'
    if (trend === 'down') return 'text-red-600 dark:text-red-400'
    return 'text-muted-foreground'
  }

  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : null

  return (
    <Card 
      className={cn(
        "p-6 hover:shadow-md transition-all duration-200", 
        onClick && "cursor-pointer hover:border-primary/50",
        className
      )}
      onClick={onClick}
    >
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="flex items-baseline justify-between">
          <h3 className="text-3xl font-semibold tracking-tight">{value}</h3>
          {(change !== undefined || changeLabel) && (
            <div className={cn("flex items-center gap-1 text-sm font-medium", getTrendColor())}>
              {TrendIcon && <TrendIcon className="h-4 w-4" />}
              <span>{changeLabel || `${change > 0 ? '+' : ''}${change}%`}</span>
            </div>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </Card>
  )
}





export default function FinanceDashboardTab() {
  const { state } = useApp()
  const entityId = useMemo(() => Number(state.currentEntity?.id || 0), [state.currentEntity])
  const entityType = state.currentEntity?.entity_type || 'LLC'

  const [kpis, setKpis] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState<{config: MetricConfig; value: number; prev?: number} | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [cashRunwayOpen, setCashRunwayOpen] = useState(false)
  const [cogsAnalysisOpen, setCogsAnalysisOpen] = useState(false)
  const [workingCapitalData, setWorkingCapitalData] = useState<any | null>(null)
  const [liquidityData, setLiquidityData] = useState<any | null>(null)
  const [efficiencyData, setEfficiencyData] = useState<any | null>(null)
  const [ratiosModalOpen, setRatiosModalOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!entityId) return
      try {
        setLoading(true)
        
        // Load all financial data in parallel
        const [cfoKpis, workingCapital, liquidity, efficiency] = await Promise.all([
          apiClient.request('GET', '/finance/cfo-kpis', undefined, { params: { entity_id: entityId } }),
          apiClient.request('GET', '/finance/working-capital', undefined, { params: { entity_id: entityId } }).catch(() => null),
          apiClient.request('GET', '/finance/liquidity-ratios', undefined, { params: { entity_id: entityId } }).catch(() => null),
          apiClient.request('GET', '/finance/efficiency-ratios', undefined, { params: { entity_id: entityId } }).catch(() => null)
        ])
        
        if (!mounted) return
        
        setKpis(cfoKpis)
        setWorkingCapitalData(workingCapital)
        setLiquidityData(liquidity)
        setEfficiencyData(efficiency)
      } finally { setLoading(false) }
    }
    load()
    return () => { mounted = false }
  }, [entityId])


  const formatCompact = (n: any) => {
    const num = Number(n||0)
    if (num >= 1000000) return `$${(num/1000000).toFixed(1)}M`
    if (num >= 1000) return `$${(num/1000).toFixed(0)}K`
    return `$${num.toLocaleString()}`
  }

  const fmt = (n: any) => `$${Number(n||0).toLocaleString()}`
  const pct = (n: any) => `${Number(n||0).toFixed(1)}%`

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Core Financial Metrics - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Revenue (TTM)"
          value={loading ? '-' : formatCompact(kpis?.revenue)}
          change={145}
          trend="up"
          subtitle="Last 12 months"
          onClick={() => setSelectedMetric({
            config: {
              id: 'revenue_ttm',
              label: 'Revenue (TTM)',
              apiField: 'revenue',
              format: 'currency',
              description: 'Total revenue over the trailing twelve months',
              hasHistory: true,
              chartType: 'area'
            },
            value: kpis?.revenue || 0,
            prev: kpis?.revenue_prev
          })}
        />
        <MetricCard
          label="Cost of Revenue"
          value={loading ? '-' : formatCompact(kpis?.cogs)}
          change={-8}
          trend="down"
          subtitle={`${Number(kpis?.gross_margin_pct || 0).toFixed(1)}% margin`}
          onClick={() => setCogsAnalysisOpen(true)}
        />
        <MetricCard
          label="EBITDA"
          value={loading ? '-' : formatCompact(kpis?.ebitda || 0)}
          change={280}
          trend="up"
          subtitle={`${Number(kpis?.ebitda_margin || 0).toFixed(1)}% margin`}
        />
        <MetricCard
          label="Free Cash Flow"
          value={loading ? '-' : formatCompact(kpis?.fcf || 0)}
          change={185}
          trend="up"
          subtitle="Operating cash flow"
        />
      </div>

      {/* Cash Runway, Cap Table, Financial Ratios - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card 
          className="p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.01]"
          onClick={() => setCashRunwayOpen(true)}
        >
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Cash Runway</h3>
              <p className="text-sm text-muted-foreground">Burn rate and runway analysis • Click for details</p>
            </div>
            <div className="space-y-6">
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">Runway Remaining</p>
                <p className="text-5xl font-bold">{loading ? '-' : `${Number(kpis?.runway_months || 0).toFixed(1)}`}</p>
                <p className="text-sm text-muted-foreground mt-1">months</p>
                <Badge 
                  variant={Number(kpis?.runway_months || 0) < 6 ? 'destructive' : 'default'} 
                  className="mt-3"
                >
                  {Number(kpis?.runway_months || 0) < 6 ? '⚠ LOW' : '✓ HEALTHY'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Current Cash</p>
                  <p className="text-xl font-semibold">{loading ? '-' : formatCompact(kpis?.cash)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Monthly Burn</p>
                  <p className="text-xl font-semibold">{loading ? '-' : formatCompact(kpis?.burn)}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Cap Table Widget */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Capitalization Table</h3>
              <p className="text-sm text-muted-foreground">Ownership structure</p>
            </div>
            <CapTable entityId={entityId} />
          </div>
        </Card>

        {/* Financial Ratios Widget */}
        <Card 
          className="p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.01]"
          onClick={() => setRatiosModalOpen(true)}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Financial Ratios
                </h3>
                <p className="text-sm text-muted-foreground">Key financial health metrics • Click for details</p>
              </div>
              <Badge variant="outline" className="text-xs">
                View All
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Current Ratio */}
              <div className="text-center p-2 border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Current Ratio</p>
                <p className="text-lg font-semibold">
                  {loading ? '-' : (liquidityData?.current_ratio || 0).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Target: 1.5-3.0</p>
              </div>
              
              {/* Quick Ratio */}
              <div className="text-center p-2 border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Quick Ratio</p>
                <p className="text-lg font-semibold">
                  {loading ? '-' : (liquidityData?.quick_ratio || 0).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Target: 1.0-2.0</p>
              </div>
              
              {/* ROE */}
              <div className="text-center p-2 border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">ROE</p>
                <p className="text-lg font-semibold">
                  {loading ? '-' : `${(efficiencyData?.roe || 0).toFixed(1)}%`}
                </p>
                <p className="text-xs text-muted-foreground">Target: &gt; 10%</p>
              </div>
              
              {/* ROA */}
              <div className="text-center p-2 border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">ROA</p>
                <p className="text-lg font-semibold">
                  {loading ? '-' : `${(efficiencyData?.roa || 0).toFixed(1)}%`}
                </p>
                <p className="text-xs text-muted-foreground">Target: &gt; 5%</p>
              </div>
              
              {/* DSO */}
              <div className="text-center p-2 border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">DSO</p>
                <p className="text-lg font-semibold">
                  {loading ? '-' : `${(workingCapitalData?.dso || 0).toFixed(0)}`}
                </p>
                <p className="text-xs text-muted-foreground">Target: &lt; 30</p>
              </div>
              
              {/* Working Capital */}
              <div className="text-center p-2 border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Working Cap</p>
                <p className="text-lg font-semibold">
                  {loading ? '-' : formatCompact(workingCapitalData?.working_capital || 0)}
                </p>
                <p className="text-xs text-muted-foreground">Assets - Liab</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Metric Detail Modal */}
      {selectedMetric && (
        <MetricModal
          open={!!selectedMetric}
          onClose={() => setSelectedMetric(null)}
          metric={selectedMetric.config}
          entityId={entityId}
          currentValue={selectedMetric.value}
          previousValue={selectedMetric.prev}
        />
      )}

      {/* COGS Analysis Modal */}
      <Dialog open={cogsAnalysisOpen} onOpenChange={setCogsAnalysisOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Cost of Revenue Analysis</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Fixed vs Variable Costs</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Fixed Costs</span>
                    <span className="font-medium">{loading ? '-' : formatCompact(kpis?.expenses_fixed || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Variable Costs</span>
                    <span className="font-medium">{loading ? '-' : formatCompact(kpis?.expenses_variable || 0)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total COGS</span>
                      <span>{loading ? '-' : formatCompact(kpis?.cogs || 0)}</span>
                    </div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Contribution Analysis</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Revenue</span>
                    <span className="font-medium">{loading ? '-' : formatCompact(kpis?.revenue || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">COGS</span>
                    <span className="font-medium">{loading ? '-' : formatCompact(kpis?.cogs || 0)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Gross Margin</span>
                      <span>{loading ? '-' : formatCompact(kpis?.gross_margin || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Margin %</span>
                      <span>{loading ? '-' : `${Number(kpis?.gross_margin_pct || 0).toFixed(1)}%`}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Cost Breakdown by Category</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Direct Labor</p>
                  <p className="text-lg font-semibold">{loading ? '-' : formatCompact(kpis?.direct_labor || 0)}</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Subcontractors</p>
                  <p className="text-lg font-semibold">{loading ? '-' : formatCompact(kpis?.subcontractors || 0)}</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Materials & Tools</p>
                  <p className="text-lg font-semibold">{loading ? '-' : formatCompact(kpis?.materials_tools || 0)}</p>
                </div>
              </div>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cash Runway Modal */}
      <CashRunwayModal
        open={cashRunwayOpen}
        onClose={() => setCashRunwayOpen(false)}
        entityId={entityId}
        currentCash={kpis?.cash || 0}
        monthlyBurn={kpis?.burn || 0}
        runway={Number(kpis?.runway_months || 0)}
      />

      {/* Financial Ratios Modal */}
      <FinanceRatiosModal
        open={ratiosModalOpen}
        onClose={() => setRatiosModalOpen(false)}
        entityId={entityId}
      />
    </motion.div>
  )
}
