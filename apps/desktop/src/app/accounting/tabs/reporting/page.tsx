"use client"

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AnimatedText } from '@ngi/ui';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  TrendingUp,
  DollarSign,
  BarChart3,
  Activity
} from 'lucide-react';
import { useEntityContext } from '@/hooks/useEntityContext';
import { toast } from 'sonner';

export default function ReportingPage() {
  const { selectedEntityId } = useEntityContext();
  const [activeTab, setActiveTab] = useState('balance-sheet');
  
  // Period Selection
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year' | 'custom'>('month');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Statement Data
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [incomeStatement, setIncomeStatement] = useState<any>(null);
  const [cashFlow, setCashFlow] = useState<any>(null);
  const [equityStatement, setEquityStatement] = useState<any>(null);
  const [trialBalance, setTrialBalance] = useState<any>(null);
  
  const [loading, setLoading] = useState(false);
  const [consolidated, setConsolidated] = useState(false);

  useEffect(() => {
    if (selectedEntityId) {
      // Set default period dates
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setPeriodStart(firstDayOfMonth.toISOString().split('T')[0]);
      setPeriodEnd(today.toISOString().split('T')[0]);
      setAsOfDate(today.toISOString().split('T')[0]);
    }
  }, [selectedEntityId]);

  const handlePeriodTypeChange = (type: 'month' | 'quarter' | 'year' | 'custom') => {
    setPeriodType(type);
    const today = new Date();
    
    if (type === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setPeriodStart(firstDay.toISOString().split('T')[0]);
      setPeriodEnd(today.toISOString().split('T')[0]);
    } else if (type === 'quarter') {
      const quarter = Math.floor(today.getMonth() / 3);
      const firstDay = new Date(today.getFullYear(), quarter * 3, 1);
      setPeriodStart(firstDay.toISOString().split('T')[0]);
      setPeriodEnd(today.toISOString().split('T')[0]);
    } else if (type === 'year') {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      setPeriodStart(firstDay.toISOString().split('T')[0]);
      setPeriodEnd(today.toISOString().split('T')[0]);
    }
  };

  const fetchBalanceSheet = async () => {
    if (!selectedEntityId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/reporting/balance-sheet?entity_id=${selectedEntityId}&as_of_date=${asOfDate}&consolidated=${consolidated}`
      );
      const data = await response.json();
      if (data.success) {
        setBalanceSheet(data.data);
        toast.success('Balance Sheet loaded');
      } else {
        toast.error('Failed to load Balance Sheet');
      }
    } catch (error) {
      console.error('Failed to load Balance Sheet:', error);
      toast.error('Failed to load Balance Sheet');
    } finally {
      setLoading(false);
    }
  };

  const fetchIncomeStatement = async () => {
    if (!selectedEntityId || !periodStart || !periodEnd) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/reporting/income-statement?entity_id=${selectedEntityId}&period_start=${periodStart}&period_end=${periodEnd}&consolidated=${consolidated}`
      );
      const data = await response.json();
      if (data.success) {
        setIncomeStatement(data.data);
        toast.success('Income Statement loaded');
      } else {
        toast.error('Failed to load Income Statement');
      }
    } catch (error) {
      console.error('Failed to load Income Statement:', error);
      toast.error('Failed to load Income Statement');
    } finally {
      setLoading(false);
    }
  };

  const fetchCashFlow = async () => {
    if (!selectedEntityId || !periodStart || !periodEnd) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/reporting/cash-flow?entity_id=${selectedEntityId}&period_start=${periodStart}&period_end=${periodEnd}&consolidated=${consolidated}`
      );
      const data = await response.json();
      if (data.success) {
        setCashFlow(data.data);
        toast.success('Cash Flow Statement loaded');
      } else {
        toast.error('Failed to load Cash Flow Statement');
      }
    } catch (error) {
      console.error('Failed to load Cash Flow Statement:', error);
      toast.error('Failed to load Cash Flow Statement');
    } finally {
      setLoading(false);
    }
  };

  const fetchEquityStatement = async () => {
    if (!selectedEntityId || !periodStart || !periodEnd) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/reporting/equity-statement?entity_id=${selectedEntityId}&period_start=${periodStart}&period_end=${periodEnd}&consolidated=${consolidated}`
      );
      const data = await response.json();
      if (data.success) {
        setEquityStatement(data.data);
        toast.success('Equity Statement loaded');
      } else {
        toast.error('Failed to load Equity Statement');
      }
    } catch (error) {
      console.error('Failed to load Equity Statement:', error);
      toast.error('Failed to load Equity Statement');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStatements = async () => {
    if (!selectedEntityId || !periodStart || !periodEnd) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/reporting/full-package?entity_id=${selectedEntityId}&period_start=${periodStart}&period_end=${periodEnd}&as_of_date=${asOfDate}&consolidated=${consolidated}`
      );
      const data = await response.json();
      if (data.success) {
        setBalanceSheet(data.statements.balance_sheet);
        setIncomeStatement(data.statements.income_statement);
        setCashFlow(data.statements.cash_flow);
        setEquityStatement(data.statements.equity_statement);
        toast.success('All statements loaded');
      } else {
        toast.error('Failed to load statements');
      }
    } catch (error) {
      console.error('Failed to load statements:', error);
      toast.error('Failed to load statements');
    } finally {
      setLoading(false);
    }
  };

  const fetchSkeletonPreview = async () => {
    if (!selectedEntityId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/reporting/skeleton-preview?entity_id=${selectedEntityId}`
      );
      const data = await response.json();
      if (data.success) {
        setBalanceSheet(data.statements.balance_sheet);
        setIncomeStatement(data.statements.income_statement);
        toast.success('Preview loaded - Final statements available after period close');
      } else {
        toast.error('Failed to load preview');
      }
    } catch (error) {
      console.error('Failed to load preview:', error);
      toast.error('Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <AnimatedText 
            text="Reporting" 
            as="h2" 
            className="text-2xl font-bold tracking-tight"
            delay={0.1}
          />
          <AnimatedText 
            text="Generate US GAAP financial statements and comprehensive reporting packages" 
            as="p" 
            className="text-muted-foreground"
            delay={0.3}
            stagger={0.02}
          />
        </div>
      </div>

      {/* Period Selector Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Financial Reporting</CardTitle>
              <CardDescription>US GAAP compliant financial statements</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchSkeletonPreview} variant="outline">
                <Eye className="mr-2 h-4 w-4" />
                Preview Current
              </Button>
              <Button onClick={fetchAllStatements} disabled={loading}>
                <Download className="mr-2 h-4 w-4" />
                {loading ? 'Loading...' : 'Generate All Statements'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Period Type</Label>
              <Select value={periodType} onValueChange={(value: any) => handlePeriodTypeChange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="quarter">Quarter</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Period Start</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                disabled={periodType !== 'custom'}
              />
            </div>

            <div className="space-y-2">
              <Label>Period End</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                disabled={periodType !== 'custom'}
              />
            </div>

            <div className="space-y-2">
              <Label>As Of Date (for BS)</Label>
              <Input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center space-x-2">
            <input
              type="checkbox"
              id="consolidated"
              checked={consolidated}
              onChange={(e) => setConsolidated(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="consolidated" className="text-sm font-normal cursor-pointer">
              Generate consolidated financial statements (includes all subsidiaries)
            </Label>
          </div>

          {/* Info Banner */}
          <div className="mt-4 rounded-lg bg-blue-50 p-4 border border-blue-200">
            <div className="flex items-start">
              <FileText className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900">Statement Generation</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Statements are generated from posted journal entries. Preview shows current status; final statements are available after period close.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Statements Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="mb-6 flex justify-center">
          <TabsList className="h-11 bg-muted/50">
            <TabsTrigger value="balance-sheet" className="data-[state=active]:bg-background px-6">
              Balance Sheet
            </TabsTrigger>
            <TabsTrigger value="income-statement" className="data-[state=active]:bg-background px-6">
              Income Statement
            </TabsTrigger>
            <TabsTrigger value="cash-flow" className="data-[state=active]:bg-background px-6">
              Cash Flow
            </TabsTrigger>
            <TabsTrigger value="equity" className="data-[state=active]:bg-background px-6">
              Equity
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ============================================================================ */}
        {/* BALANCE SHEET TAB */}
        {/* ============================================================================ */}
        <TabsContent value="balance-sheet" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Balance Sheet</CardTitle>
                  <CardDescription>ASC 210 - Classified Format</CardDescription>
                </div>
                <Button onClick={fetchBalanceSheet} disabled={loading}>
                  <Activity className="mr-2 h-4 w-4" />
                  {loading ? 'Loading...' : 'Generate'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {balanceSheet ? (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="text-center border-b pb-4">
                    <h2 className="text-2xl font-bold">{balanceSheet.entity_name}</h2>
                    <h3 className="text-xl font-semibold">Balance Sheet</h3>
                    <p className="text-muted-foreground">As of {new Date(balanceSheet.as_of_date).toLocaleDateString()}</p>
                    {balanceSheet.consolidated && <Badge>Consolidated</Badge>}
                  </div>

                  {/* Assets */}
                  <div>
                    <h3 className="text-lg font-bold mb-4">ASSETS</h3>
                    
                    {/* Current Assets */}
                    <div className="ml-4 mb-4">
                      <h4 className="font-semibold mb-2">Current Assets</h4>
                      <Table>
                        <TableBody>
                          {Object.entries(balanceSheet.assets.current_assets).map(([key, value]: [string, any]) => (
                            <TableRow key={key}>
                              <TableCell className="pl-8">{key}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(value.balance)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-semibold bg-slate-50">
                            <TableCell className="pl-8">Total Current Assets</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(balanceSheet.assets.total_current_assets)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {/* Non-Current Assets */}
                    <div className="ml-4 mb-4">
                      <h4 className="font-semibold mb-2">Non-Current Assets</h4>
                      <Table>
                        <TableBody>
                          {Object.entries(balanceSheet.assets.non_current_assets).map(([key, value]: [string, any]) => (
                            <TableRow key={key}>
                              <TableCell className="pl-8">{key}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(value.balance)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-semibold bg-slate-50">
                            <TableCell className="pl-8">Total Non-Current Assets</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(balanceSheet.assets.total_non_current_assets)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    <div className="border-t-2 border-black pt-2">
                      <Table>
                        <TableBody>
                          <TableRow className="font-bold text-lg">
                            <TableCell>TOTAL ASSETS</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(balanceSheet.assets.total_assets)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Liabilities & Equity */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-bold mb-4">LIABILITIES & EQUITY</h3>
                    
                    {/* Current Liabilities */}
                    <div className="ml-4 mb-4">
                      <h4 className="font-semibold mb-2">Current Liabilities</h4>
                      <Table>
                        <TableBody>
                          {Object.entries(balanceSheet.liabilities.current_liabilities).map(([key, value]: [string, any]) => (
                            <TableRow key={key}>
                              <TableCell className="pl-8">{key}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(value.balance)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-semibold bg-slate-50">
                            <TableCell className="pl-8">Total Current Liabilities</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(balanceSheet.liabilities.total_current_liabilities)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {/* Total Liabilities */}
                    <div className="ml-4 mb-6">
                      <Table>
                        <TableBody>
                          <TableRow className="font-bold">
                            <TableCell>TOTAL LIABILITIES</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(balanceSheet.liabilities.total_liabilities)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {/* Equity */}
                    <div className="ml-4 mb-4">
                      <h4 className="font-semibold mb-2">Stockholders Equity</h4>
                      <Table>
                        <TableBody>
                          {Object.entries(balanceSheet.equity.stockholders_equity || balanceSheet.equity.members_equity || {}).map(([key, value]: [string, any]) => (
                            <TableRow key={key}>
                              <TableCell className="pl-8">{key}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(value.balance)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-slate-50">
                            <TableCell className="pl-8">Total Equity</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(balanceSheet.equity.total_equity)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {/* Total Liabilities & Equity */}
                    <div className="border-t-2 border-black pt-2">
                      <Table>
                        <TableBody>
                          <TableRow className="font-bold text-lg">
                            <TableCell>TOTAL LIABILITIES & EQUITY</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(balanceSheet.liabilities.total_liabilities + balanceSheet.equity.total_equity)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {/* Balance Check */}
                    {balanceSheet.balance_check && (
                      <div className={`mt-4 p-3 rounded ${balanceSheet.balance_check.is_balanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <p className={`text-sm font-semibold ${balanceSheet.balance_check.is_balanced ? 'text-green-900' : 'text-red-900'}`}>
                          {balanceSheet.balance_check.is_balanced ? '✓ Balance Sheet is Balanced' : '✗ Balance Sheet is NOT Balanced'}
                        </p>
                        {!balanceSheet.balance_check.is_balanced && (
                          <p className="text-sm text-red-700 mt-1">
                            Difference: {formatCurrency(Math.abs(balanceSheet.balance_check.assets - balanceSheet.balance_check.liabilities_plus_equity))}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">Click "Generate" to create the Balance Sheet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================================ */}
        {/* INCOME STATEMENT TAB */}
        {/* ============================================================================ */}
        <TabsContent value="income-statement" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Income Statement</CardTitle>
                  <CardDescription>ASC 220 - Multi-Step Format</CardDescription>
                </div>
                <Button onClick={fetchIncomeStatement} disabled={loading}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  {loading ? 'Loading...' : 'Generate'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {incomeStatement ? (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="text-center border-b pb-4">
                    <h2 className="text-2xl font-bold">{incomeStatement.entity_name}</h2>
                    <h3 className="text-xl font-semibold">Income Statement</h3>
                    <p className="text-muted-foreground">
                      For the period {new Date(incomeStatement.period_start).toLocaleDateString()} to {new Date(incomeStatement.period_end).toLocaleDateString()}
                    </p>
                    {incomeStatement.consolidated && <Badge>Consolidated</Badge>}
                  </div>

                  <Table>
                    <TableBody>
                      {/* Revenue */}
                      <TableRow className="font-bold bg-slate-100">
                        <TableCell colSpan={2}>REVENUE</TableCell>
                      </TableRow>
                      {Object.entries(incomeStatement.revenue).map(([key, value]: [string, any]) => (
                        <TableRow key={key}>
                          <TableCell className="pl-8">{key}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(value.amount)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-semibold border-t">
                        <TableCell>Total Revenue</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(incomeStatement.total_revenue)}</TableCell>
                      </TableRow>

                      {/* Cost of Revenue */}
                      {incomeStatement.cost_of_revenue > 0 && (
                        <>
                          <TableRow>
                            <TableCell>Cost of Revenue</TableCell>
                            <TableCell className="text-right font-mono">({formatCurrency(incomeStatement.cost_of_revenue)})</TableCell>
                          </TableRow>
                          <TableRow className="font-bold border-t">
                            <TableCell>GROSS PROFIT</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(incomeStatement.gross_profit)}</TableCell>
                          </TableRow>
                        </>
                      )}

                      {/* Operating Expenses */}
                      <TableRow className="font-bold bg-slate-100 mt-4">
                        <TableCell colSpan={2}>OPERATING EXPENSES</TableCell>
                      </TableRow>
                      {Object.entries(incomeStatement.operating_expenses).filter(([key]) => key !== 'total_operating_expenses' && typeof incomeStatement.operating_expenses[key] === 'object').map(([category, accounts]: [string, any]) => (
                        <>
                          {Object.entries(accounts).map(([key, value]: [string, any]) => (
                            <TableRow key={`${category}-${key}`}>
                              <TableCell className="pl-8">{key}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(value.amount)}</TableCell>
                            </TableRow>
                          ))}
                        </>
                      ))}
                      <TableRow className="font-semibold border-t">
                        <TableCell>Total Operating Expenses</TableCell>
                        <TableCell className="text-right font-mono">({formatCurrency(incomeStatement.total_operating_expenses)})</TableCell>
                      </TableRow>

                      {/* Operating Income */}
                      <TableRow className="font-bold border-t">
                        <TableCell>OPERATING INCOME</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(incomeStatement.operating_income)}</TableCell>
                      </TableRow>

                      {/* Other Income */}
                      {Object.keys(incomeStatement.other_income_expense).length > 0 && (
                        <>
                          <TableRow className="font-bold bg-slate-100 mt-4">
                            <TableCell colSpan={2}>OTHER INCOME (EXPENSE)</TableCell>
                          </TableRow>
                          {Object.entries(incomeStatement.other_income_expense).map(([key, value]: [string, any]) => (
                            <TableRow key={key}>
                              <TableCell className="pl-8">{key}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(value.amount)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-semibold border-t">
                            <TableCell>Total Other Income (Expense)</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(incomeStatement.total_other_income)}</TableCell>
                          </TableRow>
                        </>
                      )}

                      {/* Income Before Tax */}
                      <TableRow className="font-bold border-t">
                        <TableCell>INCOME BEFORE TAX</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(incomeStatement.income_before_tax)}</TableCell>
                      </TableRow>

                      {/* Tax Expense */}
                      {incomeStatement.income_tax_expense > 0 && (
                        <TableRow>
                          <TableCell>Income Tax Expense</TableCell>
                          <TableCell className="text-right font-mono">({formatCurrency(incomeStatement.income_tax_expense)})</TableCell>
                        </TableRow>
                      )}

                      {/* Net Income */}
                      <TableRow className="font-bold text-lg border-t-2 border-black bg-blue-50">
                        <TableCell>NET INCOME</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(incomeStatement.net_income)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">Click "Generate" to create the Income Statement</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================================ */}
        {/* CASH FLOW TAB */}
        {/* ============================================================================ */}
        <TabsContent value="cash-flow" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Cash Flow Statement</CardTitle>
                  <CardDescription>ASC 230 - Indirect Method</CardDescription>
                </div>
                <Button onClick={fetchCashFlow} disabled={loading}>
                  <Activity className="mr-2 h-4 w-4" />
                  {loading ? 'Loading...' : 'Generate'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {cashFlow ? (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="text-center border-b pb-4">
                    <h2 className="text-2xl font-bold">{cashFlow.entity_name}</h2>
                    <h3 className="text-xl font-semibold">Statement of Cash Flows</h3>
                    <p className="text-muted-foreground">
                      For the period {new Date(cashFlow.period_start).toLocaleDateString()} to {new Date(cashFlow.period_end).toLocaleDateString()}
                    </p>
                    {cashFlow.consolidated && <Badge>Consolidated</Badge>}
                  </div>

                  <Table>
                    <TableBody>
                      {/* Operating Activities */}
                      <TableRow className="font-bold bg-slate-100">
                        <TableCell colSpan={2}>CASH FLOWS FROM OPERATING ACTIVITIES</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="pl-4">Net Income</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(cashFlow.operating_activities.net_income)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="pl-4 font-semibold">Adjustments to reconcile net income:</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      {Object.entries(cashFlow.operating_activities.adjustments).map(([key, value]: [string, any]) => (
                        <TableRow key={key}>
                          <TableCell className="pl-8">{key}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(value.amount)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className="pl-4 font-semibold">Changes in working capital:</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      {Object.entries(cashFlow.operating_activities.changes_in_working_capital).map(([key, value]: [string, any]) => (
                        <TableRow key={key}>
                          <TableCell className="pl-8">{key}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(value.amount)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold border-t">
                        <TableCell>Net Cash from Operating Activities</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(cashFlow.operating_activities.net_cash_from_operating)}</TableCell>
                      </TableRow>

                      {/* Investing Activities */}
                      <TableRow className="font-bold bg-slate-100 mt-4">
                        <TableCell colSpan={2}>CASH FLOWS FROM INVESTING ACTIVITIES</TableCell>
                      </TableRow>
                      {Object.entries(cashFlow.investing_activities).map(([key, value]: [string, any]) => (
                        <TableRow key={key}>
                          <TableCell className="pl-4">{key}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(value.amount)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold border-t">
                        <TableCell>Net Cash from Investing Activities</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(cashFlow.net_cash_from_investing)}</TableCell>
                      </TableRow>

                      {/* Financing Activities */}
                      <TableRow className="font-bold bg-slate-100 mt-4">
                        <TableCell colSpan={2}>CASH FLOWS FROM FINANCING ACTIVITIES</TableCell>
                      </TableRow>
                      {Object.entries(cashFlow.financing_activities).map(([key, value]: [string, any]) => (
                        <TableRow key={key}>
                          <TableCell className="pl-4">{key}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(value.amount)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold border-t">
                        <TableCell>Net Cash from Financing Activities</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(cashFlow.net_cash_from_financing)}</TableCell>
                      </TableRow>

                      {/* Net Change in Cash */}
                      <TableRow className="font-bold border-t-2 border-black mt-4">
                        <TableCell>NET CHANGE IN CASH</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(cashFlow.net_change_in_cash)}</TableCell>
                      </TableRow>

                      {/* Cash Beginning/Ending */}
                      <TableRow>
                        <TableCell>Cash at Beginning of Period</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(cashFlow.beginning_cash)}</TableCell>
                      </TableRow>
                      <TableRow className="font-bold text-lg border-t bg-blue-50">
                        <TableCell>CASH AT END OF PERIOD</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(cashFlow.ending_cash)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">Click "Generate" to create the Cash Flow Statement</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================================ */}
        {/* EQUITY STATEMENT TAB */}
        {/* ============================================================================ */}
        <TabsContent value="equity" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Statement of Changes in Equity</CardTitle>
                  <CardDescription>Stockholders or Members Equity</CardDescription>
                </div>
                <Button onClick={fetchEquityStatement} disabled={loading}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  {loading ? 'Loading...' : 'Generate'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {equityStatement ? (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="text-center border-b pb-4">
                    <h2 className="text-2xl font-bold">{equityStatement.entity_name}</h2>
                    <h3 className="text-xl font-semibold">Statement of Changes in {equityStatement.entity_type === 'LLC' ? "Members'" : "Stockholders'"} Equity</h3>
                    <p className="text-muted-foreground">
                      For the period {new Date(equityStatement.period_start).toLocaleDateString()} to {new Date(equityStatement.period_end).toLocaleDateString()}
                    </p>
                    {equityStatement.consolidated && <Badge>Consolidated</Badge>}
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead></TableHead>
                        {equityStatement.columns.map((col: string) => (
                          <TableHead key={col} className="text-right">{col}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="font-semibold">
                        <TableCell>Beginning Balance</TableCell>
                        {equityStatement.columns.map((col: string) => (
                          <TableCell key={col} className="text-right font-mono">
                            {formatCurrency(equityStatement.beginning_balance[col.toLowerCase().replace(/[^a-z0-9]/g, '_')] || 0)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="pl-4">Net Income</TableCell>
                        <TableCell className="text-right font-mono" colSpan={equityStatement.columns.length}>
                          {formatCurrency(equityStatement.net_income)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="pl-4">Capital Contributions</TableCell>
                        <TableCell className="text-right font-mono" colSpan={equityStatement.columns.length}>
                          {formatCurrency(equityStatement.capital_contributions)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="pl-4">Distributions</TableCell>
                        <TableCell className="text-right font-mono" colSpan={equityStatement.columns.length}>
                          ({formatCurrency(equityStatement.distributions)})
                        </TableCell>
                      </TableRow>
                      <TableRow className="font-bold border-t bg-blue-50">
                        <TableCell>Ending Balance</TableCell>
                        {equityStatement.columns.map((col: string) => (
                          <TableCell key={col} className="text-right font-mono">
                            {formatCurrency(equityStatement.ending_balance[col.toLowerCase().replace(/[^a-z0-9]/g, '_')] || 0)}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">Click "Generate" to create the Equity Statement</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
