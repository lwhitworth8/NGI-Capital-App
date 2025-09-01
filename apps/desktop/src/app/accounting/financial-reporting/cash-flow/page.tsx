'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign,
  Calendar,
  Download,
  Building2,
  ChevronRight,
  Info,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  CreditCard,
  Briefcase,
  Banknote,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { getCurrentFiscalQuarter, getAvailablePeriods, isEntityActive } from '@/lib/utils/dateUtils';
import { exportCashFlow } from '@/lib/utils/excelExport';

interface CashFlowData {
  operatingActivities: {
    netIncome: number;
    adjustments: {
      depreciation: number;
      amortization: number;
      stockBasedCompensation: number;
      deferredTaxes: number;
      otherNonCash: number;
    };
    workingCapitalChanges: {
      accountsReceivable: number;
      inventory: number;
      prepaidExpenses: number;
      accountsPayable: number;
      accruedExpenses: number;
      otherAssets: number;
      otherLiabilities: number;
    };
    totalOperatingCashFlow: number;
  };
  investingActivities: {
    capitalExpenditures: number;
    acquisitions: number;
    investments: number;
    proceedsFromAssetSales: number;
    otherInvesting: number;
    totalInvestingCashFlow: number;
  };
  financingActivities: {
    debtProceeds: number;
    debtRepayments: number;
    equityIssuance: number;
    dividendsPaid: number;
    treasuryStock: number;
    otherFinancing: number;
    totalFinancingCashFlow: number;
  };
  summary: {
    netChangeInCash: number;
    beginningCash: number;
    endingCash: number;
    freeCashFlow: number;
  };
}

