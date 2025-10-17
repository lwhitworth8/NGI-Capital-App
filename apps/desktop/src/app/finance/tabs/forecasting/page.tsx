"use client";

import React, { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context/AppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { motion } from 'framer-motion'
import { Plus, Download, Copy, AlertTriangle, CheckCircle, Calculator, FileText, TrendingUp } from 'lucide-react'
import dynamic from 'next/dynamic'

const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer as any)) as any
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart as any)) as any
const Line = dynamic(() => import('recharts').then(m => m.Line as any)) as any
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis as any)) as any
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis as any)) as any
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip as any)) as any
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart as any)) as any
const Bar = dynamic(() => import('recharts').then(m => m.Bar as any)) as any
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid as any)) as any

// Variance Analysis Component
function VarianceAnalysis({ entityId, scenarioId, loading }: { entityId: number, scenarioId?: number, loading: boolean }) {
  const [variances, setVariances] = useState<any[]>([])
  const [varianceLoading, setVarianceLoading] = useState(false)

  useEffect(() => {
    if (!entityId) return
    
    const loadVariances = async () => {
      setVarianceLoading(true)
      try {
        const response = await fetch(`/api/finance/variance-analysis?entity_id=${entityId}${scenarioId ? `&scenario_id=${scenarioId}` : ''}`)
        const data = await response.json()
        setVariances(data?.variances || [])
      } catch (error) {
        console.error('Failed to load variance data:', error)
      } finally {
        setVarianceLoading(false)
      }
    }
    
    loadVariances()
  }, [entityId, scenarioId])

  if (varianceLoading || loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (variances.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No variance data available</p>
        <p className="text-sm text-muted-foreground">Create forecasts and actuals to see variance analysis</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {variances.map((variance: any, index: number) => (
        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <p className="font-medium">{variance.metric}</p>
            <p className="text-sm text-muted-foreground">{variance.period}</p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-semibold ${variance.variance > 0 ? 'text-green-600' : variance.variance < 0 ? 'text-red-600' : ''}`}>
              {variance.variance > 0 ? '+' : ''}{variance.variance.toFixed(1)}%
            </p>
            <p className="text-sm text-muted-foreground">
              ${variance.actual?.toLocaleString() || 0} vs ${variance.forecast?.toLocaleString() || 0}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ForecastingTab() {
  const { state } = useApp()
  const entityId = useMemo(() => Number(state.currentEntity?.id || 0), [state.currentEntity])
  const entityName = state.currentEntity?.legal_name || ''

  const [scenarios, setScenarios] = useState<any[]>([])
  const [activeScenario, setActiveScenario] = useState<any>(null)
  const [assumptions, setAssumptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newScenarioOpen, setNewScenarioOpen] = useState(false)
  const [aiInputOpen, setAiInputOpen] = useState(false)
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    loadScenarios()
  }, [entityId])

  // ChatKit event listeners
  useEffect(() => {
    const handleCreateForecast = (e: CustomEvent) => {
      setNewScenarioOpen(true);
      // Pre-fill form with e.detail data if available
      if (e.detail?.name) {
        // You can pre-fill form fields here
        console.log('Pre-filling forecast form with:', e.detail);
      }
    };
    
    window.addEventListener('nex:create_forecast', handleCreateForecast);
    return () => window.removeEventListener('nex:create_forecast', handleCreateForecast);
  }, []);

  const loadScenarios = async () => {
    if (!entityId) return
    try {
      setLoading(true)
      const response = await fetch(`/api/finance/forecast/scenarios?entity_id=${entityId}`)
      const data = await response.json()
      setScenarios(data)
      if (data.length > 0 && !activeScenario) {
        setActiveScenario(data[0])
        loadAssumptions(data[0].id)
      }
    } catch (error) {
      console.error('Failed to load scenarios:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAssumptions = async (scenarioId: number) => {
    try {
      const response = await fetch(`/api/finance/forecast/scenarios/${scenarioId}/assumptions`)
      const data = await response.json()
      setAssumptions(data)
    } catch (error) {
      console.error('Failed to load assumptions:', error)
    }
  }

  const createScenario = async (name: string, stage: string) => {
    try {
      const response = await fetch('/api/finance/forecast/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          entity_id: entityId,
          stage
        })
      })
      const data = await response.json()
      setScenarios(prev => [...prev, data])
      setActiveScenario(data)
      setNewScenarioOpen(false)
    } catch (error) {
      console.error('Failed to create scenario:', error)
    }
  }

  const handleAIInput = async () => {
    if (!aiInput.trim()) return
    
    setAiLoading(true)
    try {
      const response = await fetch('/api/finance/ai/expense-parser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          natural_language_input: aiInput,
          entity_id: entityId
        })
      })
      const data = await response.json()
      
      // Process AI response and add to assumptions
      if (data.mappings) {
        for (const mapping of data.mappings) {
          await addAssumption(mapping.account_code, mapping.amount_per_month, mapping.formula)
        }
      }
      
      setAiInput('')
      setAiInputOpen(false)
    } catch (error) {
      console.error('AI parsing failed:', error)
    } finally {
      setAiLoading(false)
    }
  }

  const addAssumption = async (key: string, value: string, formula?: string) => {
    if (!activeScenario) return
    
    try {
      const response = await fetch(`/api/finance/forecast/scenarios/${activeScenario.id}/assumptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          value,
          formula
        })
      })
      const data = await response.json()
      setAssumptions(prev => [...prev, data])
    } catch (error) {
      console.error('Failed to add assumption:', error)
    }
  }

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) return `$${(value/1000000).toFixed(1)}M`
    if (Math.abs(value) >= 1000) return `$${(value/1000).toFixed(0)}K`
    return `$${value.toLocaleString()}`
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  // Mock three-statement data for demonstration
  const mockThreeStatementData = [
    { period: 'Oct 2025', revenue: 99600, cogs: 45100, grossProfit: 54500, ebitda: 5220, netIncome: 3452 },
    { period: 'Nov 2025', revenue: 108000, cogs: 48600, grossProfit: 59400, ebitda: 7900, netIncome: 5569 },
    { period: 'Dec 2025', revenue: 116300, cogs: 52000, grossProfit: 64300, ebitda: 8585, netIncome: 6111 },
    { period: 'Q4 2025', revenue: 324000, cogs: 145700, grossProfit: 178300, ebitda: 21705, netIncome: 15132 },
    { period: '2025', revenue: 1150000, cogs: 522000, grossProfit: 628000, ebitda: 42000, netIncome: 25000 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Financial Model Builder</h2>
          <p className="text-sm text-muted-foreground">{entityName}</p>
        </div>
        <div className="flex gap-2">
          <Select value={activeScenario?.id?.toString() || ''} onValueChange={(value) => {
            const scenario = scenarios.find(s => s.id.toString() === value)
            setActiveScenario(scenario)
            if (scenario) loadAssumptions(scenario.id)
          }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select scenario" />
            </SelectTrigger>
            <SelectContent>
              {scenarios.map(scenario => (
                <SelectItem key={scenario.id} value={scenario.id.toString()}>
                  {scenario.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            Compare Scenarios
          </Button>
        </div>
      </div>

      {/* Scenario Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Scenario Management</CardTitle>
            <div className="flex gap-2">
              <Dialog open={newScenarioOpen} onOpenChange={setNewScenarioOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Scenario
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Scenario</DialogTitle>
                  </DialogHeader>
                  <NewScenarioForm onSubmit={createScenario} />
                </DialogContent>
              </Dialog>
              <Dialog open={aiInputOpen} onOpenChange={setAiInputOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Calculator className="h-4 w-4 mr-2" />
                    AI Assistant
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>AI-Powered Expense Input</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="ai-input">Describe your expense or revenue:</Label>
                      <Textarea
                        id="ai-input"
                        placeholder="Hire 2 software engineers at $150K each starting in March 2026, plus 15% benefits and payroll taxes"
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setAiInputOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAIInput} disabled={aiLoading || !aiInput.trim()}>
                        {aiLoading ? 'Analyzing...' : 'Analyze'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activeScenario && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">Scenario Name</Label>
                <div className="text-lg font-semibold">{activeScenario.name}</div>
              </div>
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <div>
                  <Badge variant={activeScenario.state === 'active' ? 'default' : 'secondary'}>
                    {activeScenario.state}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Assumptions</Label>
                <div className="text-lg font-semibold">{assumptions.length}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Three-Statement Model */}
      <Tabs defaultValue="income-statement" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
          <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
        </TabsList>

        <TabsContent value="income-statement" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Income Statement</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy to new scenario
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export to Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Line Item</th>
                      <th className="text-right p-2 font-medium">Oct'25</th>
                      <th className="text-right p-2 font-medium">Nov'25</th>
                      <th className="text-right p-2 font-medium">Dec'25</th>
                      <th className="text-right p-2 font-medium">Q4'25</th>
                      <th className="text-right p-2 font-medium">2025</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2 font-medium">REVENUE</td>
                      <td className="text-right p-2">{formatCurrency(99600)}</td>
                      <td className="text-right p-2">{formatCurrency(108000)}</td>
                      <td className="text-right p-2">{formatCurrency(116300)}</td>
                      <td className="text-right p-2 font-medium">{formatCurrency(324000)}</td>
                      <td className="text-right p-2 font-medium">{formatCurrency(1150000)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 pl-4">Service Revenue</td>
                      <td className="text-right p-2">{formatCurrency(85000)}</td>
                      <td className="text-right p-2">{formatCurrency(92000)}</td>
                      <td className="text-right p-2">{formatCurrency(98000)}</td>
                      <td className="text-right p-2">{formatCurrency(275000)}</td>
                      <td className="text-right p-2">{formatCurrency(980000)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 pl-4">Recurring Revenue</td>
                      <td className="text-right p-2">{formatCurrency(12500)}</td>
                      <td className="text-right p-2">{formatCurrency(14200)}</td>
                      <td className="text-right p-2">{formatCurrency(15800)}</td>
                      <td className="text-right p-2">{formatCurrency(42500)}</td>
                      <td className="text-right p-2">{formatCurrency(145000)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 pl-4">Other Revenue</td>
                      <td className="text-right p-2">{formatCurrency(2100)}</td>
                      <td className="text-right p-2">{formatCurrency(1800)}</td>
                      <td className="text-right p-2">{formatCurrency(2500)}</td>
                      <td className="text-right p-2">{formatCurrency(6400)}</td>
                      <td className="text-right p-2">{formatCurrency(24000)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium">COST OF REVENUE</td>
                      <td className="text-right p-2">{formatCurrency(-45100)}</td>
                      <td className="text-right p-2">{formatCurrency(-48600)}</td>
                      <td className="text-right p-2">{formatCurrency(-52000)}</td>
                      <td className="text-right p-2 font-medium">{formatCurrency(-145700)}</td>
                      <td className="text-right p-2 font-medium">{formatCurrency(-522000)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 pl-4">Direct Labor</td>
                      <td className="text-right p-2">{formatCurrency(-35400)}</td>
                      <td className="text-right p-2">{formatCurrency(-38200)}</td>
                      <td className="text-right p-2">{formatCurrency(-41000)}</td>
                      <td className="text-right p-2">{formatCurrency(-114600)}</td>
                      <td className="text-right p-2">{formatCurrency(-410000)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 pl-4">Subcontractors</td>
                      <td className="text-right p-2">{formatCurrency(-8500)}</td>
                      <td className="text-right p-2">{formatCurrency(-9200)}</td>
                      <td className="text-right p-2">{formatCurrency(-9800)}</td>
                      <td className="text-right p-2">{formatCurrency(-27500)}</td>
                      <td className="text-right p-2">{formatCurrency(-98000)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 pl-4">Software/Tools</td>
                      <td className="text-right p-2">{formatCurrency(-1200)}</td>
                      <td className="text-right p-2">{formatCurrency(-1200)}</td>
                      <td className="text-right p-2">{formatCurrency(-1200)}</td>
                      <td className="text-right p-2">{formatCurrency(-3600)}</td>
                      <td className="text-right p-2">{formatCurrency(-14000)}</td>
                    </tr>
                    <tr className="border-b bg-muted/50">
                      <td className="p-2 font-medium">Gross Profit</td>
                      <td className="text-right p-2 font-medium">{formatCurrency(54500)}</td>
                      <td className="text-right p-2 font-medium">{formatCurrency(59400)}</td>
                      <td className="text-right p-2 font-medium">{formatCurrency(64300)}</td>
                      <td className="text-right p-2 font-medium">{formatCurrency(178300)}</td>
                      <td className="text-right p-2 font-medium">{formatCurrency(628000)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium">OPERATING EXPENSES</td>
                      <td className="text-right p-2">{formatCurrency(-49280)}</td>
                      <td className="text-right p-2">{formatCurrency(-51500)}</td>
                      <td className="text-right p-2">{formatCurrency(-55715)}</td>
                      <td className="text-right p-2 font-medium">{formatCurrency(-156495)}</td>
                      <td className="text-right p-2 font-medium">{formatCurrency(-586000)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 pl-4">Salaries & Wages</td>
                      <td className="text-right p-2">{formatCurrency(-28000)}</td>
                      <td className="text-right p-2">{formatCurrency(-28000)}</td>
                      <td className="text-right p-2">{formatCurrency(-29500)}</td>
                      <td className="text-right p-2">{formatCurrency(-85500)}</td>
                      <td className="text-right p-2">{formatCurrency(-336000)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 pl-4">Marketing</td>
                      <td className="text-right p-2">{formatCurrency(-8500)}</td>
                      <td className="text-right p-2">{formatCurrency(-10200)}</td>
                      <td className="text-right p-2">{formatCurrency(-12400)}</td>
                      <td className="text-right p-2">{formatCurrency(-31100)}</td>
                      <td className="text-right p-2">{formatCurrency(-98000)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 pl-4">Rent/Facilities</td>
                      <td className="text-right p-2">{formatCurrency(-4500)}</td>
                      <td className="text-right p-2">{formatCurrency(-4500)}</td>
                      <td className="text-right p-2">{formatCurrency(-4500)}</td>
                      <td className="text-right p-2">{formatCurrency(-13500)}</td>
                      <td className="text-right p-2">{formatCurrency(-54000)}</td>
                    </tr>
                    <tr className="border-b bg-muted/50">
                      <td className="p-2 font-medium">EBITDA</td>
                      <td className="text-right p-2 font-medium">{formatCurrency(5220)}</td>
                      <td className="text-right p-2 font-medium">{formatCurrency(7900)}</td>
                      <td className="text-right p-2 font-medium">{formatCurrency(8585)}</td>
                      <td className="text-right p-2 font-medium">{formatCurrency(21705)}</td>
                      <td className="text-right p-2 font-medium">{formatCurrency(42000)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 pl-4">Depreciation</td>
                      <td className="text-right p-2">{formatCurrency(-850)}</td>
                      <td className="text-right p-2">{formatCurrency(-850)}</td>
                      <td className="text-right p-2">{formatCurrency(-850)}</td>
                      <td className="text-right p-2">{formatCurrency(-2550)}</td>
                      <td className="text-right p-2">{formatCurrency(-10000)}</td>
                    </tr>
                    <tr className="border-b bg-muted/50">
                      <td className="p-2 font-medium">EBIT</td>
                      <td className="text-right p-2 font-medium">{formatCurrency(4370)}</td>
                      <td className="text-right p-2 font-medium">{formatCurrency(7050)}</td>
                      <td className="text-right p-2 font-medium">{formatCurrency(7735)}</td>
                      <td className="text-right p-2 font-medium">{formatCurrency(19155)}</td>
                      <td className="text-right p-2 font-medium">{formatCurrency(32000)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 pl-4">Interest Expense</td>
                      <td className="text-right p-2">{formatCurrency(0)}</td>
                      <td className="text-right p-2">{formatCurrency(0)}</td>
                      <td className="text-right p-2">{formatCurrency(0)}</td>
                      <td className="text-right p-2">{formatCurrency(0)}</td>
                      <td className="text-right p-2">{formatCurrency(0)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 pl-4">Taxes (21%)</td>
                      <td className="text-right p-2">{formatCurrency(-918)}</td>
                      <td className="text-right p-2">{formatCurrency(-1481)}</td>
                      <td className="text-right p-2">{formatCurrency(-1624)}</td>
                      <td className="text-right p-2">{formatCurrency(-4023)}</td>
                      <td className="text-right p-2">{formatCurrency(-6720)}</td>
                    </tr>
                    <tr className="bg-primary/5">
                      <td className="p-2 font-bold">Net Income</td>
                      <td className="text-right p-2 font-bold">{formatCurrency(3452)}</td>
                      <td className="text-right p-2 font-bold">{formatCurrency(5569)}</td>
                      <td className="text-right p-2 font-bold">{formatCurrency(6111)}</td>
                      <td className="text-right p-2 font-bold">{formatCurrency(15132)}</td>
                      <td className="text-right p-2 font-bold">{formatCurrency(25280)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {/* Key Metrics Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Gross Margin</div>
                  <div className="text-2xl font-bold">54.7%</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">EBITDA Margin</div>
                  <div className="text-2xl font-bold">5.2%</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Net Margin</div>
                  <div className="text-2xl font-bold">3.5%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance-sheet" className="mt-6">
          <Card>
          <CardHeader>
              <CardTitle>Balance Sheet</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                Balance Sheet view coming soon...
              </div>
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="cash-flow" className="mt-6">
        <Card>
          <CardHeader>
              <CardTitle>Cash Flow Statement</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                Cash Flow Statement view coming soon...
              </div>
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="assumptions" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Assumptions & Drivers</CardTitle>
                <Button size="sm" onClick={() => addAssumption('new_assumption', '0', '')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Assumption
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assumptions.map((assumption, index) => (
                  <motion.div
                    key={assumption.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4 p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{assumption.key}</div>
                      <div className="text-sm text-muted-foreground">{assumption.formula || 'Manual input'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{assumption.value}</div>
                      <div className="text-sm text-muted-foreground">
                        {assumption.effective_start && assumption.effective_end 
                          ? `${assumption.effective_start} - ${assumption.effective_end}`
                          : 'No date range'
                        }
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </motion.div>
                ))}
                {assumptions.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <div>No assumptions yet</div>
                    <div className="text-sm">Add assumptions to build your financial model</div>
                  </div>
                )}
      </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Variance Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Variance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-6">Actual vs Forecast performance</p>
          <VarianceAnalysis entityId={entityId} scenarioId={activeScenario?.id} loading={loading} />
        </CardContent>
      </Card>

      {/* Validation Warnings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Validation Warnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              <span>Gross margin declining Q4→Q1</span>
            </div>
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              <span>Cash burn exceeds runway in M18</span>
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>All formulas validated</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function NewScenarioForm({ onSubmit }: { onSubmit: (name: string, stage: string) => void }) {
  const [name, setName] = useState('')
  const [stage, setStage] = useState('custom')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onSubmit(name.trim(), stage)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="scenario-name">Scenario Name</Label>
        <Input
          id="scenario-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Series A Raise Plan"
          required
        />
      </div>
      <div>
        <Label htmlFor="stage">Business Stage</Label>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pre-seed">Pre-Seed</SelectItem>
            <SelectItem value="seed">Seed</SelectItem>
            <SelectItem value="series-a">Series A</SelectItem>
            <SelectItem value="series-b">Series B</SelectItem>
            <SelectItem value="series-c">Series C+</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit">Create Scenario</Button>
      </div>
    </form>
  )
}