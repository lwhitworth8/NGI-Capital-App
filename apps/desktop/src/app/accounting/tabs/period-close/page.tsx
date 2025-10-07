'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Archive,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
  Unlock,
  RefreshCw,
  FileBarChart,
  TrendingDown,
  DollarSign,
  FileText,
  PlayCircle,
  Clock
} from 'lucide-react';
import { useEntityContext } from '@/hooks/useEntityContext';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ClosePreview {
  total_je: number;
  unapproved_je: number;
  bank_unreconciled: number;
  docs_unposted: number;
  aging_ok: boolean;
  revrec_current_posted: boolean;
  bank_rec_finalized: boolean;
  tb_balanced: boolean;
  accruals_prepaids_dep_posted: boolean;
  can_close: boolean;
}

interface Period {
  id: number;
  entity_id: number;
  period_type: string;
  period_start: string;
  period_end: string;
  fiscal_year: number;
  period_status: string;
  is_closed: boolean;
  closed_by: string | null;
  closed_at: string | null;
}

export default function PeriodCloseTab() {
  const { selectedEntityId } = useEntityContext();
  const [preview, setPreview] = useState<ClosePreview | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    if (selectedEntityId) {
      fetchPreview();
      fetchPeriods();
    }
  }, [selectedEntityId, selectedYear, selectedMonth]);

  const fetchPreview = async () => {
    if (!selectedEntityId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/close/preview?entity_id=${selectedEntityId}&year=${selectedYear}&month=${selectedMonth}`
      );
      if (response.ok) {
        const data = await response.json();
        setPreview(data);
      }
    } catch (error) {
      console.error('Failed to fetch close preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriods = async () => {
    if (!selectedEntityId) return;
    try {
      const response = await fetch(
        `/api/accounting/period-close/periods?entity_id=${selectedEntityId}`
      );
      if (response.ok) {
        const data = await response.json();
        setPeriods(data.periods || []);
      }
    } catch (error) {
      console.error('Failed to fetch periods:', error);
    }
  };

  const handleClosePeriod = async () => {
    if (!selectedEntityId) return;
    
    setLoading(true);
    try {
      // First run depreciation
      await fetch(
        `/api/fixed-assets/depreciation/process-period?year=${selectedYear}&month=${selectedMonth}&entity_id=${selectedEntityId}`,
        { method: 'POST' }
      );

      // Then close the period
      const response = await fetch('/api/accounting/close/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: selectedEntityId,
          year: selectedYear,
          month: selectedMonth
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Period closed successfully!\n\nRetained Earnings JE: ${data.retained_earnings_je_id}\nFinancial Statements generated.`);
        setIsCloseModalOpen(false);
        fetchPreview();
        fetchPeriods();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Failed to close period:', error);
      alert('Failed to close period. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checklistItems = preview ? [
    {
      name: 'Journal Entries Approved',
      status: preview.unapproved_je === 0,
      details: preview.unapproved_je === 0 
        ? 'All journal entries approved' 
        : `${preview.unapproved_je} unapproved JEs`,
      icon: FileText
    },
    {
      name: 'Bank Reconciliation Complete',
      status: preview.bank_unreconciled === 0 && preview.bank_rec_finalized,
      details: preview.bank_unreconciled === 0 
        ? 'All transactions reconciled' 
        : `${preview.bank_unreconciled} unreconciled`,
      icon: DollarSign
    },
    {
      name: 'Documents Posted',
      status: preview.docs_unposted === 0,
      details: preview.docs_unposted === 0 
        ? 'All documents processed' 
        : `${preview.docs_unposted} unposted`,
      icon: FileBarChart
    },
    {
      name: 'AR Aging Current',
      status: preview.aging_ok,
      details: preview.aging_ok ? 'Aging is current' : 'Aging needs update',
      icon: Clock
    },
    {
      name: 'Revenue Recognition Posted',
      status: preview.revrec_current_posted,
      details: preview.revrec_current_posted ? 'Current period posted' : 'Not posted',
      icon: TrendingDown
    },
    {
      name: 'Trial Balance Balanced',
      status: preview.tb_balanced,
      details: preview.tb_balanced ? 'DR = CR' : 'Out of balance',
      icon: CheckCircle
    },
    {
      name: 'Accruals & Depreciation',
      status: preview.accruals_prepaids_dep_posted,
      details: preview.accruals_prepaids_dep_posted 
        ? 'All adjustments posted' 
        : 'Pending adjustments',
      icon: RefreshCw
    }
  ] : [];

  const passedChecks = checklistItems.filter(item => item.status).length;
  const totalChecks = checklistItems.length;
  const completionPercentage = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;

  const currentPeriodName = `${new Date(selectedYear, selectedMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Period Close</h2>
          <p className="text-muted-foreground">Month-end and year-end closing automation</p>
        </div>
        <Button variant="outline" onClick={fetchPreview} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Period Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Period to Close</CardTitle>
          <CardDescription>Choose the accounting period you want to close</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Month</Label>
              <Select 
                value={selectedMonth.toString()} 
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <SelectItem key={month} value={month.toString()}>
                      {new Date(2024, month - 1).toLocaleDateString('en-US', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Year</Label>
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Badge variant={preview?.can_close ? 'default' : 'destructive'} className="text-lg py-2 px-4">
                {preview?.can_close ? (
                  <><CheckCircle className="h-4 w-4 mr-2" /> Ready to Close</>
                ) : (
                  <><XCircle className="h-4 w-4 mr-2" /> Not Ready</>
                )}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Alert */}
      {preview && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Alert variant={preview.can_close ? 'default' : 'destructive'}>
              {preview.can_close ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>All Checks Passed!</AlertTitle>
                  <AlertDescription>
                    {currentPeriodName} is ready to close. All validations have passed.
                  </AlertDescription>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Close Blocked</AlertTitle>
                  <AlertDescription>
                    {totalChecks - passedChecks} validation(s) failed. Please complete all checklist items before closing.
                  </AlertDescription>
                </>
              )}
            </Alert>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Close Progress</CardTitle>
          <CardDescription>
            {passedChecks} of {totalChecks} checks passed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={completionPercentage} className="h-3" />
          <div className="text-sm text-muted-foreground text-center">
            {completionPercentage.toFixed(0)}% complete
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Month-End Checklist</CardTitle>
          <CardDescription>Complete all items before closing the period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {checklistItems.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  item.status 
                    ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' 
                    : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                }`}
              >
                <div className="flex items-center gap-4">
                  {item.status ? (
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  )}
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.details}</p>
                  </div>
                </div>
                <Badge variant={item.status ? 'default' : 'destructive'}>
                  {item.status ? 'Passed' : 'Failed'}
                </Badge>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Automation Preview */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>Automated Close Actions</CardTitle>
            <CardDescription>The following will be executed automatically when you close the period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <PlayCircle className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Process Depreciation</p>
                  <p className="text-sm text-muted-foreground">Calculate and post monthly depreciation for all fixed assets</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <PlayCircle className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Close P&L to Retained Earnings</p>
                  <p className="text-sm text-muted-foreground">Move income and expense accounts to equity</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <PlayCircle className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Generate Financial Statements</p>
                  <p className="text-sm text-muted-foreground">Balance Sheet, Income Statement, Cash Flow Statement</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <PlayCircle className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Lock Period</p>
                  <p className="text-sm text-muted-foreground">Prevent further journal entries in closed period</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Close Button */}
      <div className="flex justify-end">
        <Dialog open={isCloseModalOpen} onOpenChange={setIsCloseModalOpen}>
          <Button
            size="lg"
            onClick={() => setIsCloseModalOpen(true)}
            disabled={!preview?.can_close || loading}
            className="text-lg py-6 px-8"
          >
            <Lock className="h-5 w-5 mr-2" />
            Close {currentPeriodName}
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Period Close</DialogTitle>
              <DialogDescription>
                You are about to close <strong>{currentPeriodName}</strong>. This will:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Once closed, you cannot post new transactions to this period. The period will be locked.
                </AlertDescription>
              </Alert>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Process all depreciation entries</li>
                <li>Close P&L accounts to Retained Earnings</li>
                <li>Generate financial statements</li>
                <li>Lock the period from further changes</li>
              </ul>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCloseModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleClosePeriod} disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Closing...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Confirm Close
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Period History */}
      <Card>
        <CardHeader>
          <CardTitle>Closed Periods</CardTitle>
          <CardDescription>History of closed accounting periods</CardDescription>
        </CardHeader>
        <CardContent>
          {periods.filter(p => p.is_closed).length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No closed periods yet</p>
              <p className="text-sm">Closed periods will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {periods
                .filter(p => p.is_closed)
                .slice(0, 10)
                .map((period, index) => (
                  <motion.div
                    key={period.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {new Date(period.period_start).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Closed by {period.closed_by} on {new Date(period.closed_at!).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      <Lock className="h-3 w-3 mr-1" />
                      {period.period_status}
                    </Badge>
                  </motion.div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}