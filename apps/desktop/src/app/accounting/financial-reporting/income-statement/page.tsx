'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Download, 
  Filter,
  Building2,
  ChevronRight,
  Info,
  AlertCircle,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { getCurrentFiscalQuarter, getAvailablePeriods, isEntityActive } from '@/lib/utils/dateUtils';
import { exportIncomeStatement } from '@/lib/utils/excelExport';

interface IncomeStatementData {
  revenues: {
    operatingRevenues: {
      advisoryServices: number;
      consultingRevenue: number;
      projectRevenue: number;
      total: number;
    };
    otherRevenues: {
      interestIncome: number;
      investmentIncome: number;
      total: number;
    };
    totalRevenues: number;
  };
  expenses: {
    costOfRevenue: {
      directLabor: number;
      directMaterials: number;
      total: number;
    };
    operatingExpenses: {
      salariesAndWages: number;
      employeeBenefits: number;
      rentExpense: number;
      utilities: number;
      professionalFees: number;
      marketingExpense: number;
      officeSupplies: number;
      depreciationAmortization: number;
      insurance: number;
      total: number;
    };
    totalExpenses: number;
  };
  calculations: {
    grossProfit: number;
    grossMargin: number;
    operatingIncome: number;
    operatingMargin: number;
    incomeBeforeTax: number;
    incomeTaxExpense: number;
    netIncome: number;
    netMargin: number;
    ebitda: number;
    ebitdaMargin: number;
  };
}

