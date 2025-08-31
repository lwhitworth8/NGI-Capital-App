'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileBarChart, 
  TrendingUp, 
  FileSpreadsheet, 
  DollarSign, 
  Building2,
  Calendar,
  Download,
  ChevronRight,
  Info,
  FileText,
  Users,
  Lock,
  CheckCircle,
  AlertCircle,
  Upload
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { exportAllStatements } from '@/lib/utils/excelExport';
import { getCurrentFiscalQuarter, getAllAvailablePeriods } from '@/lib/utils/dateUtils';

interface Entity {
  id: string;
  name: string;
  type: string;
  ein?: string;
  status?: 'active' | 'pending';
  formationDate?: string | null;
}

interface FinancialStatement {
  id: string;
  name: string;
  description: string;
  icon: any;
  lastUpdated: string;
  status: 'current' | 'pending' | 'review';
  requiresApproval?: boolean;
}

export default function FinancialReportingPage() {
  const router = useRouter();
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [reportingPeriod, setReportingPeriod] = useState<string>(getCurrentFiscalQuarter());
  const [entities, setEntities] = useState<Entity[]>([]);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  
  // Get current user email from session/auth (mock for now)
  const currentUserEmail: string = 'lwhitworth@ngicapitaladvisory.com'; // This would come from auth context

  useEffect(() => {
    // Load entities from database/API
    loadEntities();
    // Load available periods
    const periods = getAllAvailablePeriods();
    setAvailablePeriods(periods);
  }, []);

  const loadEntities = async () => {
    try {
      // This would fetch from API/database
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/entities', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setEntities(data.entities);
        // Set first entity as default if available
        if (data.entities.length > 0) {
          setSelectedEntity(data.entities[0].id);
        }
      }
    } catch (error) {
      console.log('No entities found yet - upload formation documents to begin');
      // For now, show empty state
      setEntities([]);
    }
  };

  const financialStatements: FinancialStatement[] = [
    {
      id: 'income-statement',
      name: 'Income Statement',
      description: 'Revenue, expenses, and profitability',
      icon: TrendingUp,
      lastUpdated: '-',
      status: 'pending',
    },
    {
      id: 'balance-sheet',
      name: 'Balance Sheet',
      description: 'Assets, liabilities, and equity position',
      icon: FileSpreadsheet,
      lastUpdated: '-',
      status: 'pending',
    },
    {
      id: 'cash-flow',
      name: 'Cash Flow Statement',
      description: 'Operating, investing, and financing activities',
      icon: DollarSign,
      lastUpdated: '-',
      status: 'pending',
    },
    {
      id: 'equity-statement',
      name: 'Statement of Stockholders\' Equity',
      description: 'Changes in retained earnings and equity accounts',
      icon: Users,
      lastUpdated: '-',
      status: 'pending',
      requiresApproval: true,
    }
  ];

  const currentEntity = entities.find(e => e.id === selectedEntity);

  // If no entities exist yet, show setup screen
  if (entities.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Financial Reporting</h1>
        </div>

        <Card className="p-12">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-muted/30 rounded-full">
                <Upload className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
            <h2 className="text-2xl font-semibold">Welcome to NGI Capital Financial Reporting</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              To begin using the financial reporting system, please upload your formation documents. 
              The system will automatically extract entity information, formation dates, and corporate structure 
              from your legal documents.
            </p>
            
            <div className="max-w-md mx-auto text-left space-y-3 bg-muted/30 p-6 rounded-lg">
              <h3 className="font-medium mb-2">Upload Documents (Including Pre-Formation):</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <span className="text-sm font-medium">NGI Capital LLC (Current)</span>
                    <span className="text-xs text-muted-foreground block">Operating Agreement, EIN Letter</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <span className="text-sm font-medium">NGI Capital, Inc. (Converting)</span>
                    <span className="text-xs text-muted-foreground block">LLC to C-Corp conversion docs</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <span className="text-sm font-medium">NGI Capital Advisory LLC</span>
                    <span className="text-xs text-muted-foreground block">Pre-formation documents</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <span className="text-sm font-medium">The Creator Terminal, Inc.</span>
                    <span className="text-xs text-muted-foreground block">Pre-formation documents</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button 
                onClick={() => router.push('/accounting/documents')}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Upload className="h-5 w-5" />
                Upload Formation Documents
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Financial Reporting</h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => exportAllStatements(null, null, null, null, selectedEntity, reportingPeriod)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Financial Package
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Entity Selector */}
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium"
              >
                {entities.map(entity => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Period Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <select
                value={reportingPeriod}
                onChange={(e) => setReportingPeriod(e.target.value)}
                className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {availablePeriods.map(period => (
                  <option key={period} value={period}>
                    {period === 'YTD' ? 'Year to Date' : 
                     period === 'MTD' ? 'Month to Date' :
                     period.replace('-', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Entity Status */}
          <div className="flex items-center gap-4">
            {currentEntity?.status === 'active' ? (
              <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                Active Entity
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm text-yellow-600 dark:text-yellow-400">
                <AlertCircle className="h-4 w-4" />
                Pending Setup
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Co-Founder Approval Status Bar */}
      <Card className="p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Co-Founder Approval Controls</p>
              <p className="text-xs text-muted-foreground">
                All transactions require dual approval from co-founders
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 ${currentUserEmail === 'anurmamade@ngicapitaladvisory.com' ? 'bg-green-500' : 'bg-gray-400'} rounded-full`}></div>
              <span>Andre: {currentUserEmail === 'anurmamade@ngicapitaladvisory.com' ? 'Online' : 'Offline'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 ${currentUserEmail === 'lwhitworth@ngicapitaladvisory.com' ? 'bg-green-500' : 'bg-gray-400'} rounded-full`}></div>
              <span>Landon: {currentUserEmail === 'lwhitworth@ngicapitaladvisory.com' ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Financial Statements Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {financialStatements.map((statement) => {
          const Icon = statement.icon;
          return (
            <Card 
              key={statement.id} 
              className="p-6 hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => router.push(`/accounting/financial-reporting/${statement.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {statement.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {statement.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-muted-foreground">
                        Updated: {statement.lastUpdated}
                      </span>
                      {statement.requiresApproval && (
                        <span className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                          <Lock className="h-3 w-3" />
                          Requires Co-Founder Approval
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>

              {/* Empty State */}
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground text-center py-4">
                  Awaiting transactions and journal entries
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions for CFO Tasks */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button 
          onClick={() => router.push('/accounting/journal-entries')}
          className="p-4 bg-card border border-border rounded-lg hover:bg-muted transition-colors text-left"
        >
          <FileText className="h-5 w-5 text-primary mb-2" />
          <p className="text-sm font-medium text-foreground">Review Journal Entries</p>
          <p className="text-xs text-muted-foreground mt-1">0 pending approval</p>
        </button>
        
        <button 
          onClick={() => router.push('/accounting/documents')}
          className="p-4 bg-card border border-border rounded-lg hover:bg-muted transition-colors text-left"
        >
          <FileBarChart className="h-5 w-5 text-primary mb-2" />
          <p className="text-sm font-medium text-foreground">Process Documents</p>
          <p className="text-xs text-muted-foreground mt-1">OCR and data extraction</p>
        </button>
        
        <button 
          onClick={() => router.push('/entities')}
          className="p-4 bg-card border border-border rounded-lg hover:bg-muted transition-colors text-left"
        >
          <Building2 className="h-5 w-5 text-primary mb-2" />
          <p className="text-sm font-medium text-foreground">Entity Management</p>
          <p className="text-xs text-muted-foreground mt-1">{entities.length} entities</p>
        </button>
        
        <button 
          onClick={() => router.push('/banking')}
          className="p-4 bg-card border border-border rounded-lg hover:bg-muted transition-colors text-left"
        >
          <DollarSign className="h-5 w-5 text-primary mb-2" />
          <p className="text-sm font-medium text-foreground">Bank Reconciliation</p>
          <p className="text-xs text-muted-foreground mt-1">Connect Mercury</p>
        </button>
      </div>

      {/* Entity Transition Notice */}
      <Card className="p-4 bg-yellow-500/5 border-yellow-500/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">Entity Structure Transition</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              NGI Capital LLC is converting to NGI Capital, Inc. (C-Corp) to meet UC Investments requirements. 
              All formation costs for new entities (NGI Advisory LLC, The Creator Terminal, Inc.) are being tracked 
              through the original LLC and will be properly allocated after conversion. Pre-formation documents can 
              be uploaded to establish the audit trail.
            </p>
          </div>
        </div>
      </Card>

      {/* Notes Section */}
      <Card className="p-4 bg-muted/30">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Formation Cost Tracking</p>
            <p className="text-sm text-muted-foreground">
              All entity formation costs, legal fees, and state filing fees are automatically tracked through the 
              original NGI Capital LLC. The system will properly allocate these costs to each entity upon formation 
              completion and maintain full audit trail for tax purposes.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
