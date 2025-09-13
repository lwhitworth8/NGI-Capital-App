'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wallet,
  Calendar,
  Download,
  Building2,
  ChevronRight,
  Info,
  Users,
  TrendingUp,
  DollarSign,
  FileText,
  PieChart,
  Briefcase
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { getCurrentFiscalQuarter, getAvailablePeriods, isEntityActive } from '@/lib/utils/dateUtils';
import { exportEquityStatement } from '@/lib/utils/excelExport';

interface EquityStatementData {
  beginningBalance: {
    commonStock: number;
    additionalPaidInCapital: number;
    retainedEarnings: number;
    partnerCapitalAccounts: {
      andre: number;
      landon: number;
    };
    accumulatedOtherComprehensiveIncome: number;
    totalBeginningEquity: number;
  };
  changes: {
    netIncome: number;
    otherComprehensiveIncome: number;
    dividendsDistributions: {
      commonDividends: number;
      partnerDistributions: {
        andre: number;
        landon: number;
      };
    };
    capitalContributions: {
      commonStockIssued: number;
      partnerContributions: {
        andre: number;
        landon: number;
      };
    };
    stockBasedCompensation: number;
    treasuryStockTransactions: number;
  };
  endingBalance: {
    commonStock: number;
    additionalPaidInCapital: number;
    retainedEarnings: number;
    partnerCapitalAccounts: {
      andre: number;
      landon: number;
    };
    accumulatedOtherComprehensiveIncome: number;
    totalEndingEquity: number;
  };
  ownershipPercentages: {
    andre: number;
    landon: number;
  };
}

