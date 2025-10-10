'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface CashRunwayModalProps {
  open: boolean;
  onClose: () => void;
  entityId: number;
  currentCash: number;
  monthlyBurn: number;
  runway: number;
}

interface CashProjection {
  month: string;
  cash: number;
  burn: number;
}

export function CashRunwayModal({
  open,
  onClose,
  entityId,
  currentCash,
  monthlyBurn,
  runway,
}: CashRunwayModalProps) {
  const [projections, setProjections] = useState<CashProjection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;

    const loadProjections = async () => {
      setLoading(true);
      try {
        // Generate cash runway projections
        const data = generateCashProjections(currentCash, monthlyBurn, runway);
        setProjections(data);
      } catch (error) {
        console.error('[CashRunwayModal] Error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjections();
  }, [open, currentCash, monthlyBurn, runway]);

  const runwayStatus =
    runway > 18 ? 'healthy' : runway > 12 ? 'warning' : 'critical';
  const statusConfig = {
    healthy: {
      color: 'text-green-600',
      bg: 'bg-green-50',
      icon: CheckCircle,
      label: 'Healthy',
    },
    warning: {
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      icon: AlertTriangle,
      label: 'Monitor',
    },
    critical: {
      color: 'text-red-600',
      bg: 'bg-red-50',
      icon: AlertTriangle,
      label: 'Critical',
    },
  };

  const status = statusConfig[runwayStatus];
  const StatusIcon = status.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[90vw] max-h-[85vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <TrendingDown className="h-6 w-6" />
                Cash Runway Analysis
              </DialogTitle>
              <DialogDescription className="mt-2">
                Projected cash position and burn rate analysis
              </DialogDescription>
            </div>
            <Badge
              className={cn(
                'text-sm px-3 py-1',
                status.bg,
                status.color
              )}
              variant="outline"
            >
              <StatusIcon className="h-4 w-4 mr-1" />
              {status.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
          {/* Key Metrics */}
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Current Cash</p>
            <p className="text-2xl font-bold">${formatCurrency(currentCash)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Monthly Burn</p>
            <p className="text-2xl font-bold">${formatCurrency(monthlyBurn)}</p>
            <p className="text-xs text-muted-foreground mt-1">Average</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Runway</p>
            <p className="text-2xl font-bold">{runway.toFixed(1)} months</p>
            <p className="text-xs text-muted-foreground mt-1">At current burn rate</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Cash Projection Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Cash Position Forecast</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={projections}>
                <defs>
                  <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `$${formatCurrency(v)}`} />
                <Tooltip
                  formatter={(value: number) => [`$${formatCurrency(value)}`, 'Cash']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cash"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#cashGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

        </div>

        {/* Burn Rate Analysis */}
        <Card className="p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Burn Analysis</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={projections}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => `$${formatCurrency(v)}`} />
              <Tooltip
                formatter={(value: number) => [`$${formatCurrency(value)}`, 'Burn']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Line
                type="monotone"
                dataKey="burn"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: '#ef4444', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Action Items */}
        <Card className="p-6 mt-6 bg-muted/30">
          <h3 className="text-lg font-semibold mb-3">Recommended Actions</h3>
          <ul className="space-y-2 text-sm">
            {runway < 12 && (
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <span>Consider fundraising or revenue acceleration initiatives immediately</span>
              </li>
            )}
            {runway < 18 && (
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <span>Review and optimize operational expenses</span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Maintain detailed cash flow forecasting and update projections monthly</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Identify opportunities to extend runway through cost optimization</span>
            </li>
          </ul>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions
function generateCashProjections(
  currentCash: number,
  monthlyBurn: number,
  runway: number
): CashProjection[] {
  const projections: CashProjection[] = [];
  const now = new Date();
  
  const months = Math.min(Math.ceil(runway) + 3, 24);
  
  for (let i = 0; i < months; i++) {
    const date = new Date(now);
    date.setMonth(date.getMonth() + i);
    
    const cash = Math.max(0, currentCash - monthlyBurn * i);
    const burn = i === 0 ? monthlyBurn : monthlyBurn * (0.95 + Math.random() * 0.1);
    
    projections.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      cash,
      burn,
    });
  }
  
  return projections;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString();
}

function generateFallbackInsights(runway: number, burn: number, cash: number): string {
  if (runway < 6) {
    return `Critical runway situation detected. With ${runway.toFixed(1)} months of runway at a monthly burn of $${formatCurrency(burn)}, immediate action is required. Consider emergency cost-cutting measures, bridge financing, or revenue acceleration strategies.

Key Actions:
1. Prioritize fundraising or revenue generation immediately
2. Implement aggressive cost reduction measures
3. Explore emergency bridge financing options`;
  } else if (runway < 12) {
    return `Moderate runway of ${runway.toFixed(1)} months requires attention. Current cash position of $${formatCurrency(cash)} with monthly burn of $${formatCurrency(burn)} suggests proactive planning is needed.

Key Actions:
1. Begin fundraising preparation or sales pipeline acceleration
2. Review and optimize all discretionary spending
3. Establish monthly burn rate targets and monitoring`;
  } else {
    return `Healthy runway of ${runway.toFixed(1)} months provides strategic flexibility. Current trajectory shows sustainable burn rate relative to cash position.

Key Actions:
1. Maintain disciplined expense management
2. Continue monitoring key burn drivers monthly
3. Plan for future growth investments strategically`;
  }
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

