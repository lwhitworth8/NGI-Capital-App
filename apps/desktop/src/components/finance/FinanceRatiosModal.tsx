'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  Target, 
  BarChart3,
  Calculator,
  Activity,
  Zap,
  Shield,
  Download,
  RefreshCw
} from 'lucide-react';
import dynamic from 'next/dynamic';

const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer as any)) as any
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart as any)) as any
const Bar = dynamic(() => import('recharts').then(m => m.Bar as any)) as any
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis as any)) as any
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis as any)) as any
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip as any)) as any
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid as any)) as any

interface InvestmentMetricsModalProps {
  open: boolean;
  onClose: () => void;
  entityId: number;
}

interface RatioData {
  label: string;
  value: number;
  benchmark: string;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
  description: string;
  category: string;
}

interface WorkingCapitalData {
  dso: number;
  dpo: number;
  inventory_turnover: number;
  ccc: number;
  working_capital: number;
  wc_ratio: number;
}

interface LiquidityData {
  current_ratio: number;
  quick_ratio: number;
  cash_ratio: number;
  ocf_ratio: number;
}

interface EfficiencyData {
  asset_turnover: number;
  roa: number;
  roe: number;
  roic: number;
}

interface InvestmentMetrics {
  revenue: number;
  ebitda: number;
  fcf: number;
  rule_of_40: number;
  burn_multiple: number;
  ltv_cac_ratio: number;
  payback_period: number;
  quick_ratio: number;
}

// Status color mapping
const getStatusColor = (status: string) => {
  switch (status) {
    case 'excellent': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950';
    case 'good': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950';
    case 'warning': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950';
    case 'critical': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950';
    default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950';
  }
};

// Status icon mapping
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'excellent': return <TrendingUp className="h-4 w-4" />;
    case 'good': return <Target className="h-4 w-4" />;
    case 'warning': return <Clock className="h-4 w-4" />;
    case 'critical': return <TrendingDown className="h-4 w-4" />;
    default: return <Activity className="h-4 w-4" />;
  }
};

