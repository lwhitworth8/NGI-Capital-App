"use client";

import React, { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context/AppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion } from 'framer-motion'
import { 
  Users, TrendingUp, DollarSign, Calendar, Target, 
  Plus, Search, Filter, Download, Eye, Edit, 
  CheckCircle, Clock, AlertCircle, XCircle
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { invGetKpis, invGetPipeline, invListRounds, invListContribs } from '@/lib/investors/api'

const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer as any)) as any
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart as any)) as any
const Line = dynamic(() => import('recharts').then(m => m.Line as any)) as any
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis as any)) as any
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis as any)) as any
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip as any)) as any
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart as any)) as any
const Bar = dynamic(() => import('recharts').then(m => m.Bar as any)) as any
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid as any)) as any

export default function FinanceInvestorsTab() {
  const { state } = useApp()
  const entityId = useMemo(() => Number(state.currentEntity?.id || 0), [state.currentEntity])
  const entityName = state.currentEntity?.legal_name || ''

  const [kpis, setKpis] = useState<any | null>(null)
  const [pipeline, setPipeline] = useState<any[]>([])
  const [rounds, setRounds] = useState<any[]>([])
  const [contribs, setContribs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('')
  const [selectedRoundId, setSelectedRoundId] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [entityId])

  const loadData = async () => {
    if (!entityId) return
    try {
      setLoading(true)
      const [kpisData, pipelineData, roundsData] = await Promise.all([
        invGetKpis(entityId),
        invGetPipeline(entityId),
        invListRounds(entityId)
      ])
      
      setKpis(kpisData)
      setPipeline(pipelineData)
      setRounds(roundsData)
      
      if (roundsData.length > 0) {
        setSelectedRoundId(roundsData[0].id)
        const contribsData = await invListContribs(roundsData[0].id)
        setContribs(contribsData)
      }
    } catch (error) {
      console.error('Failed to load investor data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) return `$${(value/1000000).toFixed(1)}M`
    if (Math.abs(value) >= 1000) return `$${(value/1000).toFixed(0)}K`
    return `$${value.toLocaleString()}`
  }

  const getStageColor = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'won': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'lost': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'prospect': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const getStageIcon = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'won': return <CheckCircle className="h-4 w-4" />
      case 'lost': return <XCircle className="h-4 w-4" />
      case 'in_progress': return <Clock className="h-4 w-4" />
      case 'prospect': return <AlertCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const filteredPipeline = pipeline.filter(investor => {
    const matchesSearch = !searchQuery || 
      investor.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      investor.firm?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStage = !stageFilter || stageFilter === 'all' || investor.stage === stageFilter
    return matchesSearch && matchesStage
  })

  const pipelineStages = [
    { id: 'prospect', name: 'Prospects', count: pipeline.filter(p => p.stage === 'prospect').length },
    { id: 'in_progress', name: 'In Progress', count: pipeline.filter(p => p.stage === 'in_progress').length },
    { id: 'won', name: 'Won', count: pipeline.filter(p => p.stage === 'won').length },
    { id: 'lost', name: 'Lost', count: pipeline.filter(p => p.stage === 'lost').length },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Investor Management</h2>
        <p className="text-sm text-muted-foreground">{entityName}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Investors"
          value={kpis?.total || 0}
          icon={Users}
          trend={12}
          trendLabel="↑ 12%"
          status="positive"
        />
        <MetricCard
          title="In Pipeline"
          value={kpis?.inPipeline || 0}
          icon={Target}
          trend={8}
          trendLabel="↑ 8"
          status="positive"
        />
        <MetricCard
          title="Won Deals"
          value={kpis?.won || 0}
          icon={CheckCircle}
          trend={3}
          trendLabel="↑ 3"
          status="positive"
        />
        <MetricCard
          title="Active (30d)"
          value={kpis?.activeThis30d || 0}
          icon={TrendingUp}
          trend={-2}
          trendLabel="↓ 2"
          status="negative"
        />
      </div>

      {/* Capital Raise Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Capital Raise Overview
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Round
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rounds Summary */}
            <div>
              <h3 className="font-medium mb-4">Funding Rounds</h3>
              <div className="space-y-3">
                {rounds.map((round, index) => (
                  <motion.div
                    key={round.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{round.roundType}</div>
                      <div className="text-sm text-muted-foreground">
                        Target: {formatCurrency(round.targetAmount)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(round.raisedAmount || 0)}</div>
                      <div className="text-sm text-muted-foreground">
                        {round.closeDate ? new Date(round.closeDate).toLocaleDateString() : 'TBD'}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {rounds.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <div>No funding rounds yet</div>
                    <div className="text-sm">Create your first round to get started</div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="font-medium mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {contribs.slice(0, 5).map((contrib, index) => (
                  <motion.div
                    key={contrib.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{contrib.investorName}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(contrib.amount)} • {contrib.status}
                      </div>
                    </div>
                    <Badge className={getStageColor(contrib.status)}>
                      {contrib.status}
                    </Badge>
                  </motion.div>
                ))}
                {contribs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <div>No recent activity</div>
                    <div className="text-sm">Investor contributions will appear here</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investor Pipeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Investor Pipeline
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search investors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages</SelectItem>
                  <SelectItem value="prospect">Prospects</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Investor
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="kanban" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="kanban">Kanban View</TabsTrigger>
              <TabsTrigger value="table">Table View</TabsTrigger>
            </TabsList>

            <TabsContent value="kanban" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {pipelineStages.map((stage) => (
                  <div key={stage.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{stage.name}</h3>
                      <Badge variant="secondary">{stage.count}</Badge>
                    </div>
                    <div className="space-y-2 min-h-[200px]">
                      {filteredPipeline
                        .filter(investor => investor.stage === stage.id)
                        .map((investor, index) => (
                          <motion.div
                            key={investor.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="p-3 border rounded-lg bg-card hover:shadow-md transition-shadow cursor-pointer"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="font-medium text-sm">{investor.name}</div>
                                <div className="text-xs text-muted-foreground">{investor.firm}</div>
                              </div>
                              <div className="flex items-center gap-1">
                                {getStageIcon(investor.stage)}
                              </div>
                            </div>
                            {investor.amount && (
                              <div className="text-sm font-medium text-primary">
                                {formatCurrency(investor.amount)}
                              </div>
                            )}
                            {investor.lastContact && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Last contact: {new Date(investor.lastContact).toLocaleDateString()}
                              </div>
                            )}
                            <div className="flex gap-1 mt-2">
                              <Button variant="ghost" size="sm" className="h-6 px-2">
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 px-2">
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="table" className="mt-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Investor</th>
                      <th className="text-left p-2 font-medium">Firm</th>
                      <th className="text-left p-2 font-medium">Stage</th>
                      <th className="text-right p-2 font-medium">Amount</th>
                      <th className="text-left p-2 font-medium">Last Contact</th>
                      <th className="text-center p-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPipeline.map((investor, index) => (
                      <motion.tr
                        key={investor.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="p-2">
                          <div className="font-medium">{investor.name}</div>
                        </td>
                        <td className="p-2 text-muted-foreground">{investor.firm}</td>
                        <td className="p-2">
                          <Badge className={getStageColor(investor.stage)}>
                            {investor.stage}
                          </Badge>
                        </td>
                        <td className="p-2 text-right font-medium">
                          {investor.amount ? formatCurrency(investor.amount) : '-'}
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {investor.lastContact ? new Date(investor.lastContact).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-2">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
                {filteredPipeline.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <div>No investors found</div>
                    <div className="text-sm">Try adjusting your search or filters</div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Investor Returns Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Investor Returns Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-4">Seed Investors (Jan 2025 → Present)</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <span className="text-sm">MOIC (Multiple on Invested Capital)</span>
                  <span className="font-medium text-green-600">1.27x</span>
                </div>
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <span className="text-sm">IRR (Internal Rate of Return)</span>
                  <span className="font-medium text-green-600">38.4%</span>
                </div>
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <span className="text-sm">Unrealized Gain</span>
                  <span className="font-medium text-green-600">$540K</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-4">Exit Scenario Modeling</h3>
              <div className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <div className="font-medium text-sm mb-2">IPO Scenario</div>
                  <div className="text-xs text-muted-foreground">
                    Target: $50M valuation • Expected return: 4.2x
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium text-sm mb-2">M&A Scenario</div>
                  <div className="text-xs text-muted-foreground">
                    Target: $30M valuation • Expected return: 2.5x
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium text-sm mb-2">Secondary Sale</div>
                  <div className="text-xs text-muted-foreground">
                    Target: $20M valuation • Expected return: 1.7x
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendLabel, 
  status 
}: { 
  title: string
  value: number
  icon: any
  trend: number
  trendLabel: string
  status: 'positive' | 'negative' | 'neutral'
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'positive': return 'text-green-600 dark:text-green-400'
      case 'negative': return 'text-red-600 dark:text-red-400'
      default: return 'text-muted-foreground'
    }
  }

  return (
    <motion.div
      className="ngi-card-elevated p-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.01 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{title}</span>
        </div>
        <Badge className={`${getStatusColor(status)} bg-transparent border-0 p-0 h-auto`}>
          {trendLabel}
        </Badge>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </motion.div>
  )
}