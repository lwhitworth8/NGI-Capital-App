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
import { HealthScoreModal } from '@/components/finance/HealthScoreModal'
import { motion } from 'framer-motion'
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
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

// Health Score Component
interface HealthScoreProps {
  score: number
  breakdown: { label: string; score: number }[]
}

function HealthScore({ score, breakdown, onClick }: HealthScoreProps & { onClick?: () => void }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-600 dark:text-green-400'
    if (s >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreStatus = (s: number) => {
    if (s >= 80) return 'Healthy'
    if (s >= 60) return 'Warning'
    return 'Critical'
  }

  return (
    <Card 
      className="p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.01]"
      onClick={onClick}
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Three-Statement Health Score</h3>
          <p className="text-sm text-muted-foreground">Overall financial health indicator • Click for details</p>
        </div>
        
        <div className="flex items-center justify-center">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted/20"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${score * 3.51} 351`}
                className={getScoreColor(score)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-3xl font-bold", getScoreColor(score))}>{score}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <Badge variant={score >= 80 ? 'default' : score >= 60 ? 'secondary' : 'destructive'}>
            {getScoreStatus(score)}
          </Badge>
        </div>

        <div className="space-y-3">
          {breakdown.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">{item.score}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    getScoreColor(item.score).replace('text-', 'bg-')
                  )}
                  style={{ width: `${item.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

// Unit Economics Component
interface UnitEconomicsProps {
  metrics: {
    cac: number
    ltv: number
    payback: number
    ndr: number
  }
}

function UnitEconomics({ metrics }: UnitEconomicsProps) {
  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Unit Economics (SaaS)</h3>
          <p className="text-sm text-muted-foreground">Customer acquisition and lifetime value</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">CAC</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold">${metrics.cac}</p>
              <p className="text-xs text-green-600 dark:text-green-400">↓ 12% good</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">LTV</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold">${metrics.ltv.toLocaleString()}</p>
              <p className="text-xs text-green-600 dark:text-green-400">↑ 8%</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">LTV/CAC</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold">{(metrics.ltv / metrics.cac).toFixed(1)}x</p>
              <p className="text-xs text-green-600 dark:text-green-400">✓ &gt; 3.0x</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Payback</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold">{metrics.payback} mo</p>
              <p className="text-xs text-green-600 dark:text-green-400">✓ &lt; 12 mo</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Net Dollar Retention</span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold">{metrics.ndr}%</span>
              <span className="text-xs text-green-600 dark:text-green-400">✓ &gt; 100%</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function FinanceDashboardTab() {
  const { state } = useApp()
  const entityId = useMemo(() => Number(state.currentEntity?.id || 0), [state.currentEntity])

  const [kpis, setKpis] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [healthScore, setHealthScore] = useState(87)
  const [selectedMetric, setSelectedMetric] = useState<{config: MetricConfig; value: number; prev?: number} | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [cashRunwayOpen, setCashRunwayOpen] = useState(false)
  const [healthScoreOpen, setHealthScoreOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!entityId) return
      try {
        setLoading(true)
        const f = await apiClient.request('GET', '/finance/cfo-kpis', undefined, { params: { entity_id: entityId } })
        if (!mounted) return
        setKpis(f)
        
        // Calculate health score
        const score = calculateHealthScore(f)
        setHealthScore(score)
      } finally { setLoading(false) }
    }
    load()
    return () => { mounted = false }
  }, [entityId])

  const calculateHealthScore = (kpis: any) => {
    if (!kpis) return 0
    
    let score = 0
    
    // Revenue growth (25% weight)
    if (kpis.revenue > 0) score += 25
    
    // Gross margin health (25% weight)
    if (kpis.gross_margin_pct > 50) {
      score += 25
    } else if (kpis.gross_margin_pct > 30) {
      score += 15
    } else if (kpis.gross_margin_pct > 0) {
      score += 10
    }
    
    // Runway health (25% weight)
    if (kpis.runway_months > 18) {
      score += 25
    } else if (kpis.runway_months > 12) {
      score += 20
    } else if (kpis.runway_months > 6) {
      score += 10
    }
    
    // Cash position (25% weight)
    if (kpis.cash > 100000) {
      score += 25
    } else if (kpis.cash > 50000) {
      score += 20
    } else if (kpis.cash > 0) {
      score += 10
    }
    
    return Math.round(score)
  }

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
      {/* Top Metrics - Clean 4-column grid */}
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
          label="EBITDA"
          value={loading ? '-' : formatCompact(0)}
          change={280}
          trend="up"
        />
        <MetricCard
          label="EBITDA Margin"
          value={loading ? '-' : `${Number(kpis?.gross_margin_pct || 0).toFixed(1)}%`}
          changeLabel="25.8%"
          trend="up"
          subtitle="vs industry"
        />
        <MetricCard
          label="Rule of 40"
          value="67%"
          changeLabel="✓ HEALTHY"
          trend="up"
        />
      </div>

      {/* Second Row Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Variable Costs"
          value={loading ? '-' : formatCompact(kpis?.variable_costs || 0)}
          change={-12}
          trend="down"
          subtitle="per month"
        />
        <MetricCard
          label="Fixed Costs"
          value={loading ? '-' : formatCompact(kpis?.fixed_costs || 0)}
          changeLabel="monthly"
          trend="neutral"
        />
        <MetricCard
          label="Contribution Margin"
          value={loading ? '-' : `${Number(kpis?.contribution_margin || 0).toFixed(1)}%`}
          changeLabel="✓ GOOD"
          trend="up"
        />
        <MetricCard
          label="Net Burn"
          value={loading ? '-' : formatCompact(kpis?.burn)}
          changeLabel="monthly"
          trend="down"
          subtitle="per month"
        />
      </div>

      {/* Detailed Analysis - 2 column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthScore
          score={healthScore}
          breakdown={[
            { label: 'P&L Quality', score: 92 },
            { label: 'Balance Sheet', score: 85 },
            { label: 'Cash Flow', score: 84 },
          ]}
          onClick={() => setHealthScoreOpen(true)}
        />

        <UnitEconomics
          metrics={{
            cac: 450,
            ltv: 12500,
            payback: 4.2,
            ndr: 115,
          }}
        />
      </div>

      {/* Cash Runway & Cap Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Cash Runway Widget */}
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

      {/* Cash Runway Modal */}
      <CashRunwayModal
        open={cashRunwayOpen}
        onClose={() => setCashRunwayOpen(false)}
        entityId={entityId}
        currentCash={kpis?.cash || 0}
        monthlyBurn={kpis?.burn || 0}
        runway={Number(kpis?.runway_months || 0)}
      />

      {/* Health Score Modal */}
      <HealthScoreModal
        open={healthScoreOpen}
        onClose={() => setHealthScoreOpen(false)}
        score={healthScore}
        breakdown={[
          { 
            label: 'Income Statement Quality', 
            score: 92,
            weight: 35,
            description: 'Revenue recognition, expense management, and profitability trends'
          },
          { 
            label: 'Balance Sheet Health', 
            score: 85,
            weight: 30,
            description: 'Asset composition, liability structure, and equity position'
          },
          { 
            label: 'Cash Flow Strength', 
            score: 84,
            weight: 35,
            description: 'Operating cash generation, capital allocation, and liquidity'
          },
        ]}
      />
    </motion.div>
  )
}
