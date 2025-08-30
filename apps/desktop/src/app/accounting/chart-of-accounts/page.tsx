'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  ChevronRight, 
  ChevronDown,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Building2,
  FileText,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  Filter,
  Calendar,
  Info
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { getCurrentFiscalQuarter } from '@/lib/utils/dateUtils';

interface Account {
  accountNumber: string;
  accountName: string;
  accountType: string;
  accountSubtype?: string;
  normalBalance: 'Debit' | 'Credit';
  parentAccount?: string;
  isActive: boolean;
  isHeader: boolean;
  isBankAccount?: boolean;
  balance?: number;
  children?: Account[];
  description?: string;
  ascReference?: string;
}

interface Entity {
  id: string;
  name: string;
  type: string;
  ein?: string;
  formationDate?: string | null;
}

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [showInactive, setShowInactive] = useState(false);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [entities, setEntities] = useState<Entity[]>([]);
  const [period, setPeriod] = useState<string>(getCurrentFiscalQuarter());

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
    // Fetch accounts when entity changes
    if (selectedEntity) {
      fetchAccounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntity]);

  const fetchAccounts = async () => {
    if (!selectedEntity) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `http://localhost:8001/api/financial-reporting/chart-of-accounts?entity_id=${selectedEntity}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      } else {
        // No accounts yet - will be populated from documents/Mercury
        setAccounts([]);
      }
    } catch (error) {
      console.log('No accounts found yet - will be created from documents or Mercury connection');
      setAccounts([]);
    }
  };

  const toggleExpanded = (accountNumber: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountNumber)) {
      newExpanded.delete(accountNumber);
    } else {
      newExpanded.add(accountNumber);
    }
    setExpandedAccounts(newExpanded);
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'Asset':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'Liability':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'Equity':
        return <Building2 className="h-4 w-4 text-blue-600" />;
      case 'Revenue':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'Expense':
        return <CreditCard className="h-4 w-4 text-orange-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatBalance = (amount: number | undefined, normalBalance: string) => {
    if (amount === undefined) return '-';
    const formatted = Math.abs(amount).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    });
    return amount < 0 ? `(${formatted})` : formatted;
  };

  const renderAccount = (account: Account, level: number = 0) => {
    const isExpanded = expandedAccounts.has(account.accountNumber);
    const hasChildren = account.children && account.children.length > 0;
    const shouldShow = 
      (showInactive || account.isActive) &&
      (selectedType === 'all' || account.accountType === selectedType) &&
      (searchTerm === '' || 
       account.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
       account.accountNumber.includes(searchTerm));

    if (!shouldShow && !hasChildren) return null;

    return (
      <div key={account.accountNumber}>
        <div 
          className={`
            flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded-lg cursor-pointer
            ${level > 0 ? `ml-${level * 6}` : ''}
            ${account.isHeader ? 'font-semibold' : ''}
            ${!account.isActive ? 'opacity-50' : ''}
          `}
          style={{ paddingLeft: `${level * 24 + 12}px` }}
          onClick={() => hasChildren && toggleExpanded(account.accountNumber)}
        >
          <div className="flex items-center gap-2 flex-1">
            {hasChildren && (
              isExpanded ? 
                <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            {!hasChildren && <div className="w-4" />}
            
            {getAccountTypeIcon(account.accountType)}
            
            <span className="text-sm font-medium text-muted-foreground">
              {account.accountNumber}
            </span>
            
            <span className={`text-sm ${account.isHeader ? 'font-semibold' : ''}`}>
              {account.accountName}
            </span>
            
            {account.isBankAccount && (
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs rounded-full">
                Bank
              </span>
            )}
            
            {!account.isActive && (
              <span className="px-2 py-0.5 bg-gray-500/10 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                Inactive
              </span>
            )}
            
            {account.ascReference && (
              <span className="text-xs text-muted-foreground">
                {account.ascReference}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {account.normalBalance}
            </span>
            
            {!account.isHeader && (
              <span className={`text-sm font-mono ${
                account.balance && account.balance < 0 ? 'text-red-600' : ''
              }`}>
                {formatBalance(account.balance, account.normalBalance)}
              </span>
            )}
            
            {!account.isHeader && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  // Edit account
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <Edit2 className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div>
            {account.children?.map(child => renderAccount(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Show empty state if no entities
  if (entities.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Chart of Accounts</h1>
        </div>

        <Card className="p-12">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-muted/30 rounded-full">
                <FileText className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
            <h2 className="text-2xl font-semibold">No Chart of Accounts Available</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The chart of accounts will be automatically generated when you:
            </p>
            <div className="max-w-md mx-auto text-left space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Upload formation documents to create entity structure
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Connect your Mercury Bank account
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Upload invoices or financial documents
                </span>
              </div>
            </div>
            <div className="flex justify-center gap-3 pt-4">
              <button 
                onClick={() => window.location.href = '/accounting/documents'}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Upload Documents
              </button>
              <button 
                onClick={() => window.location.href = '/banking'}
                className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Connect Mercury
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
        <div>
          <h1 className="text-3xl font-bold text-foreground">Chart of Accounts</h1>
          <p className="text-muted-foreground mt-1">
            5-digit GAAP-compliant account structure
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import
          </button>
          <button className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button 
            onClick={() => setIsAddingAccount(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Account
          </button>
        </div>
      </div>

      {/* Entity Selector */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
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

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Period: {period.replace('-', ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {accounts.length} accounts
            </span>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search accounts by name or number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Types</option>
            <option value="Asset">Assets</option>
            <option value="Liability">Liabilities</option>
            <option value="Equity">Equity</option>
            <option value="Revenue">Revenue</option>
            <option value="Expense">Expenses</option>
          </select>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm">Show Inactive</span>
          </label>
        </div>
      </Card>

      {/* Account Tree */}
      <Card className="p-4">
        <div className="space-y-1">
          {/* Header Row */}
          <div className="flex items-center justify-between py-2 px-3 border-b border-border font-semibold text-sm text-muted-foreground">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-4" />
              <div className="w-4" />
              <span className="w-20">Number</span>
              <span className="flex-1">Account Name</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="w-20">Normal</span>
              <span className="w-32 text-right">Balance</span>
              <div className="w-6" />
            </div>
          </div>
          
          {/* Account Rows */}
          <div className="space-y-0.5">
            {accounts.map(account => renderAccount(account))}
          </div>
        </div>
      </Card>

      {/* Info Message */}
      <Card className="p-4 bg-muted/30">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Automated Account Creation</p>
            <p className="text-sm text-muted-foreground">
              The chart of accounts is automatically generated from your Mercury Bank connection and uploaded documents. 
              New accounts are created as needed when transactions are imported or documents are processed. 
              The system follows GAAP standards with a 5-digit account numbering structure.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}