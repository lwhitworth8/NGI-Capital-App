'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface HealthScoreModalProps {
  open: boolean;
  onClose: () => void;
  score: number;
  breakdown: Array<{
    label: string;
    score: number;
    weight?: number;
    description?: string;
  }>;
}

export function HealthScoreModal({ open, onClose, score, breakdown }: HealthScoreModalProps) {
  const scoreStatus = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor';
  
  const statusConfig = {
    excellent: {
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950/20',
      border: 'border-green-200 dark:border-green-800',
      icon: CheckCircle2,
      label: 'Excellent',
      description: 'Financial statements are in strong health',
    },
    good: {
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: Activity,
      label: 'Good',
      description: 'Financial health is solid with minor areas for improvement',
    },
    fair: {
      color: 'text-yellow-600',
      bg: 'bg-yellow-50 dark:bg-yellow-950/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: AlertCircle,
      label: 'Fair',
      description: 'Some financial concerns that need attention',
    },
    poor: {
      color: 'text-red-600',
      bg: 'bg-red-50 dark:bg-red-950/20',
      border: 'border-red-200 dark:border-red-800',
      icon: AlertCircle,
      label: 'Needs Attention',
      description: 'Significant financial issues require immediate action',
    },
  };

  const status = statusConfig[scoreStatus];
  const StatusIcon = status.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[85vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Activity className="h-6 w-6" />
                Three-Statement Health Score
              </DialogTitle>
              <DialogDescription className="mt-2">
                Comprehensive analysis of financial statement quality and business health
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Overall Score Card */}
        <Card className={cn('p-6 border-2', status.border, status.bg)}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <StatusIcon className={cn('h-8 w-8', status.color)} />
                <div>
                  <h3 className="text-2xl font-bold">{score}/100</h3>
                  <p className={cn('text-sm font-medium', status.color)}>{status.label}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{status.description}</p>
            </div>
            <div className="h-32 w-32 flex items-center justify-center">
              <div className="relative">
                <svg className="transform -rotate-90 w-32 h-32">
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
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - score / 100)}`}
                    className={cn(status.color, 'transition-all duration-1000')}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{score}%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Component Breakdown */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Score Breakdown</h3>
          <div className="space-y-4">
            {breakdown.map((item, index) => {
              const itemStatus = item.score >= 80 ? 'excellent' : item.score >= 60 ? 'good' : item.score >= 40 ? 'fair' : 'poor';
              const itemConfig = statusConfig[itemStatus];
              
              return (
                <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{item.label}</h4>
                        {item.weight && (
                          <Badge variant="secondary" className="text-xs">
                            {item.weight}% weight
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className={cn('text-2xl font-bold', itemConfig.color)}>
                        {item.score}
                      </p>
                      <p className="text-xs text-muted-foreground">/ 100</p>
                    </div>
                  </div>
                  <Progress value={item.score} className="h-2" />
                </Card>
              );
            })}
          </div>
        </div>

        {/* Methodology */}
        <Card className="mt-6 p-6 bg-muted/30">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-2">How is this calculated?</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  The Three-Statement Health Score analyzes the quality and consistency of your:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Income Statement:</strong> Revenue quality, margin sustainability, expense management</li>
                  <li><strong>Balance Sheet:</strong> Asset health, liability structure, equity composition</li>
                  <li><strong>Cash Flow Statement:</strong> Operating cash generation, investment efficiency, financing activities</li>
                </ul>
                <p className="mt-3">
                  Each component is weighted based on its importance to overall business health. The score considers:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Data completeness and accuracy</li>
                  <li>Period-over-period consistency</li>
                  <li>Key financial ratios and trends</li>
                  <li>Statement reconciliation and integrity</li>
                  <li>Industry benchmarks and best practices</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* Recommendations */}
        {score < 80 && (
          <Card className="mt-6 p-6 border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Recommendations for Improvement
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {breakdown
                .filter(item => item.score < 70)
                .map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-yellow-600 mt-0.5">•</span>
                    <span>
                      <strong>{item.label}:</strong> Focus on improving this area to boost overall financial health
                    </span>
                  </li>
                ))}
              {breakdown.every(item => item.score >= 70) && (
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600 mt-0.5">•</span>
                  <span>Continue monitoring financial metrics to maintain and improve your score</span>
                </li>
              )}
            </ul>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}

