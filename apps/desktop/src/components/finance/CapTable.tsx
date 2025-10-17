'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { TrendingUp, Users, PieChart, ExternalLink } from 'lucide-react';

interface HolderRow {
  holder: string;
  shares: string;
  pctClass: string;
  pctFD: string;
  costBasis: string;
  asOf: string;
  notes?: string;
}

interface CapClass {
  name: string;
  series?: string;
  currency: string;
  holders: HolderRow[];
  totalShares?: number;
  ownershipPct?: number;
  color?: string;
}

interface CapSummary {
  fdShares: string;
  fdOwnershipPctByClass: { class: string; pct: string }[];
  totalValue?: number;
  lastUpdated?: string;
}

interface CapRounds { 
  name: string; 
  date: string; 
  preMoney: string; 
  postMoney: string; 
  newMoney: string;
  valuation?: number;
}

interface CapTableResponse {
  summary: CapSummary;
  classes: CapClass[];
  rounds: CapRounds[];
}

// Chart data interface
interface ChartDataPoint {
  period: string;
  [key: string]: string | number;
}

// Color palette for chart segments
const CHART_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
];

// Simple skeleton for cap table
function CapTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-40" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full">
          <div className="flex items-end justify-center h-full space-x-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center space-y-2">
                <Skeleton 
                  className="w-16 rounded-t cursor-pointer hover:opacity-80 transition-opacity" 
                  style={{ height: `${60 + i * 20}px` }}
                />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Custom tooltip for the chart
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-semibold text-foreground">{label}</p>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Amount: <span className="font-medium text-foreground">${data.value?.toLocaleString()}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Percentage: <span className="font-medium text-foreground">{data.percentage}%</span>
          </p>
          {data.items && data.items.length > 0 && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Components:</p>
              {data.items.slice(0, 3).map((item: any, idx: number) => (
                <p key={idx} className="text-xs text-muted-foreground">
                  • {item.name}: ${item.amount?.toLocaleString()}
                </p>
              ))}
              {data.items.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  ... and {data.items.length - 3} more
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}

export default function CapTable({ entityId }: { entityId?: number }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const json = await apiClient.request(
          'GET',
          '/finance/capital-structure',
          undefined,
          { params: entityId ? { entity_id: entityId } : {} },
        )
        setData(json)
      } catch (error) {
        // Silently handle errors - show skeleton for no data
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [entityId])

  // Prepare chart data for stacked column chart
  const chartData = useMemo(() => {
    if (!data?.structure || data.structure.length === 0) return [];
    
    // Group by type for stacked chart
    const groupedByType = data.structure.reduce((acc: any, item: any) => {
      if (!acc[item.type]) {
        acc[item.type] = {
          type: item.type,
          amount: 0,
          items: []
        };
      }
      acc[item.type].amount += item.amount;
      acc[item.type].items.push(item);
      return acc;
    }, {});
    
    return Object.values(groupedByType).map((group: any, index: number) => ({
      name: group.type,
      value: group.amount,
      percentage: data.total_capital > 0 ? ((group.amount / data.total_capital) * 100).toFixed(1) : 0,
      color: CHART_COLORS[index % CHART_COLORS.length],
      items: group.items
    }));
  }, [data]);

  const columns = useMemo(() => ([
    { key: 'name', label: 'Account Name' },
    { key: 'account_number', label: 'Account #' },
    { key: 'amount', label: 'Amount' },
    { key: 'percentage', label: '%' },
    { key: 'type', label: 'Type' },
    { key: 'description', label: 'Description' },
  ]), []);

  if (loading || !data || !data.structure || data.structure.length === 0) {
    return <CapTableSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Capital Structure Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Entity Type</p>
              <p className="text-2xl font-bold">{data?.entity_type || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Capital</p>
              <p className="text-2xl font-bold">
                ${data?.total_capital ? (data.total_capital / 1000000).toFixed(1) + 'M' : 'N/A'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Components</p>
              <p className="text-2xl font-bold">{data?.structure?.length || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart/Table Toggle */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Capital Structure
                    </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'chart' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('chart')}
              >
                <PieChart className="h-4 w-4 mr-2" />
                Chart
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <Users className="h-4 w-4 mr-2" />
                Table
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'chart' ? (
            <div className="h-64 w-full">
              {chartData && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="value" name="Amount ($)">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                      <PieChart className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-sm">No capital structure data available</p>
                    <p className="text-xs text-muted-foreground mt-1">Set up your Chart of Accounts to see capital structure</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {data.structure && data.structure.length > 0 ? (
                <DataTable
                  data={data.structure.map((item: any) => ({
                    ...item,
                    amount: `$${item.amount.toLocaleString()}`,
                    percentage: `${item.percentage}%`
                  }))}
                  columns={columns as any}
                  loading={false}
                  emptyText="No capital structure data"
                  pagination={false}
                />
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No capital structure data available
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