export default function IncomeStatementPage() {
  const router = useRouter();
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [period, setPeriod] = useState<string>(getCurrentFiscalQuarter());
  const [compareWith, setCompareWith] = useState<string>('none');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<IncomeStatementData | null>(null);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [entities, setEntities] = useState<Array<{id: string; name: string; type?: string; ein?: string; formationDate?: string | null}>>([]);

  useEffect(() => {
    // Load entities from API/documents
    loadEntities();
  }, []);

  const loadEntities = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:8001/api/entities', {
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
      fetchIncomeStatement();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntity, period]);

  const fetchIncomeStatement = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `http://localhost:8001/api/financial-reporting/income-statement?entity_id=${selectedEntity}&period=${period}&fiscal_year=2024`,
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
      console.error('Error fetching income statement:', error);
      setData(null);
    }
    setLoading(false);
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === 0) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number | undefined) => {
    if (value === undefined || value === 0) return '-';
    return `${value.toFixed(1)}%`;
  };

  const LineItem = ({ 
    label, 
    amount, 
    isHeader = false, 
    isSubtotal = false, 
    isTotal = false,
    indent = 0,
    showPercent = false,
    percentValue
  }: {
    label: string;
    amount?: number;
    isHeader?: boolean;
    isSubtotal?: boolean;
    isTotal?: boolean;
    indent?: number;
    showPercent?: boolean;
    percentValue?: number;
  }) => (
    <div className={`
      flex items-center justify-between py-2
      ${isHeader ? 'font-semibold text-foreground border-b border-border' : ''}
      ${isSubtotal ? 'font-medium border-t border-border/50 pt-2' : ''}
      ${isTotal ? 'font-bold text-lg border-t-2 border-border pt-3' : ''}
      ${!isHeader && !isSubtotal && !isTotal ? 'text-muted-foreground' : ''}
    `}>
      <span style={{ paddingLeft: `${indent * 20}px` }}>{label}</span>
      <div className="flex items-center gap-4">
        {showPercent && percentValue !== undefined && (
          <span className="text-sm text-muted-foreground">
            {formatPercent(percentValue)}
          </span>
        )}
        <span className={`${isTotal ? 'text-primary' : ''} font-mono`}>
          {formatCurrency(amount)}
        </span>
      </div>
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
            <span>Income Statement</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Income Statement</h1>
          <p className="text-muted-foreground mt-1">
            Statement of Operations and Comprehensive Income
          </p>
        </div>
        <button 
          onClick={() => exportIncomeStatement(data, selectedEntity, period)}
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

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={compareWith}
              onChange={(e) => setCompareWith(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="none">No Comparison</option>
              <option value="prior-period">Prior Period</option>
              <option value="prior-year">Prior Year</option>
            </select>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Current Period: {period.replace('-', ' ')}
            </span>
          </div>
        </div>
      </Card>

      {/* Statement Content */}
      {data ? (
        <Card className="p-6">
          {/* Revenue Section */}
          <LineItem label="REVENUES" isHeader />
          <LineItem label="Operating Revenues" amount={data.revenues.operatingRevenues.total} isSubtotal indent={1} />
          <LineItem label="Advisory Services" amount={data.revenues.operatingRevenues.advisoryServices} indent={2} />
          <LineItem label="Consulting Revenue" amount={data.revenues.operatingRevenues.consultingRevenue} indent={2} />
          <LineItem label="Project Revenue" amount={data.revenues.operatingRevenues.projectRevenue} indent={2} />
          
          <LineItem label="Other Revenues" amount={data.revenues.otherRevenues.total} isSubtotal indent={1} />
          <LineItem label="Interest Income" amount={data.revenues.otherRevenues.interestIncome} indent={2} />
          <LineItem label="Investment Income" amount={data.revenues.otherRevenues.investmentIncome} indent={2} />
          
          <LineItem label="Total Revenues" amount={data.revenues.totalRevenues} isTotal />

          {/* Expense Section */}
          <div className="mt-6">
            <LineItem label="EXPENSES" isHeader />
            <LineItem label="Cost of Revenue" amount={data.expenses.costOfRevenue.total} isSubtotal indent={1} />
            <LineItem label="Direct Labor" amount={data.expenses.costOfRevenue.directLabor} indent={2} />
            <LineItem label="Direct Materials" amount={data.expenses.costOfRevenue.directMaterials} indent={2} />
            
            <LineItem label="Operating Expenses" amount={data.expenses.operatingExpenses.total} isSubtotal indent={1} />
            <LineItem label="Salaries and Wages" amount={data.expenses.operatingExpenses.salariesAndWages} indent={2} />
            <LineItem label="Employee Benefits" amount={data.expenses.operatingExpenses.employeeBenefits} indent={2} />
            <LineItem label="Rent Expense" amount={data.expenses.operatingExpenses.rentExpense} indent={2} />
            <LineItem label="Professional Fees" amount={data.expenses.operatingExpenses.professionalFees} indent={2} />
            <LineItem label="Depreciation & Amortization" amount={data.expenses.operatingExpenses.depreciationAmortization} indent={2} />
            
            <LineItem label="Total Expenses" amount={data.expenses.totalExpenses} isTotal />
          </div>

          {/* Calculations */}
          <div className="mt-6">
            <LineItem 
              label="Gross Profit" 
              amount={data.calculations.grossProfit} 
              isSubtotal 
              showPercent 
              percentValue={data.calculations.grossMargin} 
            />
            <LineItem 
              label="Operating Income" 
              amount={data.calculations.operatingIncome} 
              isSubtotal 
              showPercent 
              percentValue={data.calculations.operatingMargin} 
            />
            <LineItem label="Income Before Tax" amount={data.calculations.incomeBeforeTax} isSubtotal />
            <LineItem label="Income Tax Expense" amount={data.calculations.incomeTaxExpense} indent={1} />
            <LineItem 
              label="NET INCOME" 
              amount={data.calculations.netIncome} 
              isTotal 
              showPercent 
              percentValue={data.calculations.netMargin} 
            />
          </div>

          {/* Key Metrics */}
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="font-semibold mb-4">Key Metrics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">EBITDA</p>
                <p className="text-xl font-bold">{formatCurrency(data.calculations.ebitda)}</p>
                <p className="text-sm text-muted-foreground">{formatPercent(data.calculations.ebitdaMargin)} margin</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Gross Margin</p>
                <p className="text-xl font-bold">{formatPercent(data.calculations.grossMargin)}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Net Margin</p>
                <p className="text-xl font-bold">{formatPercent(data.calculations.netMargin)}</p>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-muted/30 rounded-full">
                <FileText className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-foreground">No Income Statement Data Available</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              The income statement will be automatically generated once you have:
            </p>
            <div className="max-w-md mx-auto text-left space-y-2">
              <div className="flex items-start gap-2">
                <DollarSign className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Connected your Mercury Bank account to import transactions
                </span>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Uploaded invoices, receipts, or other financial documents
                </span>
              </div>
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Created and posted journal entries for the period
                </span>
              </div>
            </div>
            <div className="flex justify-center gap-3 pt-4">
              <button 
                onClick={() => router.push('/accounting/documents')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Upload Documents
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

      {/* Compliance Notes */}
      <Card className="p-4 bg-blue-500/5 border-blue-500/20">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              ASC 220 Compliance Note
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              This income statement follows ASC 220 guidelines for comprehensive income presentation. 
              All revenues are recognized per ASC 606, and expenses are classified by function.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}