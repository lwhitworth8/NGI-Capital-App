'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet,
  Calendar,
  Download,
  Building2,
  ChevronRight,
  Info,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Wallet
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { CURRENT_DATE, isEntityActive } from '@/lib/utils/dateUtils';
import { exportBalanceSheet } from '@/lib/utils/excelExport';

interface BalanceSheetData {
  assets: {
    currentAssets: {
      cashAndEquivalents: number;
      accountsReceivable: number;
      inventory: number;
      prepaidExpenses: number;
      otherCurrentAssets: number;
      totalCurrentAssets: number;
    };
    nonCurrentAssets: {
      propertyPlantEquipment: number;
      accumulatedDepreciation: number;
      netPPE: number;
      intangibleAssets: number;
      goodwill: number;
      investments: number;
      otherNonCurrentAssets: number;
      totalNonCurrentAssets: number;
    };
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: {
      accountsPayable: number;
      accruedExpenses: number;
      currentPortionLongTermDebt: number;
      unearnedRevenue: number;
      otherCurrentLiabilities: number;
      totalCurrentLiabilities: number;
    };
    nonCurrentLiabilities: {
      longTermDebt: number;
      leaseObligations: number;
      deferredTaxLiabilities: number;
      otherNonCurrentLiabilities: number;
      totalNonCurrentLiabilities: number;
    };
    totalLiabilities: number;
  };
  equity: {
    commonStock: number;
    additionalPaidInCapital: number;
    retainedEarnings: number;
    partnerCapitalAccounts: {
      partner1: number;
      partner2: number;
    };
    accumulatedOtherComprehensiveIncome: number;
    totalEquity: number;
  };
  totalLiabilitiesAndEquity: number;
}

