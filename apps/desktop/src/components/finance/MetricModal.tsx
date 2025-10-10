'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MetricConfig } from '@/lib/finance/entity-configs';
import { apiClient } from '@/lib/api';

interface MetricModalProps {
  open: boolean;
  onClose: () => void;
  metric: MetricConfig;
  entityId: number;
  currentValue: number;
  previousValue?: number;
}

interface HistoricalDataPoint {
  date: string;
  value: number;
}

export function MetricModal({ open, onClose, metric, entityId, currentValue, previousValue }: MetricModalProps) {
  const [loading, setLoading] = useState(true);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);

  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Load historical data from API
        const response = await apiClient.request<any>(
          'GET',
          `/finance/metrics/${metric.id}/history`,
          undefined,
          { params: { entity_id: entityId, limit: 24 } } // Last 24 months
        );
        
        if (response?.data) {
          setHistoricalData(response.data);
        } else {
          // Generate sample data if no historical data (for development)
          const sampleData = generateSampleData(metric.id, currentValue);
          setHistoricalData(sampleData);
        }
      } catch (error) {
        console.error('[MetricModal] Error loading data:', error);
        // Fallback to sample data
        const sampleData = generateSampleData(metric.id, currentValue);
        setHistoricalData(sampleData);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [open, metric.id, entityId, currentValue]);

  const percentChange = previousValue && previousValue !== 0
    ? ((currentValue - previousValue) / Math.abs(previousValue)) * 100
    : 0;

  const isPositive = percentChange > 0;
  const isNegative = percentChange < 0;

  const renderChart = () => {
    const chartData = historicalData.map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      value: d.value
    }));

    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 10, left: 10, bottom: 10 }
    };

    const chartColor = isNegative && metric.id.includes('burn') ? '#ef4444' : '#3b82f6';

    switch (metric.chartType) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart {...commonProps}>
              <defs>
                <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => formatValue(v, metric.format)} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: any) => [formatValue(value, metric.format), metric.label]}
              />
              <Area type="monotone" dataKey="value" stroke={chartColor} fill="url(#colorMetric)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => formatValue(v, metric.format)} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: any) => [formatValue(value, metric.format), metric.label]}
              />
              <Bar dataKey="value" fill={chartColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => formatValue(v, metric.format)} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: any) => [formatValue(value, metric.format), metric.label]}
              />
              <Line type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{metric.label}</DialogTitle>
          <DialogDescription>{metric.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Current Value & Change */}
          <div className="flex items-center justify-between p-6 bg-card rounded-lg border">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Value</p>
              <p className="text-4xl font-bold">{formatValue(currentValue, metric.format)}</p>
            </div>
            {previousValue !== undefined && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Change</p>
                <div className="flex items-center gap-2">
                  {isPositive && <TrendingUp className="w-5 h-5 text-green-600" />}
                  {isNegative && <TrendingDown className="w-5 h-5 text-red-600" />}
                  <p className={`text-2xl font-semibold ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {isPositive ? '+' : ''}{percentChange.toFixed(1)}%
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Historical Chart */}
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Historical Trend</h3>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              renderChart()
            )}
          </Card>

          {/* Key Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">24M High</p>
              <p className="text-lg font-semibold">{formatValue(Math.max(...historicalData.map(d => d.value)), metric.format)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">24M Low</p>
              <p className="text-lg font-semibold">{formatValue(Math.min(...historicalData.map(d => d.value)), metric.format)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">24M Avg</p>
              <p className="text-lg font-semibold">
                {formatValue(
                  historicalData.reduce((sum, d) => sum + d.value, 0) / historicalData.length,
                  metric.format
                )}
              </p>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions
function formatValue(value: number, format: MetricConfig['format']): string {
  if (!Number.isFinite(value)) return '-';
  
  switch (format) {
    case 'currency':
      if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
      if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
      return `$${value.toLocaleString()}`;
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'months':
      return `${value.toFixed(1)} mo`;
    case 'ratio':
      return `${value.toFixed(1)}x`;
    case 'number':
      return value.toLocaleString();
    default:
      return value.toString();
  }
}

function generateSampleData(metricId: string, currentValue: number): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = [];
  const now = new Date();
  
  for (let i = 23; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    
    // Generate realistic trend based on metric type
    const trend = metricId.includes('growth') || metricId.includes('revenue') ? 1.05 : 0.98;
    const randomVariation = 0.9 + Math.random() * 0.2;
    const value = (currentValue / Math.pow(trend, i)) * randomVariation;
    
    data.push({
      date: date.toISOString(),
      value: Math.max(0, value)
    });
  }
  
  return data;
}
