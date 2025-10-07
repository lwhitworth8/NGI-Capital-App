'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import NotesManager from '@/components/accounting/NotesManager';
import { 
  FileBarChart, 
  Download, 
  FileText, 
  Calendar, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEntityContext } from '@/hooks/useEntityContext';

interface AccountBalance {
  name: string;
  type: string;
  balance: number;
}

interface FinancialData {
  entity_name: string;
  period_end_date: string;
  statements: {
    balance_sheet?: {
      assets: Record<string, AccountBalance>;
      liabilities: Record<string, AccountBalance>;
      equity: Record<string, AccountBalance>;
      total_assets: number;
      total_liabilities: number;
      total_equity: number;
      balanced: boolean;
    };
    income_statement?: {
      revenue: Record<string, AccountBalance>;
      expenses: Record<string, AccountBalance>;
      total_revenue: number;
      total_expenses: number;
      net_income: number;
    };
    cash_flows?: any;
    stockholders_equity?: any;
    comprehensive_income?: any;
  };
  notes?: any[];
  generated_at: string;
}

export default function FinancialStatementsView() {
  const { selectedEntityId } = useEntityContext();
  const [selectedPeriod, setSelectedPeriod] = useState('2025-12');
  const [activeStatement, setActiveStatement] = useState('balance-sheet');
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<any[]>([]);

  // Generate financial statements from REAL trial balance data
  const generateStatements = async () => {
    if (!selectedEntityId) {
      setError('Please select an entity first');
      return;
    }
    
    setGenerating(true);
    setError(null);
    
    try {
      // Determine report type based on selected period
      const isFiscalYear = selectedPeriod === '2025-12';
      const isQuarterly = ['2025-03', '2025-06', '2025-09'].includes(selectedPeriod);
      
      // Get the correct last day of the month
      const getLastDayOfMonth = (yearMonth: string) => {
        const [year, month] = yearMonth.split('-').map(Number);
        const lastDay = new Date(year, month, 0).getDate(); // month is 1-indexed in Date constructor
        return `${yearMonth}-${lastDay.toString().padStart(2, '0')}`;
      };
      
      const response = await fetch(`/api/accounting/financial-reporting/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          entity_id: selectedEntityId,
          period_end_date: getLastDayOfMonth(selectedPeriod),
          report_type: isFiscalYear ? 'fiscal_year' : isQuarterly ? 'quarterly' : 'monthly',
          include_comparatives: isFiscalYear || isQuarterly
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Financial data received:', data);
        setFinancialData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to generate statements');
      }
    } catch (error) {
      console.error('Failed to generate statements:', error);
      setError('Network error - please try again');
    } finally {
      setGenerating(false);
    }
  };

  // Export to Excel
  const exportToExcel = async () => {
    if (!selectedEntityId || !financialData) return;
    
    try {
      const response = await fetch(
        `/api/accounting/financial-reporting/export/excel?entity_id=${selectedEntityId}&period_end_date=${selectedPeriod}-31`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Financial_Statements_${financialData.entity_name}_${selectedPeriod}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '$0';
    const absAmount = Math.abs(amount);
    const formatted = absAmount.toLocaleString('en-US', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    });
    return amount < 0 ? `($${formatted})` : `$${formatted}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Header Section */}
      <div className="flex items-center justify-between flex-wrap gap-4">
      <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            US GAAP Financial Statements
            <Badge variant="outline" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              ASC Compliant
            </Badge>
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time financial statements generated from your trial balance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={exportToExcel}
            disabled={!financialData || generating}
          >
            <Download className="mr-2 h-4 w-4" />
            Excel Package
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025-12">December 2025 (FY End)</SelectItem>
                  <SelectItem value="2025-11">November 2025</SelectItem>
                  <SelectItem value="2025-10">October 2025</SelectItem>
                  <SelectItem value="2025-09">September 2025 (Q3 End)</SelectItem>
                  <SelectItem value="2025-08">August 2025</SelectItem>
                  <SelectItem value="2025-07">July 2025</SelectItem>
                  <SelectItem value="2025-06">June 2025 (Q2 End)</SelectItem>
                  <SelectItem value="2025-05">May 2025</SelectItem>
                  <SelectItem value="2025-04">April 2025</SelectItem>
                  <SelectItem value="2025-03">March 2025 (Q1 End)</SelectItem>
                  <SelectItem value="2025-02">February 2025</SelectItem>
                  <SelectItem value="2025-01">January 2025</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={generateStatements}
              disabled={generating || !selectedEntityId}
              className="min-w-[180px]"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileBarChart className="mr-2 h-4 w-4" />
                  Generate Statements
                </>
              )}
            </Button>

            {financialData && (
              <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Generated {new Date(financialData.generated_at).toLocaleTimeString()}
              </div>
            )}
      </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Statements Tabs */}
      {financialData ? (
        <Tabs value={activeStatement} onValueChange={setActiveStatement} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="balance-sheet" className="text-xs sm:text-sm">
              Balance Sheet
            </TabsTrigger>
            <TabsTrigger value="income" className="text-xs sm:text-sm">
              Income Statement
            </TabsTrigger>
            <TabsTrigger value="cashflow" className="text-xs sm:text-sm">
              Cash Flows
            </TabsTrigger>
            <TabsTrigger value="equity" className="text-xs sm:text-sm">
              Equity Statement
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-xs sm:text-sm">
              Notes
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeStatement}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Balance Sheet */}
              <TabsContent value="balance-sheet" className="mt-0">
                <BalanceSheetView data={financialData.statements.balance_sheet} entityName={financialData.entity_name} periodEnd={financialData.period_end_date} />
              </TabsContent>

              {/* Income Statement */}
              <TabsContent value="income" className="mt-0">
                <IncomeStatementView data={financialData.statements.income_statement} entityName={financialData.entity_name} periodEnd={financialData.period_end_date} />
              </TabsContent>

              {/* Cash Flow Statement */}
              <TabsContent value="cashflow" className="mt-0">
                <CashFlowView data={financialData.statements.cash_flows} entityName={financialData.entity_name} periodEnd={financialData.period_end_date} />
              </TabsContent>

              {/* Stockholders' Equity */}
              <TabsContent value="equity" className="mt-0">
                <EquityStatementView data={financialData.statements.stockholders_equity} entityName={financialData.entity_name} periodEnd={financialData.period_end_date} />
              </TabsContent>

              {/* Notes to Financial Statements */}
              <TabsContent value="notes" className="mt-0">
                <NotesManager 
                  entityId={selectedEntityId} 
                  statementType="balance_sheet"
                  onNotesChange={setNotes}
                />
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileBarChart className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Generate Financial Statements</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              Select a period and click "Generate Statements" to create GAAP-compliant financial statements from your trial balance
            </p>
            {!selectedEntityId && (
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <AlertCircle className="h-4 w-4" />
                Please select an entity from the dropdown at the top
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

// Balance Sheet Component - USES REAL DATA
function BalanceSheetView({ data, entityName, periodEnd }: { data: any; entityName: string; periodEnd: string }) {
  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No balance sheet data available
        </CardContent>
      </Card>
    );
  }

  const year = new Date(periodEnd).getFullYear();
  const priorYear = year - 1;

  // Convert accounts object to sorted array
  const assetAccounts = Object.entries(data.assets || {}).sort(([a], [b]) => a.localeCompare(b));
  const liabilityAccounts = Object.entries(data.liabilities || {}).sort(([a], [b]) => a.localeCompare(b));
  const equityAccounts = Object.entries(data.equity || {}).sort(([a], [b]) => a.localeCompare(b));

  // Categorize assets (1xxx = current, 15xx+ = noncurrent)
  const currentAssets = assetAccounts.filter(([num]) => parseInt(num) < 1500);
  const noncurrentAssets = assetAccounts.filter(([num]) => parseInt(num) >= 1500);

  // Categorize liabilities (2xxx = current, 25xx+ = noncurrent)
  const currentLiabilities = liabilityAccounts.filter(([num]) => parseInt(num) < 2500);
  const noncurrentLiabilities = liabilityAccounts.filter(([num]) => parseInt(num) >= 2500);

  const totalCurrentAssets = currentAssets.reduce((sum, [, acc]) => sum + (acc as any).balance, 0);
  const totalNoncurrentAssets = noncurrentAssets.reduce((sum, [, acc]) => sum + (acc as any).balance, 0);
  const totalCurrentLiabs = currentLiabilities.reduce((sum, [, acc]) => sum + (acc as any).balance, 0);
  const totalNoncurrentLiabs = noncurrentLiabilities.reduce((sum, [, acc]) => sum + (acc as any).balance, 0);

  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount);
    if (absAmount === 0) return '—';
    const formatted = absAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return amount < 0 ? `(${formatted})` : formatted;
  };

  return (
        <Card>
          <CardHeader>
        <CardTitle className="text-xl">{entityName}</CardTitle>
        <CardTitle className="text-lg">BALANCE SHEET</CardTitle>
        <CardDescription>
          As of December 31, {year} (In US dollars)
        </CardDescription>
        {data.balanced && (
          <Badge variant="outline" className="w-fit mt-2">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Balanced: Assets = Liabilities + Equity
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* ASSETS */}
          <div>
            <h3 className="text-base font-bold mb-4 pb-2 border-b-2">ASSETS</h3>
            
            {/* Current Assets */}
            {currentAssets.length > 0 && (
              <div className="space-y-1 mb-6">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Current assets:</h4>
                {currentAssets.map(([accountNum, account]: [string, any]) => (
                  <div key={accountNum} className="grid grid-cols-2 gap-4 py-1 text-sm pl-4">
                    <div>{account.name}</div>
                    <div className="text-right font-mono">{formatCurrency(account.balance)}</div>
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="grid grid-cols-2 gap-4 py-1 text-sm font-semibold pl-4">
                  <div>Total current assets</div>
                  <div className="text-right font-mono">{formatCurrency(totalCurrentAssets)}</div>
                </div>
              </div>
            )}

            {/* Noncurrent Assets */}
            {noncurrentAssets.length > 0 && (
              <div className="space-y-1 mb-6">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Noncurrent assets:</h4>
                {noncurrentAssets.map(([accountNum, account]: [string, any]) => (
                  <div key={accountNum} className="grid grid-cols-2 gap-4 py-1 text-sm pl-4">
                    <div>{account.name}</div>
                    <div className="text-right font-mono">{formatCurrency(account.balance)}</div>
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="grid grid-cols-2 gap-4 py-1 text-sm font-semibold pl-4">
                  <div>Total noncurrent assets</div>
                  <div className="text-right font-mono">{formatCurrency(totalNoncurrentAssets)}</div>
                </div>
              </div>
            )}

            <Separator className="my-4 border-double border-2" />
            <div className="grid grid-cols-2 gap-4 py-2 text-base font-bold">
              <div>Total assets</div>
              <div className="text-right font-mono">{formatCurrency(data.total_assets)}</div>
            </div>
          </div>

          <Separator className="my-8" />

          {/* LIABILITIES */}
          <div>
            <h3 className="text-base font-bold mb-4 pb-2 border-b-2">LIABILITIES AND STOCKHOLDERS' EQUITY</h3>
            
            {/* Current Liabilities */}
            {currentLiabilities.length > 0 && (
              <div className="space-y-1 mb-6">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Current liabilities:</h4>
                {currentLiabilities.map(([accountNum, account]: [string, any]) => (
                  <div key={accountNum} className="grid grid-cols-2 gap-4 py-1 text-sm pl-4">
                    <div>{account.name}</div>
                    <div className="text-right font-mono">{formatCurrency(account.balance)}</div>
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="grid grid-cols-2 gap-4 py-1 text-sm font-semibold pl-4">
                  <div>Total current liabilities</div>
                  <div className="text-right font-mono">{formatCurrency(totalCurrentLiabs)}</div>
                </div>
              </div>
            )}

            {/* Noncurrent Liabilities */}
            {noncurrentLiabilities.length > 0 && (
              <div className="space-y-1 mb-6">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Noncurrent liabilities:</h4>
                {noncurrentLiabilities.map(([accountNum, account]: [string, any]) => (
                  <div key={accountNum} className="grid grid-cols-2 gap-4 py-1 text-sm pl-4">
                    <div>{account.name}</div>
                    <div className="text-right font-mono">{formatCurrency(account.balance)}</div>
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="grid grid-cols-2 gap-4 py-1 text-sm font-semibold pl-4">
                  <div>Total noncurrent liabilities</div>
                  <div className="text-right font-mono">{formatCurrency(totalNoncurrentLiabs)}</div>
                </div>
              </div>
            )}

            {liabilityAccounts.length > 0 && (
              <>
                <Separator className="my-2" />
                <div className="grid grid-cols-2 gap-4 py-1 text-sm font-semibold">
                  <div>Total liabilities</div>
                  <div className="text-right font-mono">{formatCurrency(data.total_liabilities)}</div>
                </div>
              </>
            )}
          </div>

          {/* EQUITY */}
          {equityAccounts.length > 0 && (
            <>
              <Separator className="my-6" />
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Stockholders' equity (Members' equity):</h4>
                <div className="space-y-1">
                  {equityAccounts.map(([accountNum, account]: [string, any]) => (
                    <div key={accountNum} className="grid grid-cols-2 gap-4 py-1 text-sm pl-4">
                      <div>{account.name}</div>
                      <div className={`text-right font-mono ${account.balance < 0 ? 'text-red-600' : ''}`}>
                        {formatCurrency(account.balance)}
                      </div>
                    </div>
                  ))}
                  <Separator className="my-2" />
                  <div className="grid grid-cols-2 gap-4 py-1 text-sm font-semibold pl-4">
                    <div>Total stockholders' equity</div>
                    <div className="text-right font-mono">{formatCurrency(data.total_equity)}</div>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator className="my-4 border-double border-2" />
          <div className="grid grid-cols-2 gap-4 py-2 text-base font-bold">
            <div>Total liabilities and stockholders' equity</div>
            <div className="text-right font-mono">{formatCurrency(data.total_liabilities + data.total_equity)}</div>
          </div>

          <div className="mt-6 text-xs text-muted-foreground italic text-center">
            See accompanying notes to financial statements.
          </div>

          {/* Validation Alert */}
          {!data.balanced && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
              <div className="flex items-center gap-2 text-sm text-red-600 font-semibold mb-2">
                <AlertCircle className="h-4 w-4" />
                Balance Sheet Out of Balance
              </div>
              <div className="text-xs text-muted-foreground">
                Assets: {formatCurrency(data.total_assets)} | 
                Liabilities + Equity: {formatCurrency(data.total_liabilities + data.total_equity)} |
                Difference: {formatCurrency(data.total_assets - (data.total_liabilities + data.total_equity))}
              </div>
            </div>
          )}
            </div>
      </CardContent>
    </Card>
  );
}

// Income Statement Component - USES REAL DATA
function IncomeStatementView({ data, entityName, periodEnd }: { data: any; entityName: string; periodEnd: string }) {
  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No income statement data available
        </CardContent>
      </Card>
    );
  }

  const year = new Date(periodEnd).getFullYear();
  const revenueAccounts = Object.entries(data.revenue || {}).sort(([a], [b]) => a.localeCompare(b));
  const expenseAccounts = Object.entries(data.expenses || {}).sort(([a], [b]) => a.localeCompare(b));

  // Categorize expenses by function (4xxx = COGS, 5xxx = OpEx, 6xxx = Other)
  const cogsAccounts = expenseAccounts.filter(([num]) => num.startsWith('4'));
  const opexAccounts = expenseAccounts.filter(([num]) => num.startsWith('5'));
  const otherExpAccounts = expenseAccounts.filter(([num]) => num.startsWith('6') || num.startsWith('7'));

  const totalCOGS = cogsAccounts.reduce((sum, [, acc]) => sum + (acc as any).balance, 0);
  const totalOpex = opexAccounts.reduce((sum, [, acc]) => sum + (acc as any).balance, 0);
  const totalOther = otherExpAccounts.reduce((sum, [, acc]) => sum + (acc as any).balance, 0);
  const grossProfit = data.total_revenue - totalCOGS;

  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount);
    if (absAmount === 0) return '—';
    const formatted = absAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return amount < 0 ? `(${formatted})` : formatted;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{entityName}</CardTitle>
        <CardTitle className="text-lg">STATEMENT OF OPERATIONS</CardTitle>
        <CardDescription>
          For the Year Ended December 31, {year} (In US dollars)
        </CardDescription>
          </CardHeader>
          <CardContent>
        <div className="space-y-6">
          {/* Revenue Section */}
          <div className="space-y-1">
            <h4 className="text-sm font-semibold mb-2">Revenue:</h4>
            {revenueAccounts.map(([accountNum, account]: [string, any]) => (
              <div key={accountNum} className="grid grid-cols-2 gap-4 py-1 text-sm pl-4">
                <div>{account.name}</div>
                <div className="text-right font-mono">{formatCurrency(account.balance)}</div>
              </div>
            ))}
            <Separator className="my-2" />
            <div className="grid grid-cols-2 gap-4 py-1 text-sm font-semibold">
              <div>Total revenue</div>
              <div className="text-right font-mono">{formatCurrency(data.total_revenue)}</div>
            </div>
          </div>

          {/* Cost of Revenue */}
          {cogsAccounts.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-sm font-semibold mb-2">Cost of revenue:</h4>
              {cogsAccounts.map(([accountNum, account]: [string, any]) => (
                <div key={accountNum} className="grid grid-cols-2 gap-4 py-1 text-sm pl-4">
                  <div>{account.name}</div>
                  <div className="text-right font-mono">{formatCurrency(account.balance)}</div>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="grid grid-cols-2 gap-4 py-1 text-sm font-semibold">
                <div>Gross profit</div>
                <div className={`text-right font-mono ${grossProfit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(grossProfit)}
                </div>
              </div>
            </div>
          )}

          {/* Operating Expenses */}
          {opexAccounts.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-sm font-semibold mb-2">Operating expenses:</h4>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="opex" className="border-none">
                  <AccordionTrigger className="hover:no-underline py-2 px-0">
                    <div className="grid grid-cols-2 gap-4 w-full text-sm pl-4">
                      <div>Operating expenses (click to expand)</div>
                      <div className="text-right font-mono pr-6">{formatCurrency(totalOpex)}</div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-8 space-y-1 pt-2 pb-2 bg-muted/20 rounded-md p-4 mt-2">
                      {opexAccounts.map(([accountNum, account]: [string, any]) => (
                        <div key={accountNum} className="grid grid-cols-2 gap-4 py-1 text-xs">
                          <div>{account.name}</div>
                          <div className="text-right font-mono">{formatCurrency(account.balance)}</div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}

          {/* Other Expenses */}
          {otherExpAccounts.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-sm font-semibold mb-2">Other expenses:</h4>
              {otherExpAccounts.map(([accountNum, account]: [string, any]) => (
                <div key={accountNum} className="grid grid-cols-2 gap-4 py-1 text-sm pl-4">
                  <div>{account.name}</div>
                  <div className="text-right font-mono">{formatCurrency(account.balance)}</div>
                </div>
              ))}
            </div>
          )}

          <Separator className="my-4 border-double border-2" />
          <div className="grid grid-cols-2 gap-4 py-2 text-base font-bold">
            <div>Net income (loss)</div>
            <div className={`text-right font-mono ${data.net_income < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(data.net_income)}
            </div>
          </div>

          <div className="mt-6 text-xs text-muted-foreground italic text-center">
            See accompanying notes to financial statements.
          </div>
        </div>
          </CardContent>
        </Card>
  );
}

// Cash Flow Statement
function CashFlowView({ data, entityName, periodEnd }: { data: any; entityName: string; periodEnd: string }) {
  const year = new Date(periodEnd).getFullYear();
  
  return (
        <Card>
          <CardHeader>
        <CardTitle className="text-xl">{entityName}</CardTitle>
        <CardTitle className="text-lg">STATEMENT OF CASH FLOWS</CardTitle>
        <CardDescription>
          For the Year Ended December 31, {year} (Indirect Method - ASC 230)
        </CardDescription>
          </CardHeader>
          <CardContent>
        <div className="py-12 text-center text-muted-foreground">
          <p>Cash flow statement requires journal entry analysis to reconcile net income to cash flows.</p>
          <p className="text-xs mt-2">This will be generated after you create journal entries and post them.</p>
        </div>
          </CardContent>
        </Card>
  );
}

// Equity Statement
function EquityStatementView({ data, entityName, periodEnd }: { data: any; entityName: string; periodEnd: string }) {
  const year = new Date(periodEnd).getFullYear();
  
  return (
        <Card>
          <CardHeader>
        <CardTitle className="text-xl">{entityName}</CardTitle>
        <CardTitle className="text-lg">STATEMENT OF STOCKHOLDERS' EQUITY</CardTitle>
        <CardDescription>
          For the Year Ended December 31, {year}
        </CardDescription>
          </CardHeader>
          <CardContent>
        <div className="py-12 text-center text-muted-foreground">
          <p>Equity statement shows all changes in members' capital or stockholders' equity.</p>
          <p className="text-xs mt-2">Will display contributions, distributions, and net income once equity transactions are recorded.</p>
        </div>
          </CardContent>
        </Card>
  );
}

// Notes Component
function NotesToFinancialsView({ notes, entityName, periodEnd }: { notes: any; entityName: string; periodEnd: string }) {
  const year = new Date(periodEnd).getFullYear();

  return (
    <div className="space-y-4">
        <Card>
          <CardHeader>
          <CardTitle className="text-xl">Notes to Financial Statements</CardTitle>
          <CardDescription>
            For the Year Ended December 31, {year}
          </CardDescription>
          </CardHeader>
          <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {/* Note 1: Nature of Business */}
            <AccordionItem value="note1">
              <AccordionTrigger className="text-base font-semibold">
                Note 1: Nature of Business and Basis of Presentation
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>
                    <strong>{entityName}</strong> is a Delaware limited liability company formed on July 16, 2025, 
                    providing financial advisory services and capital management.
                  </p>
                  <p>
                    <strong>Basis of Presentation:</strong> These financial statements have been prepared in accordance 
                    with US GAAP and include all normal recurring adjustments necessary for fair presentation.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Note 2: Accounting Policies */}
            <AccordionItem value="note2">
              <AccordionTrigger className="text-base font-semibold">
                Note 2: Summary of Significant Accounting Policies
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold mb-1">Revenue Recognition (ASC 606)</p>
                    <p>Revenue is recognized when control of services is transferred to customers.</p>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Cash Equivalents</p>
                    <p>Highly liquid investments with maturities of three months or less.</p>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Use of Estimates</p>
                    <p>Management makes estimates affecting reported amounts. Actual results may differ.</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="note3">
              <AccordionTrigger className="text-base font-semibold">
                Note 3: Going Concern and Liquidity
              </AccordionTrigger>
              <AccordionContent>
                <div className="text-sm">
                  <p>
                    Management has evaluated the Company's ability to continue as a going concern and believes 
                    current resources are adequate for at least 12 months from the balance sheet date.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          </CardContent>
        </Card>
      </div>
  );
}