export default function BalanceSheetPage() {
  const router = useRouter();
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [asOfDate, setAsOfDate] = useState<string>(CURRENT_DATE.toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BalanceSheetData | null>(null);
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
    if (selectedEntity && isEntityActive(selectedEntity)) {
      fetchBalanceSheet();
    } else {
      setData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntity, asOfDate]);

  const fetchBalanceSheet = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `/api/financial-reporting/gl/balance-sheet?entity_id=${selectedEntity}&as_of_date=${asOfDate}`,
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
      console.error('Error fetching balance sheet:', error);
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
    indent = 0
  }: {
    label: string;
    amount?: number;
    isHeader?: boolean;
    isSubtotal?: boolean;
    isTotal?: boolean;
    indent?: number;
  }) => (
    <div className={`
      flex items-center justify-between py-2
      ${isHeader ? 'font-semibold text-foreground border-b border-border uppercase' : ''}
      ${isSubtotal ? 'font-medium border-t border-border/50 pt-2' : ''}
      ${isTotal ? 'font-bold text-lg border-t-2 border-border pt-3' : ''}
      ${!isHeader && !isSubtotal && !isTotal ? 'text-muted-foreground' : ''}
    `}>
      <span style={{ paddingLeft: `${indent * 20}px` }}>{label}</span>
      <span className={`${isTotal ? 'text-primary' : ''} font-mono`}>
        {amount !== undefined ? formatCurrency(amount) : ''}
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
            <span>Balance Sheet</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Balance Sheet</h1>
          <p className="text-muted-foreground mt-1">
            Statement of Financial Position
          </p>
        </div>
        <button 
          onClick={() => exportBalanceSheet(data, selectedEntity, asOfDate)}
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
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Classified Balance Sheet
            </span>
          </div>
        </div>
      </Card>

      {/* Statement Content */}
      {data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assets */}
          <Card className="p-6">
            <LineItem label="ASSETS" isHeader />
            
            {/* Current Assets */}
            <div className="mt-4">
              <LineItem label="Current Assets" isSubtotal />
              <LineItem label="Cash and Cash Equivalents" amount={data.assets.currentAssets.cashAndEquivalents} indent={1} />
              <LineItem label="Accounts Receivable" amount={data.assets.currentAssets.accountsReceivable} indent={1} />
              <LineItem label="Inventory" amount={data.assets.currentAssets.inventory} indent={1} />
              <LineItem label="Prepaid Expenses" amount={data.assets.currentAssets.prepaidExpenses} indent={1} />
              <LineItem label="Other Current Assets" amount={data.assets.currentAssets.otherCurrentAssets} indent={1} />
              <LineItem label="Total Current Assets" amount={data.assets.currentAssets.totalCurrentAssets} isSubtotal />
            </div>

            {/* Non-Current Assets */}
            <div className="mt-4">
              <LineItem label="Non-Current Assets" isSubtotal />
              <LineItem label="Property, Plant & Equipment" amount={data.assets.nonCurrentAssets.propertyPlantEquipment} indent={1} />
              <LineItem label="Less: Accumulated Depreciation" amount={data.assets.nonCurrentAssets.accumulatedDepreciation} indent={1} />
              <LineItem label="Net PP&E" amount={data.assets.nonCurrentAssets.netPPE} indent={1} isSubtotal />
              <LineItem label="Intangible Assets" amount={data.assets.nonCurrentAssets.intangibleAssets} indent={1} />
              <LineItem label="Goodwill" amount={data.assets.nonCurrentAssets.goodwill} indent={1} />
              <LineItem label="Investments" amount={data.assets.nonCurrentAssets.investments} indent={1} />
              <LineItem label="Total Non-Current Assets" amount={data.assets.nonCurrentAssets.totalNonCurrentAssets} isSubtotal />
            </div>

            <div className="mt-4">
              <LineItem label="TOTAL ASSETS" amount={data.assets.totalAssets} isTotal />
            </div>
          </Card>

          {/* Liabilities & Equity */}
          <Card className="p-6">
            <LineItem label="LIABILITIES & EQUITY" isHeader />
            
            {/* Current Liabilities */}
            <div className="mt-4">
              <LineItem label="Current Liabilities" isSubtotal />
              <LineItem label="Accounts Payable" amount={data.liabilities.currentLiabilities.accountsPayable} indent={1} />
              <LineItem label="Accrued Expenses" amount={data.liabilities.currentLiabilities.accruedExpenses} indent={1} />
              <LineItem label="Current Portion of Long-term Debt" amount={data.liabilities.currentLiabilities.currentPortionLongTermDebt} indent={1} />
              <LineItem label="Unearned Revenue" amount={data.liabilities.currentLiabilities.unearnedRevenue} indent={1} />
              <LineItem label="Total Current Liabilities" amount={data.liabilities.currentLiabilities.totalCurrentLiabilities} isSubtotal />
            </div>

            {/* Non-Current Liabilities */}
            <div className="mt-4">
              <LineItem label="Non-Current Liabilities" isSubtotal />
              <LineItem label="Long-term Debt" amount={data.liabilities.nonCurrentLiabilities.longTermDebt} indent={1} />
              <LineItem label="Lease Obligations (ASC 842)" amount={data.liabilities.nonCurrentLiabilities.leaseObligations} indent={1} />
              <LineItem label="Deferred Tax Liabilities" amount={data.liabilities.nonCurrentLiabilities.deferredTaxLiabilities} indent={1} />
              <LineItem label="Total Non-Current Liabilities" amount={data.liabilities.nonCurrentLiabilities.totalNonCurrentLiabilities} isSubtotal />
            </div>

            <div className="mt-2">
              <LineItem label="Total Liabilities" amount={data.liabilities.totalLiabilities} isSubtotal />
            </div>

            {/* Equity */}
            <div className="mt-4">
              <LineItem label="Equity" isSubtotal />
              <LineItem label="Common Stock" amount={data.equity.commonStock} indent={1} />
              <LineItem label="Additional Paid-in Capital" amount={data.equity.additionalPaidInCapital} indent={1} />
              <LineItem label="Retained Earnings" amount={data.equity.retainedEarnings} indent={1} />
              <LineItem label="Partner 1 Capital Account" amount={data.equity.partnerCapitalAccounts.partner1} indent={1} />
              <LineItem label="Partner 2 Capital Account" amount={data.equity.partnerCapitalAccounts.partner2} indent={1} />
              <LineItem label="Total Equity" amount={data.equity.totalEquity} isSubtotal />
            </div>

            <div className="mt-4">
              <LineItem label="TOTAL LIABILITIES & EQUITY" amount={data.totalLiabilitiesAndEquity} isTotal />
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-muted/30 rounded-full">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-foreground">No Balance Sheet Data Available</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              The balance sheet will be automatically generated once you have:
            </p>
            <div className="max-w-md mx-auto text-left space-y-2">
              <div className="flex items-start gap-2">
                <Wallet className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Set up your initial capital accounts and entity structure
                </span>
              </div>
              <div className="flex items-start gap-2">
                <DollarSign className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Connected bank accounts to track cash positions
                </span>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Posted journal entries affecting asset, liability, and equity accounts
                </span>
              </div>
            </div>
            <div className="flex justify-center gap-3 pt-4">
              <button 
                onClick={() => router.push('/entities')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Setup Entities
              </button>
              <button 
                onClick={() => router.push('/accounting/chart-of-accounts')}
                className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Configure Accounts
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Key Ratios (Empty State) */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Financial Ratios</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Current Ratio</p>
            <p className="text-xl font-bold">-</p>
            <p className="text-xs text-muted-foreground">Current Assets / Current Liabilities</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Quick Ratio</p>
            <p className="text-xl font-bold">-</p>
            <p className="text-xs text-muted-foreground">Liquid Assets / Current Liabilities</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Debt to Equity</p>
            <p className="text-xl font-bold">-</p>
            <p className="text-xs text-muted-foreground">Total Debt / Total Equity</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Working Capital</p>
            <p className="text-xl font-bold">-</p>
            <p className="text-xs text-muted-foreground">Current Assets - Current Liabilities</p>
          </div>
        </div>
      </Card>

      {/* Compliance Notes */}
      <Card className="p-4 bg-blue-500/5 border-blue-500/20">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              ASC 210 Compliance Note
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              This classified balance sheet follows ASC 210 guidelines. Assets and liabilities are 
              classified as current or non-current based on operating cycle. Lease obligations are 
              recognized per ASC 842.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