// Ratio Card Component
function RatioCard({ ratio }: { ratio: RatioData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 border rounded-lg hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-sm text-foreground">{ratio.label}</h4>
          <p className="text-xs text-muted-foreground mt-1">{ratio.description}</p>
        </div>
        <Badge className={`${getStatusColor(ratio.status)} border-0`}>
          {getStatusIcon(ratio.status)}
          <span className="ml-1 capitalize">{ratio.status}</span>
        </Badge>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold text-foreground">
            {ratio.value.toFixed(2)}
            {ratio.label.includes('Ratio') || ratio.label.includes('Turnover') ? 'x' : ''}
            {ratio.label.includes('RO') || ratio.label.includes('Margin') ? '%' : ''}
          </span>
          {ratio.trend && (
            <div className={`flex items-center gap-1 text-xs ${
              ratio.trend === 'up' ? 'text-green-600' : 
              ratio.trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {ratio.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : 
               ratio.trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
            </div>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          Target: {ratio.benchmark}
        </div>
      </div>
    </motion.div>
  );
}

// Main Financial Ratios Summary Component
function MainRatiosSummary({ 
  workingCapital, 
  liquidity, 
  efficiency, 
  investment, 
  loading 
}: { 
  workingCapital: WorkingCapitalData | null;
  liquidity: LiquidityData | null;
  efficiency: EfficiencyData | null;
  investment: InvestmentMetrics | null;
  loading: boolean;
}) {
  const mainRatios = [
    {
      label: "Current Ratio",
      value: liquidity?.current_ratio || 0,
      benchmark: "1.5-3.0",
      status: liquidity?.current_ratio >= 2.0 ? 'excellent' : liquidity?.current_ratio >= 1.5 ? 'good' : 'warning',
      description: "Short-term liquidity measure",
      category: "Liquidity"
    },
    {
      label: "Quick Ratio",
      value: liquidity?.quick_ratio || 0,
      benchmark: "1.0-2.0",
      status: liquidity?.quick_ratio >= 1.5 ? 'excellent' : liquidity?.quick_ratio >= 1.0 ? 'good' : 'warning',
      description: "Immediate liquidity without inventory",
      category: "Liquidity"
    },
    {
      label: "ROE",
      value: efficiency?.roe || 0,
      benchmark: "> 10%",
      status: efficiency?.roe >= 15 ? 'excellent' : efficiency?.roe >= 10 ? 'good' : 'warning',
      description: "Return on equity",
      category: "Efficiency"
    },
    {
      label: "ROA",
      value: efficiency?.roa || 0,
      benchmark: "> 5%",
      status: efficiency?.roa >= 8 ? 'excellent' : efficiency?.roa >= 5 ? 'good' : 'warning',
      description: "Return on assets",
      category: "Efficiency"
    },
    {
      label: "DSO",
      value: workingCapital?.dso || 0,
      benchmark: "< 30 days",
      status: workingCapital?.dso <= 20 ? 'excellent' : workingCapital?.dso <= 30 ? 'good' : 'warning',
      description: "Days sales outstanding",
      category: "Working Capital"
    },
    {
      label: "Rule of 40",
      value: investment?.rule_of_40 || 0,
      benchmark: "> 40",
      status: investment?.rule_of_40 >= 50 ? 'excellent' : investment?.rule_of_40 >= 40 ? 'good' : 'warning',
      description: "Growth + Profitability metric",
      category: "Investment"
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-4 border rounded-lg animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-6 bg-muted rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-muted rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  // Prepare chart data for the overview
  const chartData = mainRatios.map(ratio => ({
    name: ratio.label,
    value: ratio.value,
    benchmark: parseFloat(ratio.benchmark.split('-')[0]) || parseFloat(ratio.benchmark.replace(/[^\d.]/g, '')) || 0,
    status: ratio.status
  }));

  return (
    <div className="space-y-6">
      {/* Summary Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Key Ratios Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    `${value.toFixed(2)}${name === 'value' ? '' : ' (target)'}`,
                    name === 'value' ? 'Current' : 'Target'
                  ]}
                  labelFormatter={(label) => `Ratio: ${label}`}
                />
                <Bar dataKey="value" name="Current" fill="#3B82F6" />
                <Bar dataKey="benchmark" name="Target" fill="#E5E7EB" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Ratio Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mainRatios.map((ratio, index) => (
          <RatioCard key={index} ratio={ratio} />
        ))}
      </div>
    </div>
  );
}

// Working Capital Analysis Tab
function WorkingCapitalTab({ data, loading }: { data: WorkingCapitalData | null; loading: boolean }) {
  const ratios = [
    {
      label: "Days Sales Outstanding",
      value: data?.dso || 0,
      benchmark: "< 30 days",
      status: (data?.dso || 0) <= 20 ? 'excellent' : (data?.dso || 0) <= 30 ? 'good' : 'warning',
      description: "Average time to collect receivables",
      category: "Collection"
    },
    {
      label: "Days Payable Outstanding",
      value: data?.dpo || 0,
      benchmark: "> 30 days",
      status: (data?.dpo || 0) >= 45 ? 'excellent' : (data?.dpo || 0) >= 30 ? 'good' : 'warning',
      description: "Average time to pay suppliers",
      category: "Payment"
    },
    {
      label: "Inventory Turnover",
      value: data?.inventory_turnover || 0,
      benchmark: "> 6x",
      status: (data?.inventory_turnover || 0) >= 8 ? 'excellent' : (data?.inventory_turnover || 0) >= 6 ? 'good' : 'warning',
      description: "How quickly inventory is sold",
      category: "Inventory"
    },
    {
      label: "Cash Conversion Cycle",
      value: data?.ccc || 0,
      benchmark: "< 30 days",
      status: (data?.ccc || 0) <= 15 ? 'excellent' : (data?.ccc || 0) <= 30 ? 'good' : 'warning',
      description: "Time from cash out to cash in",
      category: "Efficiency"
    },
    {
      label: "Working Capital",
      value: data?.working_capital || 0,
      benchmark: "> $0",
      status: (data?.working_capital || 0) > 0 ? 'excellent' : 'critical',
      description: "Current assets minus current liabilities",
      category: "Liquidity"
    },
    {
      label: "Working Capital Ratio",
      value: data?.wc_ratio || 0,
      benchmark: "1.2-2.0x",
      status: (data?.wc_ratio || 0) >= 1.5 ? 'excellent' : (data?.wc_ratio || 0) >= 1.2 ? 'good' : 'warning',
      description: "Current assets to current liabilities",
      category: "Liquidity"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ratios.map((ratio, index) => (
          <RatioCard key={index} ratio={ratio} />
        ))}
      </div>
    </div>
  );
}

// Liquidity Ratios Tab
function LiquidityTab({ data, loading }: { data: LiquidityData | null; loading: boolean }) {
  const ratios = [
    {
      label: "Current Ratio",
      value: data?.current_ratio || 0,
      benchmark: "1.5-3.0x",
      status: (data?.current_ratio || 0) >= 2.5 ? 'excellent' : (data?.current_ratio || 0) >= 1.5 ? 'good' : 'warning',
      description: "Current assets to current liabilities",
      category: "Short-term"
    },
    {
      label: "Quick Ratio",
      value: data?.quick_ratio || 0,
      benchmark: "1.0-2.0x",
      status: (data?.quick_ratio || 0) >= 1.5 ? 'excellent' : (data?.quick_ratio || 0) >= 1.0 ? 'good' : 'warning',
      description: "Liquid assets to current liabilities",
      category: "Short-term"
    },
    {
      label: "Cash Ratio",
      value: data?.cash_ratio || 0,
      benchmark: "0.5-1.0x",
      status: (data?.cash_ratio || 0) >= 0.8 ? 'excellent' : (data?.cash_ratio || 0) >= 0.5 ? 'good' : 'warning',
      description: "Cash and equivalents to current liabilities",
      category: "Immediate"
    },
    {
      label: "Operating Cash Flow Ratio",
      value: data?.ocf_ratio || 0,
      benchmark: "> 0.1x",
      status: (data?.ocf_ratio || 0) >= 0.2 ? 'excellent' : (data?.ocf_ratio || 0) >= 0.1 ? 'good' : 'warning',
      description: "Operating cash flow to current liabilities",
      category: "Operating"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ratios.map((ratio, index) => (
          <RatioCard key={index} ratio={ratio} />
        ))}
      </div>
    </div>
  );
}

// Efficiency Ratios Tab
function EfficiencyTab({ data, loading }: { data: EfficiencyData | null; loading: boolean }) {
  const ratios = [
    {
      label: "Asset Turnover",
      value: data?.asset_turnover || 0,
      benchmark: "> 1.0x",
      status: (data?.asset_turnover || 0) >= 1.5 ? 'excellent' : (data?.asset_turnover || 0) >= 1.0 ? 'good' : 'warning',
      description: "Revenue generated per dollar of assets",
      category: "Asset Utilization"
    },
    {
      label: "Return on Assets (ROA)",
      value: data?.roa || 0,
      benchmark: "> 5%",
      status: (data?.roa || 0) >= 8 ? 'excellent' : (data?.roa || 0) >= 5 ? 'good' : 'warning',
      description: "Net income per dollar of assets",
      category: "Profitability"
    },
    {
      label: "Return on Equity (ROE)",
      value: data?.roe || 0,
      benchmark: "> 10%",
      status: (data?.roe || 0) >= 15 ? 'excellent' : (data?.roe || 0) >= 10 ? 'good' : 'warning',
      description: "Net income per dollar of equity",
      category: "Profitability"
    },
    {
      label: "Return on Invested Capital (ROIC)",
      value: data?.roic || 0,
      benchmark: "> 8%",
      status: (data?.roic || 0) >= 12 ? 'excellent' : (data?.roic || 0) >= 8 ? 'good' : 'warning',
      description: "Operating income per dollar of invested capital",
      category: "Profitability"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ratios.map((ratio, index) => (
          <RatioCard key={index} ratio={ratio} />
        ))}
      </div>
    </div>
  );
}

// Investment Metrics Tab
function InvestmentTab({ data, loading }: { data: InvestmentMetrics | null; loading: boolean }) {
  const ratios = [
    {
      label: "Rule of 40",
      value: data?.rule_of_40 || 0,
      benchmark: "> 40",
      status: (data?.rule_of_40 || 0) >= 50 ? 'excellent' : (data?.rule_of_40 || 0) >= 40 ? 'good' : 'warning',
      description: "Growth rate + EBITDA margin",
      category: "Growth"
    },
    {
      label: "Burn Multiple",
      value: data?.burn_multiple || 0,
      benchmark: "< 1.0x",
      status: (data?.burn_multiple || 0) <= 0.5 ? 'excellent' : (data?.burn_multiple || 0) <= 1.0 ? 'good' : 'warning',
      description: "Capital efficiency metric",
      category: "Efficiency"
    },
    {
      label: "LTV/CAC Ratio",
      value: data?.ltv_cac_ratio || 0,
      benchmark: "> 3.0x",
      status: (data?.ltv_cac_ratio || 0) >= 5 ? 'excellent' : (data?.ltv_cac_ratio || 0) >= 3 ? 'good' : 'warning',
      description: "Lifetime value to customer acquisition cost",
      category: "Unit Economics"
    },
    {
      label: "Payback Period",
      value: data?.payback_period || 0,
      benchmark: "< 12 months",
      status: (data?.payback_period || 0) <= 6 ? 'excellent' : (data?.payback_period || 0) <= 12 ? 'good' : 'warning',
      description: "Time to recover customer acquisition cost",
      category: "Unit Economics"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ratios.map((ratio, index) => (
          <RatioCard key={index} ratio={ratio} />
        ))}
      </div>
    </div>
  );
}

export default function InvestmentMetricsModal({ open, onClose, entityId }: InvestmentMetricsModalProps) {
  const [workingCapital, setWorkingCapital] = useState<WorkingCapitalData | null>(null);
  const [liquidity, setLiquidity] = useState<LiquidityData | null>(null);
  const [efficiency, setEfficiency] = useState<EfficiencyData | null>(null);
  const [investment, setInvestment] = useState<InvestmentMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !entityId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [wcData, liqData, effData, invData] = await Promise.all([
          fetch(`/api/finance/working-capital?entity_id=${entityId}`).then(r => r.json()),
          fetch(`/api/finance/liquidity-ratios?entity_id=${entityId}`).then(r => r.json()),
          fetch(`/api/finance/efficiency-ratios?entity_id=${entityId}`).then(r => r.json()),
          fetch(`/api/finance/metrics/ibanking?entity_id=${entityId}`).then(r => r.json())
        ]);

        setWorkingCapital(wcData);
        setLiquidity(liqData);
        setEfficiency(effData);
        setInvestment({
          revenue: invData.revenue?.ttm || 0,
          ebitda: invData.ebitda?.amount || 0,
          fcf: invData.fcf?.amount || 0,
          rule_of_40: invData.rule_of_40?.score || 0,
          burn_multiple: invData.burn_metrics?.burn_multiple || 0,
          ltv_cac_ratio: invData.unit_economics?.ltv_cac_ratio || 0,
          payback_period: invData.unit_economics?.payback_period_months || 0,
          quick_ratio: invData.liquidity?.quick_ratio || 0
        });
      } catch (error) {
        console.error('Failed to load financial ratios:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [open, entityId]);

  const handleRefresh = () => {
    if (entityId) {
      const loadData = async () => {
        setLoading(true);
        try {
          const [wcData, liqData, effData, invData] = await Promise.all([
            fetch(`/api/finance/working-capital?entity_id=${entityId}`).then(r => r.json()),
            fetch(`/api/finance/liquidity-ratios?entity_id=${entityId}`).then(r => r.json()),
            fetch(`/api/finance/efficiency-ratios?entity_id=${entityId}`).then(r => r.json()),
            fetch(`/api/finance/metrics/ibanking?entity_id=${entityId}`).then(r => r.json())
          ]);

          setWorkingCapital(wcData);
          setLiquidity(liqData);
          setEfficiency(effData);
          setInvestment({
            revenue: invData.revenue?.ttm || 0,
            ebitda: invData.ebitda?.amount || 0,
            fcf: invData.fcf?.amount || 0,
            rule_of_40: invData.rule_of_40?.score || 0,
            burn_multiple: invData.burn_metrics?.burn_multiple || 0,
            ltv_cac_ratio: invData.unit_economics?.ltv_cac_ratio || 0,
            payback_period: invData.unit_economics?.payback_period_months || 0,
            quick_ratio: invData.liquidity?.quick_ratio || 0
          });
        } catch (error) {
          console.error('Failed to refresh financial ratios:', error);
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[95vw] h-[90vh] max-h-[800px] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                Financial Ratios Analysis
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Comprehensive financial health metrics and performance indicators
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {/* TODO: Implement export */}}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 p-6 overflow-hidden">
          {/* Status Summary */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium">Excellent</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {workingCapital && liquidity && efficiency && investment ? 6 : 0}
              </p>
              <p className="text-xs text-muted-foreground">Ratios in excellent range</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium">Good</span>
              </div>
              <p className="text-2xl font-bold mt-1">4</p>
              <p className="text-xs text-muted-foreground">Ratios in good range</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm font-medium">Warning</span>
              </div>
              <p className="text-2xl font-bold mt-1">0</p>
              <p className="text-xs text-muted-foreground">Ratios need attention</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm font-medium">Critical</span>
              </div>
              <p className="text-2xl font-bold mt-1">0</p>
              <p className="text-xs text-muted-foreground">Ratios require immediate action</p>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="w-full h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="working-capital" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Working Capital
              </TabsTrigger>
              <TabsTrigger value="liquidity" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Liquidity
              </TabsTrigger>
              <TabsTrigger value="efficiency" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Efficiency
              </TabsTrigger>
              <TabsTrigger value="investment" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Investment
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto">
              <TabsContent value="overview" className="mt-0">
                <MainRatiosSummary 
                  workingCapital={workingCapital}
                  liquidity={liquidity}
                  efficiency={efficiency}
                  investment={investment}
                  loading={loading}
                />
              </TabsContent>

              <TabsContent value="working-capital" className="mt-0">
                <WorkingCapitalTab data={workingCapital} loading={loading} />
              </TabsContent>

              <TabsContent value="liquidity" className="mt-0">
                <LiquidityTab data={liquidity} loading={loading} />
              </TabsContent>

              <TabsContent value="efficiency" className="mt-0">
                <EfficiencyTab data={efficiency} loading={loading} />
              </TabsContent>

              <TabsContent value="investment" className="mt-0">
                <InvestmentTab data={investment} loading={loading} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
