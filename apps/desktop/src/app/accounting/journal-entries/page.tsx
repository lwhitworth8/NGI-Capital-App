'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus,
  Search,
  Filter,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Edit2,
  Copy,
  X,
  Upload,
  Download,
  RefreshCw,
  DollarSign,
  Calendar,
  Building2,
  Hash,
  ArrowRight,
  Check,
  XCircle,
  Info,
  Lock
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { getCurrentFiscalQuarter } from '@/lib/utils/dateUtils';

interface JournalEntry {
  entryId: number;
  entryNumber: string;
  entryDate: string;
  postingDate: string;
  entryType: 'Standard' | 'Adjusting' | 'Closing' | 'Reversing' | 'Recurring' | 'Automated' | 'Import';
  description: string;
  reference?: string;
  source?: string;
  entityId: string;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Posted' | 'Reversed' | 'Void';
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  lines: JournalEntryLine[];
}

interface JournalEntryLine {
  lineNumber: number;
  accountNumber: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  description?: string;
  entityId?: string;
}

interface NewEntryLine {
  accountNumber: string;
  accountName: string;
  debit: string;
  credit: string;
  description: string;
}

interface Entity {
  id: string;
  name: string;
  type: string;
  ein?: string;
  formationDate?: string | null;
}

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [entities, setEntities] = useState<Entity[]>([]);
  const [period, setPeriod] = useState<string>(getCurrentFiscalQuarter());
  
  // New Entry Form State
  const [newEntry, setNewEntry] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    entityId: '',
    entryType: 'Standard' as JournalEntry['entryType'],
    lines: [
      { accountNumber: '', accountName: '', debit: '', credit: '', description: '' },
      { accountNumber: '', accountName: '', debit: '', credit: '', description: '' }
    ] as NewEntryLine[]
  });

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
          setNewEntry(prev => ({ ...prev, entityId: data.entities[0].id }));
        }
      }
    } catch (error) {
      console.log('No entities found yet - upload formation documents to begin');
      setEntities([]);
    }
  };

  useEffect(() => {
    // Load entries when entity changes
    if (selectedEntity) {
      loadJournalEntries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntity]);

  const loadJournalEntries = async () => {
    if (!selectedEntity) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `http://localhost:8001/api/journal-entries?entity_id=${selectedEntity}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries || []);
        setFilteredEntries(data.entries || []);
      } else {
        // No entries yet - will be created from documents/Mercury
        setEntries([]);
        setFilteredEntries([]);
      }
    } catch (error) {
      console.log('No journal entries found yet');
      setEntries([]);
      setFilteredEntries([]);
    }
  };

  useEffect(() => {
    // Apply filters
    let filtered = entries;
    
    if (searchTerm) {
      filtered = filtered.filter(entry => 
        entry.entryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.reference?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(entry => entry.status === statusFilter);
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(entry => entry.entryType === typeFilter);
    }
    
    setFilteredEntries(filtered);
  }, [entries, searchTerm, statusFilter, typeFilter, dateRange]);

  const addNewLine = () => {
    setNewEntry({
      ...newEntry,
      lines: [
        ...newEntry.lines,
        { accountNumber: '', accountName: '', debit: '', credit: '', description: '' }
      ]
    });
  };

  const removeLine = (index: number) => {
    if (newEntry.lines.length > 2) {
      setNewEntry({
        ...newEntry,
        lines: newEntry.lines.filter((_, i) => i !== index)
      });
    }
  };

  const updateLine = (index: number, field: keyof NewEntryLine, value: string) => {
    const updatedLines = [...newEntry.lines];
    updatedLines[index] = { ...updatedLines[index], [field]: value };
    setNewEntry({ ...newEntry, lines: updatedLines });
  };

  const calculateTotals = () => {
    const totalDebits = newEntry.lines.reduce((sum, line) => 
      sum + (parseFloat(line.debit) || 0), 0
    );
    const totalCredits = newEntry.lines.reduce((sum, line) => 
      sum + (parseFloat(line.credit) || 0), 0
    );
    return { totalDebits, totalCredits, isBalanced: totalDebits === totalCredits && totalDebits > 0 };
  };

  const getStatusBadge = (status: JournalEntry['status']) => {
    switch (status) {
      case 'Draft':
        return <span className="px-2 py-1 bg-gray-500/10 text-gray-600 dark:text-gray-400 text-xs rounded-full flex items-center gap-1">
          <Edit2 className="h-3 w-3" /> Draft
        </span>;
      case 'Pending Approval':
        return <span className="px-2 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs rounded-full flex items-center gap-1">
          <Clock className="h-3 w-3" /> Pending
        </span>;
      case 'Approved':
        return <span className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs rounded-full flex items-center gap-1">
          <Check className="h-3 w-3" /> Approved
        </span>;
      case 'Posted':
        return <span className="px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs rounded-full flex items-center gap-1">
          <CheckCircle className="h-3 w-3" /> Posted
        </span>;
      case 'Reversed':
        return <span className="px-2 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs rounded-full flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> Reversed
        </span>;
      case 'Void':
        return <span className="px-2 py-1 bg-red-500/10 text-red-600 dark:text-red-400 text-xs rounded-full flex items-center gap-1">
          <XCircle className="h-3 w-3" /> Void
        </span>;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: JournalEntry['entryType']) => {
    const colors = {
      'Standard': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      'Adjusting': 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      'Closing': 'bg-red-500/10 text-red-600 dark:text-red-400',
      'Reversing': 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
      'Recurring': 'bg-green-500/10 text-green-600 dark:text-green-400',
      'Automated': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      'Import': 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
    };
    
    return <span className={`px-2 py-1 ${colors[type]} text-xs rounded-full`}>
      {type}
    </span>;
  };

  const totals = calculateTotals();

  // Show empty state if no entities
  if (entities.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Journal Entries</h1>
        </div>

        <Card className="p-12">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-muted/30 rounded-full">
                <FileText className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
            <h2 className="text-2xl font-semibold">No Journal Entries Available</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Journal entries will be automatically created when you:
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
                  Connect your Mercury Bank account for automated imports
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Upload invoices, receipts, or financial documents
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
          <h1 className="text-3xl font-bold text-foreground">Journal Entries</h1>
          <p className="text-muted-foreground mt-1">
            Double-entry bookkeeping with automated imports
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
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Entry
          </button>
        </div>
      </div>

      {/* Entity Selector & Co-Founder Approval Status */}
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

          <div className="flex items-center gap-3">
            <Lock className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              Entries require co-founder approval
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
                placeholder="Search by entry number, description, or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Posted">Posted</option>
            <option value="Reversed">Reversed</option>
            <option value="Void">Void</option>
          </select>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Types</option>
            <option value="Standard">Standard</option>
            <option value="Adjusting">Adjusting</option>
            <option value="Closing">Closing</option>
            <option value="Reversing">Reversing</option>
            <option value="Recurring">Recurring</option>
            <option value="Automated">Automated</option>
            <option value="Import">Import</option>
          </select>
        </div>
      </Card>

      {/* Journal Entries List */}
      {filteredEntries.length > 0 ? (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Entry #</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Source</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Debits</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Credits</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
              <React.Fragment key={entry.entryId}>
                <tr 
                  className="border-b border-border hover:bg-muted/30 cursor-pointer"
                  onClick={() => setSelectedEntry(selectedEntry?.entryId === entry.entryId ? null : entry)}
                >
                  <td className="px-4 py-3 text-sm font-medium">{entry.entryNumber}</td>
                  <td className="px-4 py-3 text-sm">{entry.entryDate}</td>
                  <td className="px-4 py-3 text-sm">
                    {entry.description}
                    {entry.reference && (
                      <span className="block text-xs text-muted-foreground">Ref: {entry.reference}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{getTypeBadge(entry.entryType)}</td>
                  <td className="px-4 py-3 text-sm">
                    {entry.source === 'Mercury Bank API' ? (
                      <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <DollarSign className="h-3 w-3" />
                        {entry.source}
                      </span>
                    ) : entry.source === 'Document Upload' ? (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <FileText className="h-3 w-3" />
                        {entry.source}
                      </span>
                    ) : (
                      entry.source
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    ${entry.totalDebits.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    ${entry.totalCredits.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getStatusBadge(entry.status)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {entry.status === 'Pending Approval' && (
                        <button className="p-1 hover:bg-muted rounded">
                          <Check className="h-4 w-4 text-green-600" />
                        </button>
                      )}
                      {(entry.status === 'Draft' || entry.status === 'Pending Approval') && (
                        <button className="p-1 hover:bg-muted rounded">
                          <Edit2 className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                      {entry.status === 'Posted' && (
                        <button className="p-1 hover:bg-muted rounded">
                          <RefreshCw className="h-4 w-4 text-orange-600" />
                        </button>
                      )}
                      <button className="p-1 hover:bg-muted rounded">
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  </td>
                </tr>
                
                {/* Expanded Entry Details */}
                {selectedEntry?.entryId === entry.entryId && (
                  <tr>
                    <td colSpan={9} className="px-4 py-4 bg-muted/20">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">Journal Entry Lines</h4>
                          <div className="text-sm text-muted-foreground">
                            Created by {entry.createdBy} on {new Date(entry.createdAt).toLocaleString()}
                            {entry.approvedBy && ` • Approved by ${entry.approvedBy}`}
                          </div>
                        </div>
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="pb-2 text-left text-sm font-medium text-muted-foreground">Account</th>
                              <th className="pb-2 text-left text-sm font-medium text-muted-foreground">Description</th>
                              <th className="pb-2 text-right text-sm font-medium text-muted-foreground">Debit</th>
                              <th className="pb-2 text-right text-sm font-medium text-muted-foreground">Credit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entry.lines.map((line) => (
                              <tr key={line.lineNumber} className="border-b border-border/50">
                                <td className="py-2 text-sm">
                                  <span className="font-mono">{line.accountNumber}</span> - {line.accountName}
                                </td>
                                <td className="py-2 text-sm">{line.description}</td>
                                <td className="py-2 text-sm text-right font-mono">
                                  {line.debitAmount > 0 ? `$${line.debitAmount.toLocaleString()}` : '-'}
                                </td>
                                <td className="py-2 text-sm text-right font-mono">
                                  {line.creditAmount > 0 ? `$${line.creditAmount.toLocaleString()}` : '-'}
                                </td>
                              </tr>
                            ))}
                            <tr className="font-semibold">
                              <td colSpan={2} className="pt-2 text-sm text-right">Totals:</td>
                              <td className="pt-2 text-sm text-right font-mono">
                                ${entry.totalDebits.toLocaleString()}
                              </td>
                              <td className="pt-2 text-sm text-right font-mono">
                                ${entry.totalCredits.toLocaleString()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        {entry.isBalanced ? (
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm">Entry is balanced</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">Entry is not balanced</span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </Card>
      ) : (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-muted/30 rounded-full">
                <FileText className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-foreground">No Journal Entries Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Journal entries will appear here once you:
            </p>
            <div className="max-w-md mx-auto text-left space-y-2">
              <div className="flex items-start gap-2">
                <DollarSign className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Connect your Mercury Bank account for automated transaction entries
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Upload className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Upload receipts, invoices, or financial documents
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Edit2 className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Create manual journal entries for adjustments
                </span>
              </div>
            </div>
            <div className="flex justify-center gap-3 pt-4">
              <button 
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Create First Entry
              </button>
              <button 
                onClick={() => window.location.href = '/accounting/documents'}
                className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Upload Documents
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Data Source Info */}
      <Card className="p-4 bg-muted/30">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Automated Entry Creation</p>
            <p className="text-sm text-muted-foreground">
              Journal entries are automatically created from Mercury Bank transactions and uploaded documents. 
              The system uses AI to categorize transactions and extract data from invoices and receipts. 
              All automated entries require co-founder approval before posting to the general ledger.
            </p>
          </div>
        </div>
      </Card>

      {/* New Entry Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Create Journal Entry</h2>
                <button 
                  onClick={() => setIsCreating(false)}
                  className="p-2 hover:bg-muted rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Entry Header */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Entry Date</label>
                  <input
                    type="date"
                    value={newEntry.entryDate}
                    onChange={(e) => setNewEntry({ ...newEntry, entryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Entry Type</label>
                  <select
                    value={newEntry.entryType}
                    onChange={(e) => setNewEntry({ ...newEntry, entryType: e.target.value as JournalEntry['entryType'] })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Adjusting">Adjusting</option>
                    <option value="Closing">Closing</option>
                    <option value="Reversing">Reversing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Entity</label>
                  <div className="w-full px-3 py-2 bg-background border border-border rounded-lg font-medium">
                    NGI Capital, Inc. (Consolidated)
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reference</label>
                  <input
                    type="text"
                    placeholder="Invoice #, Check #, etc."
                    value={newEntry.reference}
                    onChange={(e) => setNewEntry({ ...newEntry, reference: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="Entry description..."
                    value={newEntry.description}
                    onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Entry Lines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Journal Entry Lines</h3>
                  <button
                    onClick={addNewLine}
                    className="px-3 py-1 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Line
                  </button>
                </div>
                
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 text-left text-sm font-medium text-muted-foreground">Account</th>
                      <th className="pb-2 text-left text-sm font-medium text-muted-foreground">Description</th>
                      <th className="pb-2 text-right text-sm font-medium text-muted-foreground">Debit</th>
                      <th className="pb-2 text-right text-sm font-medium text-muted-foreground">Credit</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {newEntry.lines.map((line, index) => (
                      <tr key={index} className="border-b border-border/50">
                        <td className="py-2 pr-2">
                          <select
                            value={line.accountNumber}
                            onChange={(e) => updateLine(index, 'accountNumber', e.target.value)}
                            className="w-full px-2 py-1 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="">Select Account</option>
                            <option value="11120">11120 - Checking</option>
                            <option value="11200">11200 - Accounts Receivable</option>
                            <option value="21100">21100 - Accounts Payable</option>
                            <option value="41100">41100 - Advisory Revenue</option>
                            <option value="52100">52100 - Salaries</option>
                          </select>
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e) => updateLine(index, 'description', e.target.value)}
                            className="w-full px-2 py-1 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            value={line.debit}
                            onChange={(e) => updateLine(index, 'debit', e.target.value)}
                            className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            value={line.credit}
                            onChange={(e) => updateLine(index, 'credit', e.target.value)}
                            className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="py-2">
                          {newEntry.lines.length > 2 && (
                            <button
                              onClick={() => removeLine(index)}
                              className="p-1 hover:bg-muted rounded"
                            >
                              <X className="h-4 w-4 text-muted-foreground" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td colSpan={2} className="pt-2 text-right">Totals:</td>
                      <td className="pt-2 text-right">${totals.totalDebits.toFixed(2)}</td>
                      <td className="pt-2 text-right">${totals.totalCredits.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
                
                {totals.isBalanced ? (
                  <div className="mt-2 flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Entry is balanced</span>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">
                      Entry must balance - Difference: ${Math.abs(totals.totalDebits - totals.totalCredits).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Save as Draft
                </button>
                <button
                  disabled={!totals.isBalanced}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit for Approval
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}