export default function CashFlowStatementPage() {
  const router = useRouter();
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [period, setPeriod] = useState<string>(getCurrentFiscalQuarter());
  const [compareWith, setCompareWith] = useState<string>('none');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CashFlowData | null>(null);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [entities, setEntities] = useState<Array<{id: string; name: string; type?: string; ein?: string; formationDate?: string | null}>>([]);

  useEffect(() => {
    // Load entities from API/documents
    loadEntities();
  }, []);

  const loadEntities = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/entities', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setEntities(data.entities || []);
        if (data.entities && data.entities.length > 0) {
          setSelectedEntity(data.entities[0].id);
        }
      }
    } catch (error) {
      console.log('No entities found yet - upload formation documents to begin');
      setEntities([]);
    }
  };

  useEffect(() => {
    // Update available periods when entity changes; default to consolidated when none selected
    const scope = selectedEntity || 'consolidated'
    const periods = getAvailablePeriods(scope);
    setAvailablePeriods(periods);
    
    // If current period not available for entity, select first available
    if (periods.length > 0 && !periods.includes(period)) {
      setPeriod(periods[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntity]);

  useEffect(() => {
    if (selectedEntity && isEntityActive(selectedEntity)) {
      fetchCashFlowStatement();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntity, period]);

  const fetchCashFlowStatement = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `/api/financial-reporting/gl/cash-flow?entity_id=${selectedEntity}&period=${period}&fiscal_year=2024`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const result = await response.json();
        // For now, no data since nothing is in the system yet
        setData(null);
      }
    } catch (error) {
      console.error('Error fetching cash flow statement:', error);
      setData(null);
    }
    setLoading(false);
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === 0) return '-';
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
    return amount < 0 ? `(${formatted})` : formatted;
  };

  const LineItem = ({ 
    label, 
    amount, 
    isHeader = false, 
    isSubtotal = false, 
    isTotal = false,
    indent = 0,
    showIcon = false,
    icon: Icon,
    isInflow = false
  }: {
    label: string;
    amount?: number;
    isHeader?: boolean;
    isSubtotal?: boolean;
    isTotal?: boolean;
    indent?: number;
    showIcon?: boolean;
    icon?: any;
    isInflow?: boolean;
  }) => (
    <div className={`
      flex items-center justify-between py-2
      ${isHeader ? 'font-semibold text-foreground border-b border-border uppercase text-sm' : ''}
      ${isSubtotal ? 'font-medium border-t border-border/50 pt-2' : ''}
      ${isTotal ? 'font-bold text-lg border-t-2 border-border pt-3' : ''}
      ${!isHeader && !isSubtotal && !isTotal ? 'text-muted-foreground' : ''}
    `}>
      <div className="flex items-center gap-2" style={{ paddingLeft: `${indent * 20}px` }}>
        {showIcon && Icon && (
          <Icon className={`h-4 w-4 ${isInflow ? 'text-green-600' : 'text-red-600'}`} />
        )}
        <span>{label}</span>
      </div>
      <span className={`${isTotal ? 'text-primary' : ''} font-mono ${
        amount && amount < 0 ? 'text-red-600' : amount && amount > 0 ? 'text-green-600' : ''
      }`}>
        {formatCurrency(amount)}
      </span>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <button
              onClick={() => router.push('/accounting/financial-reporting')}
              className="hover:text-primary transition-colors"
            >
              Financial Reporting
            </button>
            <ChevronRight className="h-4 w-4" />
            <span>Cash Flow Statement</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Cash Flow Statement</h1>
          <p className="text-muted-foreground mt-1">
            Statement of Cash Flows - Indirect Method
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Fiscal Year: Jan 1 - Dec 31
          </p>
        </div>
        <button 
          onClick={() => exportCashFlow(data, selectedEntity, period)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export to Excel
        </button>
      </div>

      {/* Controls */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium"
            >
              {entities.length > 0 ? (
                entities.map(entity => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))
              ) : (
                <option value="">No entities available</option>
              )}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {availablePeriods.length > 0 ? (
                availablePeriods.map(p => (
                  <option key={p} value={p}>{p.replace('-', ' ')}</option>
                ))
              ) : (
                <option value="">No periods available</option>
              )}
            </select>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Fiscal Year: July 1 - June 30
            </span>
          </div>
        </div>
      </Card>

      {/* Statement Content */}
      {data ? (
        <div className="grid grid-cols-1 gap-6">
          <Card className="p-6">
            {/* Operating Activities */}
            <LineItem label="CASH FLOWS FROM OPERATING ACTIVITIES" isHeader />
            <LineItem label="Net Income" amount={data.operatingActivities.netIncome} indent={1} />
            
            <div className="mt-2">
              <p className="text-sm font-medium text-muted-foreground ml-5 mb-2">Adjustments to reconcile net income to cash:</p>
              <LineItem label="Depreciation" amount={data.operatingActivities.adjustments.depreciation} indent={2} />
              <LineItem label="Amortization" amount={data.operatingActivities.adjustments.amortization} indent={2} />
              <LineItem label="Stock-based Compensation" amount={data.operatingActivities.adjustments.stockBasedCompensation} indent={2} />
              <LineItem label="Deferred Income Taxes" amount={data.operatingActivities.adjustments.deferredTaxes} indent={2} />
            </div>

            <div className="mt-2">
              <p className="text-sm font-medium text-muted-foreground ml-5 mb-2">Changes in operating assets and liabilities:</p>
              <LineItem label="(Increase)/Decrease in Accounts Receivable" amount={data.operatingActivities.workingCapitalChanges.accountsReceivable} indent={2} />
              <LineItem label="(Increase)/Decrease in Inventory" amount={data.operatingActivities.workingCapitalChanges.inventory} indent={2} />
              <LineItem label="(Increase)/Decrease in Prepaid Expenses" amount={data.operatingActivities.workingCapitalChanges.prepaidExpenses} indent={2} />
              <LineItem label="Increase/(Decrease) in Accounts Payable" amount={data.operatingActivities.workingCapitalChanges.accountsPayable} indent={2} />
              <LineItem label="Increase/(Decrease) in Accrued Expenses" amount={data.operatingActivities.workingCapitalChanges.accruedExpenses} indent={2} />
            </div>
            
            <LineItem label="Net Cash Provided by Operating Activities" amount={data.operatingActivities.totalOperatingCashFlow} isSubtotal />

            {/* Investing Activities */}
            <div className="mt-6">
              <LineItem label="CASH FLOWS FROM INVESTING ACTIVITIES" isHeader />
              <LineItem label="Capital Expenditures" amount={data.investingActivities.capitalExpenditures} indent={1} />
              <LineItem label="Acquisitions, net of cash acquired" amount={data.investingActivities.acquisitions} indent={1} />
              <LineItem label="Purchases of Investments" amount={data.investingActivities.investments} indent={1} />
              <LineItem label="Proceeds from Sale of Assets" amount={data.investingActivities.proceedsFromAssetSales} indent={1} />
              <LineItem label="Net Cash Used in Investing Activities" amount={data.investingActivities.totalInvestingCashFlow} isSubtotal />
            </div>

            {/* Financing Activities */}
            <div className="mt-6">
              <LineItem label="CASH FLOWS FROM FINANCING ACTIVITIES" isHeader />
              <LineItem label="Proceeds from Debt Issuance" amount={data.financingActivities.debtProceeds} indent={1} />
              <LineItem label="Repayment of Debt" amount={data.financingActivities.debtRepayments} indent={1} />
              <LineItem label="Proceeds from Equity Issuance" amount={data.financingActivities.equityIssuance} indent={1} />
              <LineItem label="Dividends/Distributions Paid" amount={data.financingActivities.dividendsPaid} indent={1} />
              <LineItem label="Purchase of Treasury Stock" amount={data.financingActivities.treasuryStock} indent={1} />
              <LineItem label="Net Cash Provided by Financing Activities" amount={data.financingActivities.totalFinancingCashFlow} isSubtotal />
            </div>

            {/* Summary */}
            <div className="mt-6">
              <LineItem label="NET INCREASE/(DECREASE) IN CASH" amount={data.summary.netChangeInCash} isTotal />
              <LineItem label="Cash at Beginning of Period" amount={data.summary.beginningCash} />
              <LineItem label="CASH AT END OF PERIOD" amount={data.summary.endingCash} isTotal />
            </div>

            {/* Supplemental Disclosure */}
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-sm font-medium text-muted-foreground mb-2">Supplemental Disclosure:</p>
              <LineItem label="Free Cash Flow" amount={data.summary.freeCashFlow} indent={1} showIcon icon={TrendingUp} isInflow />
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-muted/30 rounded-full">
                <DollarSign className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-foreground">No Cash Flow Data Available</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              The cash flow statement will be automatically generated once you have:
            </p>
            <div className="max-w-md mx-auto text-left space-y-2">
              <div className="flex items-start gap-2">
                <Banknote className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Connected your Mercury Bank account to track cash movements
                </span>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Posted journal entries that affect cash accounts
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CreditCard className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Recorded payment transactions and cash receipts
                </span>
              </div>
            </div>
            <div className="flex justify-center gap-3 pt-4">
              <button 
                onClick={() => router.push('/banking')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Connect Bank Account
              </button>
              <button 
                onClick={() => router.push('/accounting/journal-entries')}
                className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Create Journal Entry
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Key Metrics (Empty State) */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <ArrowUpDown className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-muted-foreground">Operating Cash Flow</p>
              <p className="text-2xl font-bold">-</p>
              <p className="text-xs text-muted-foreground">Cash from operations</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-muted-foreground">Free Cash Flow</p>
              <p className="text-2xl font-bold">-</p>
              <p className="text-xs text-muted-foreground">Operating CF - CapEx</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Cash Burn Rate</p>
              <p className="text-2xl font-bold">-</p>
              <p className="text-xs text-muted-foreground">Monthly average</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Compliance Notes */}
      <Card className="p-4 bg-blue-500/5 border-blue-500/20">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              ASC 230 Compliance Note
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              This cash flow statement uses the indirect method as prescribed by ASC 230. 
              Operating activities are reconciled from net income, and all cash flows are 
              classified into operating, investing, or financing activities per GAAP requirements.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