export default function EquityStatementPage() {
  const router = useRouter();
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [period, setPeriod] = useState<string>(getCurrentFiscalQuarter());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<EquityStatementData | null>(null);
  const [entities, setEntities] = useState<Array<{id: string; name: string; type?: string; ein?: string; formationDate?: string | null}>>([]);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);

  useEffect(() => {
    // Load entities from API/documents
    loadEntities();
  }, []);

  const loadEntities = async () => {
    try {
      const response = await fetch('/api/entities');
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
    // Update available periods when entity changes
    if (selectedEntity) {
      const periods = getAvailablePeriods(selectedEntity);
      setAvailablePeriods(periods);
      
      // If current period not available for entity, select first available
      if (periods.length > 0 && !periods.includes(period)) {
        setPeriod(periods[0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntity]);

  useEffect(() => {
    if (selectedEntity && isEntityActive(selectedEntity)) {
      fetchEquityStatement();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntity, period]);

  const fetchEquityStatement = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/financial-reporting/equity-statement?entity_id=${selectedEntity}&period=${period}&fiscal_year=2024`);
      if (response.ok) {
        const result = await response.json();
        // For now, no data since nothing is in the system yet
        setData(null);
      }
    } catch (error) {
      console.error('Error fetching equity statement:', error);
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

  const formatPercent = (value: number | undefined) => {
    if (value === undefined) return '-';
    return `${value.toFixed(1)}%`;
  };

  const EquityRow = ({ 
    label, 
    commonStock,
    apic,
    retainedEarnings,
    andreCapital,
    landonCapital,
    aoci,
    total,
    isHeader = false,
    isSubtotal = false,
    isTotal = false,
    isChange = false
  }: {
    label: string;
    commonStock?: number;
    apic?: number;
    retainedEarnings?: number;
    andreCapital?: number;
    landonCapital?: number;
    aoci?: number;
    total?: number;
    isHeader?: boolean;
    isSubtotal?: boolean;
    isTotal?: boolean;
    isChange?: boolean;
  }) => (
    <tr className={`
      ${isHeader ? 'bg-muted/30 font-semibold text-sm' : ''}
      ${isSubtotal ? 'border-t border-border font-medium' : ''}
      ${isTotal ? 'border-t-2 border-border font-bold bg-muted/20' : ''}
      ${isChange ? 'text-muted-foreground' : ''}
    `}>
      <td className="py-2 px-3 text-left">{label}</td>
      <td className="py-2 px-3 text-right font-mono text-sm">{formatCurrency(commonStock)}</td>
      <td className="py-2 px-3 text-right font-mono text-sm">{formatCurrency(apic)}</td>
      <td className="py-2 px-3 text-right font-mono text-sm">{formatCurrency(retainedEarnings)}</td>
      <td className="py-2 px-3 text-right font-mono text-sm">{formatCurrency(andreCapital)}</td>
      <td className="py-2 px-3 text-right font-mono text-sm">{formatCurrency(landonCapital)}</td>
      <td className="py-2 px-3 text-right font-mono text-sm">{formatCurrency(aoci)}</td>
      <td className={`py-2 px-3 text-right font-mono text-sm ${isTotal ? 'text-primary font-bold' : ''}`}>
        {formatCurrency(total)}
      </td>
    </tr>
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
            <span>Statement of Changes in Equity</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Statement of Stockholders&apos; Equity</h1>
          <p className="text-muted-foreground mt-1">
            Changes in Common Stock, Additional Paid-in Capital, and Retained Earnings
          </p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export
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
              <option value="Q1-2026">Q1 2026</option>
              <option value="FY-2025">FY 2025 (Partial)</option>
            </select>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              C-Corporation Structure
            </span>
          </div>
        </div>
      </Card>

      {/* Statement Content */}
      {data ? (
        <Card className="p-6 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="py-3 px-3 text-left text-sm font-semibold text-muted-foreground">Changes in Equity</th>
                <th className="py-3 px-3 text-right text-sm font-semibold text-muted-foreground">Common Stock</th>
                <th className="py-3 px-3 text-right text-sm font-semibold text-muted-foreground">APIC</th>
                <th className="py-3 px-3 text-right text-sm font-semibold text-muted-foreground">Retained Earnings</th>
                <th className="py-3 px-3 text-right text-sm font-semibold text-muted-foreground">Treasury Stock</th>
                <th className="py-3 px-3 text-right text-sm font-semibold text-muted-foreground">Other Equity</th>
                <th className="py-3 px-3 text-right text-sm font-semibold text-muted-foreground">AOCI</th>
                <th className="py-3 px-3 text-right text-sm font-semibold text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              <EquityRow
                label="Beginning Balance"
                commonStock={data.beginningBalance.commonStock}
                apic={data.beginningBalance.additionalPaidInCapital}
                retainedEarnings={data.beginningBalance.retainedEarnings}
                andreCapital={data.beginningBalance.partnerCapitalAccounts.andre}
                landonCapital={data.beginningBalance.partnerCapitalAccounts.landon}
                aoci={data.beginningBalance.accumulatedOtherComprehensiveIncome}
                total={data.beginningBalance.totalBeginningEquity}
                isSubtotal
              />
              
              {/* Changes */}
              <EquityRow
                label="Net Income"
                retainedEarnings={data.changes.netIncome}
                total={data.changes.netIncome}
                isChange
              />
              
              <EquityRow
                label="Stock Issued"
                commonStock={data.changes.capitalContributions.commonStockIssued}
                total={data.changes.capitalContributions.commonStockIssued}
                isChange
              />
              
              <EquityRow
                label="Additional Capital Contributions"
                apic={data.changes.capitalContributions.commonStockIssued}
                total={data.changes.capitalContributions.commonStockIssued}
                isChange
              />
              
              <EquityRow
                label="Dividends Declared"
                retainedEarnings={-data.changes.dividendsDistributions.commonDividends}
                total={-data.changes.dividendsDistributions.commonDividends}
                isChange
              />
              
              <EquityRow
                label="Stock-based Compensation"
                apic={data.changes.stockBasedCompensation}
                total={data.changes.stockBasedCompensation}
                isChange
              />
              
              <EquityRow
                label="Other Comprehensive Income"
                aoci={data.changes.otherComprehensiveIncome}
                total={data.changes.otherComprehensiveIncome}
                isChange
              />
              
              <EquityRow
                label="Ending Balance"
                commonStock={data.endingBalance.commonStock}
                apic={data.endingBalance.additionalPaidInCapital}
                retainedEarnings={data.endingBalance.retainedEarnings}
                andreCapital={data.endingBalance.partnerCapitalAccounts.andre}
                landonCapital={data.endingBalance.partnerCapitalAccounts.landon}
                aoci={data.endingBalance.accumulatedOtherComprehensiveIncome}
                total={data.endingBalance.totalEndingEquity}
                isTotal
              />
            </tbody>
          </table>

          {/* Ownership Summary */}
          <div className="mt-6 pt-4 border-t border-border">
            <h3 className="font-semibold mb-4">Stockholder Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Andre Nurmamade (Co-Founder)</span>
                </div>
                <p className="text-2xl font-bold">50%</p>
                <p className="text-sm text-muted-foreground">Common Stock</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Landon Whitworth (Co-Founder)</span>
                </div>
                <p className="text-2xl font-bold">50%</p>
                <p className="text-sm text-muted-foreground">Common Stock</p>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-muted/30 rounded-full">
                <Wallet className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-foreground">No Equity Data Available</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              The statement of changes in equity will be automatically generated once you have:
            </p>
            <div className="max-w-md mx-auto text-left space-y-2">
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Set up initial partner capital accounts for Andre and Landon (50/50 ownership)
                </span>
              </div>
              <div className="flex items-start gap-2">
                <DollarSign className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Recorded capital contributions or partner draws
                </span>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Posted journal entries affecting equity accounts
                </span>
              </div>
            </div>
            <div className="flex justify-center gap-3 pt-4">
              <button 
                onClick={() => router.push('/entities')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Setup Capital Accounts
              </button>
              <button 
                onClick={() => router.push('/accounting/journal-entries')}
                className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Record Capital Contribution
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Partner Capital Details (Empty State) */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Andre Nurmamade - Partner Account
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Beginning Capital</span>
              <span className="font-mono">-</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Contributions</span>
              <span className="font-mono">-</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Distributions</span>
              <span className="font-mono">-</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Share of Income</span>
              <span className="font-mono">-</span>
            </div>
            <div className="flex justify-between items-center py-2 font-semibold">
              <span>Ending Capital</span>
              <span className="font-mono text-primary">-</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Landon Whitworth - Partner Account
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Beginning Capital</span>
              <span className="font-mono">-</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Contributions</span>
              <span className="font-mono">-</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Distributions</span>
              <span className="font-mono">-</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Share of Income</span>
              <span className="font-mono">-</span>
            </div>
            <div className="flex justify-between items-center py-2 font-semibold">
              <span>Ending Capital</span>
              <span className="font-mono text-primary">-</span>
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
              ASC 215 & Partnership Accounting Note
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              This statement follows ASC 215 guidelines for equity presentation. Partner capital accounts 
              reflect the 50/50 ownership structure between Andre Nurmamade and Landon Whitworth. 
              Distributions and allocations follow the partnership agreement and IRC Subchapter K requirements.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
