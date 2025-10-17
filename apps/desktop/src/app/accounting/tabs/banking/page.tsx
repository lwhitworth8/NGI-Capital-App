"use client"

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AnimatedText } from '@ngi/ui';
import {
  Building2,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Download,
  Search,
  Link as LinkIcon,
  TrendingUp,
  TrendingDown,
  Upload,
  FileText
} from 'lucide-react';
import { useEntity } from '@/lib/context/UnifiedEntityContext';
import { toast } from 'sonner';

export default function BankingPage() {
  const { selectedEntity } = useEntity();
  const selectedEntityId = selectedEntity?.id;
  const [activeTab, setActiveTab] = useState('accounts');
  
  // Bank Accounts State
  const [bankAccounts, setBankAccounts] = useState([]);
  
  // Transactions State
  const [transactions, setTransactions] = useState([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState<number | null>(null);
  
  // Reconciliation State
  const [reconciliationStatus, setReconciliationStatus] = useState<any>(null);
  const [smartReconciliationStatus, setSmartReconciliationStatus] = useState<any>(null);
  const [selectedReconciliationAccount, setSelectedReconciliationAccount] = useState<number | null>(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);

  // Document upload state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedTransactionForUpload, setSelectedTransactionForUpload] = useState<any>(null);

  // Match suggestions state (NEW: US GAAP workflow)
  const [matchSuggestionsDialogOpen, setMatchSuggestionsDialogOpen] = useState(false);
  const [selectedTransactionForMatch, setSelectedTransactionForMatch] = useState<any>(null);
  const [matchSuggestions, setMatchSuggestions] = useState<any[]>([]);
  const [loadingMatchSuggestions, setLoadingMatchSuggestions] = useState(false);

  useEffect(() => {
    if (selectedEntityId) {
      // Always fetch transactions on load to populate widgets
      fetchTransactions();

      if (activeTab === 'accounts') {
        fetchBankAccounts();
      } else if (activeTab === 'reconciliation') {
        fetchSmartReconciliationStatus();
      }
    }
  }, [selectedEntityId, activeTab, selectedBankAccount, selectedReconciliationAccount, asOfDate]);

  // ============================================================================
  // BANK ACCOUNTS
  // ============================================================================

  const fetchBankAccounts = async () => {
    if (!selectedEntityId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/bank-reconciliation/accounts?entity_id=${selectedEntityId}`
      );
      if (!response.ok) {
        const txt = await response.text().catch(() => '');
        throw new Error(txt || 'Failed to fetch bank accounts');
      }
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data?.accounts || []);
      if (Array.isArray(list)) {
        setBankAccounts(list);
        if (list.length > 0 && !selectedBankAccount) {
          setSelectedBankAccount(list[0].id);
          setSelectedReconciliationAccount(list[0].id);
        }
      } else {
        toast.error('Failed to fetch bank accounts');
      }
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error);
      toast.error('Failed to fetch bank accounts');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // TRANSACTIONS
  // ============================================================================

  const fetchTransactions = async () => {
    if (!selectedBankAccount) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ bank_account_id: String(selectedBankAccount) });
      const response = await fetch(`/api/accounting/bank-reconciliation/transactions?${params.toString()}`);
      if (!response.ok) {
        const txt = await response.text().catch(() => '');
        throw new Error(txt || 'Failed to fetch transactions');
      }
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data?.transactions || []);
      setTransactions(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionStatusBadge = (isMatched: boolean, status: string) => {
    // US GAAP workflow states
    if (status === 'cleared' || (isMatched && status !== 'pending')) {
      // Fully approved and posted
      return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" />Matched</Badge>;
    }
    if (status === 'pending' && isMatched) {
      // Linked to draft JE, needs review and approval
      return <Badge variant="secondary" className="bg-yellow-600 text-white"><AlertCircle className="mr-1 h-3 w-3" />Needs Review</Badge>;
    }
    if (status === 'pending') {
      // Not yet linked to any JE
      return <Badge variant="outline"><AlertCircle className="mr-1 h-3 w-3" />Unmatched</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  // ============================================================================
  // RECONCILIATION
  // ============================================================================

  const fetchSmartReconciliationStatus = async () => {
    if (!selectedEntityId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ entity_id: String(selectedEntityId) });
      if (asOfDate) params.append('as_of_date', asOfDate);
      const response = await fetch(`/api/accounting/bank-reconciliation/smart-status?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setSmartReconciliationStatus(data);
      } else {
        toast.error('Failed to fetch reconciliation status');
      }
    } catch (error) {
      console.error('Failed to fetch smart reconciliation status:', error);
      toast.error('Failed to fetch reconciliation status');
    } finally {
      setLoading(false);
    }
  };

  const fetchReconciliationStatus = async () => {
    if (!selectedReconciliationAccount || !asOfDate) return;
    setLoading(true);
    try {
      // No direct status endpoint in new API; use smart-status instead
      const params = new URLSearchParams({ entity_id: String(selectedEntityId), as_of_date: asOfDate });
      const response = await fetch(`/api/accounting/bank-reconciliation/smart-status?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setReconciliationStatus(data);
      } else {
        toast.error('Failed to fetch reconciliation status');
      }
    } catch (error) {
      console.error('Failed to fetch reconciliation status:', error);
      toast.error('Failed to fetch reconciliation status');
    } finally {
      setLoading(false);
    }
  };

  const getTotalDeposits = () => {
    return transactions
      .filter(t => parseFloat(t.amount) > 0)
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  };

  const getTotalWithdrawals = () => {
    return transactions
      .filter(t => parseFloat(t.amount) < 0)
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
  };

  const getMatchedCount = () => {
    return transactions.filter(t => t.is_matched).length;
  };

  const getUnmatchedCount = () => {
    return transactions.filter(t => !t.is_matched).length;
  };

  const getCurrentBalance = () => {
    if (bankAccounts.length === 0) return 0;
    const primaryAccount = bankAccounts.find((acc: any) => acc.is_primary) || bankAccounts[0];
    return parseFloat(primaryAccount.current_balance || 0);
  };

  const handleUploadDocument = (transaction: any) => {
    setSelectedTransactionForUpload(transaction);
    setUploadDialogOpen(true);
  };

  const handleDocumentUploadSubmit = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      toast.error('Please select a file to upload');
      return;
    }

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });
    formData.append('transaction_id', selectedTransactionForUpload.id);
    formData.append('je_id', selectedTransactionForUpload.matched_je_id);
    formData.append('entity_id', selectedEntityId?.toString() || '');

    try {
      const response = await fetch('/api/accounting/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Document uploaded successfully');
        setUploadDialogOpen(false);
        fetchTransactions(); // Refresh transaction list
      } else {
        toast.error('Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    }
  };

  // ============================================================================
  // MATCH SUGGESTIONS (NEW: US GAAP Workflow)
  // ============================================================================

  const handleGetMatchSuggestions = async (transaction: any) => {
    setSelectedTransactionForMatch(transaction);
    setMatchSuggestionsDialogOpen(true);
    setLoadingMatchSuggestions(true);

    try {
      const response = await fetch('/api/accounting/bank-reconciliation/accounts/0/auto-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: transaction.id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMatchSuggestions(data.suggestions || []);
      } else {
        toast.error('Failed to get match suggestions');
      }
    } catch (error) {
      console.error('Error getting match suggestions:', error);
      toast.error('Failed to get match suggestions');
    } finally {
      setLoadingMatchSuggestions(false);
    }
  };

  const handleConfirmMatch = async (suggestion: any) => {
    if (!selectedTransactionForMatch) return;

    try {
      const response = await fetch('/api/accounting/bank-reconciliation/transactions/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_ids: suggestion.transaction_ids || [selectedTransactionForMatch.id],
          document_id: suggestion.document_id,
          account_id: suggestion.account_id,
          memo: suggestion.memo || `Matched transaction ${selectedTransactionForMatch.id}`,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Draft JE ${data.journal_entry.entry_number} created successfully`);
        setMatchSuggestionsDialogOpen(false);
        fetchTransactions(); // Refresh transaction list
      } else {
        toast.error('Failed to create journal entry from match');
      }
    } catch (error) {
      console.error('Error confirming match:', error);
      toast.error('Failed to confirm match');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <AnimatedText 
            text="Banking" 
            as="h2" 
            className="text-2xl font-bold tracking-tight"
            delay={0.1}
          />
          <AnimatedText 
            text="Bank account management, transaction reconciliation, and financial data sync" 
            as="p" 
            className="text-muted-foreground"
            delay={0.3}
            stagger={0.02}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${getCurrentBalance().toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Primary account</p>
          </CardContent>
        </Card>

        <Card className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${getTotalDeposits().toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Current period</p>
          </CardContent>
        </Card>

        <Card className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${getTotalWithdrawals().toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Current period</p>
          </CardContent>
        </Card>

        <Card className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matched Transactions</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getMatchedCount()}</div>
            <p className="text-xs text-muted-foreground">Linked to GL entries</p>
          </CardContent>
        </Card>

        <Card className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unmatched Transactions</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getUnmatchedCount()}</div>
            <p className="text-xs text-muted-foreground">Needs review</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="mb-6 flex justify-center">
          <TabsList className="h-11 bg-muted/50">
            <TabsTrigger value="accounts" className="data-[state=active]:bg-background px-6">
              Bank Accounts
            </TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-background px-6">
              Transactions
            </TabsTrigger>
            <TabsTrigger value="reconciliation" className="data-[state=active]:bg-background px-6">
              Reconciliation
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ============================================================================ */}
        {/* BANK ACCOUNTS TAB */}
        {/* ============================================================================ */}
        <TabsContent value="accounts" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Bank Accounts</CardTitle>
              <CardDescription>Mercury bank accounts are automatically synced from your Mercury API</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground">Loading bank accounts...</p>
              ) : bankAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">No bank accounts found. Add your Mercury account to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bank Name</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Account Number</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Current Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankAccounts.map((account: any) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">{account.bank_name}</TableCell>
                        <TableCell>
                          {account.account_name}
                          {account.is_primary && (
                            <Badge variant="secondary" className="ml-2">Primary</Badge>
                          )}
                        </TableCell>
                        <TableCell>****{account.account_number_last_four}</TableCell>
                        <TableCell>{account.account_type}</TableCell>
                        <TableCell>${parseFloat(account.current_balance || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          {account.is_active ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================================ */}
        {/* TRANSACTIONS TAB */}
        {/* ============================================================================ */}
        <TabsContent value="transactions" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Bank Transactions</CardTitle>
                  <CardDescription>View and manage synced Mercury transactions</CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  <Select
                    value={selectedBankAccount?.toString() || ''}
                    onValueChange={(value) => setSelectedBankAccount(parseInt(value))}
                  >
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account: any) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.bank_name} - {account.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground">Loading transactions...</p>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">No transactions found. Sync Mercury to fetch transactions.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>JE Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((txn: any) => (
                      <TableRow key={txn.id}>
                        <TableCell>{new Date(txn.transaction_date).toLocaleDateString()}</TableCell>
                        <TableCell className="max-w-xs truncate">{txn.description}</TableCell>
                        <TableCell className={parseFloat(txn.amount) > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {parseFloat(txn.amount) > 0 ? '+' : ''}${parseFloat(txn.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {txn.transaction_type === 'credit' ? (
                            <Badge variant="default">Deposit</Badge>
                          ) : (
                            <Badge variant="outline">Withdrawal</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {getTransactionStatusBadge(txn.is_matched, txn.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {txn.is_matched ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    // Navigate to Journal Entries tab with filter
                                    window.location.href = `/accounting?tab=journal-entries&je_id=${txn.matched_je_id}`;
                                  }}
                                >
                                  <LinkIcon className="h-4 w-4 mr-1" />
                                  View JE
                                </Button>
                                {txn.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-yellow-600 text-yellow-600"
                                    onClick={() => handleUploadDocument(txn)}
                                  >
                                    <Upload className="h-3 w-3 mr-1" />
                                    Upload Docs
                                  </Button>
                                )}
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleGetMatchSuggestions(txn)}
                                >
                                  <Search className="h-3 w-3 mr-1" />
                                  Find Matches
                                </Button>
                                {txn.suggested_account_id && (
                                  <Badge variant="secondary" className="text-xs">
                                    AI Suggestion
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================================ */}
        {/* RECONCILIATION TAB */}
        {/* ============================================================================ */}
        <TabsContent value="reconciliation" className="space-y-6 mt-6">
          {loading ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">Loading smart reconciliation status...</p>
              </CardContent>
            </Card>
          ) : smartReconciliationStatus ? (
            <>
              {/* Period Status Banner */}
              <Card className={`border-2 ${
                smartReconciliationStatus.overall_status === 'ready'
                  ? 'border-green-600 bg-green-50 dark:bg-green-950/20'
                  : smartReconciliationStatus.overall_status === 'blocked'
                  ? 'border-red-600 bg-red-50 dark:bg-red-950/20'
                  : 'border-yellow-600 bg-yellow-50 dark:bg-yellow-950/20'
              }`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {smartReconciliationStatus.overall_status === 'ready' ? (
                          <CheckCircle2 className="h-6 w-6 text-green-600" />
                        ) : smartReconciliationStatus.overall_status === 'blocked' ? (
                          <AlertCircle className="h-6 w-6 text-red-600" />
                        ) : (
                          <AlertCircle className="h-6 w-6 text-yellow-600" />
                        )}
                        Period Close Status: {smartReconciliationStatus.period_status.period_description}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {smartReconciliationStatus.period_status.is_first_time_close ? (
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            First-time period close from entity inception ({smartReconciliationStatus.entity.inception_date})
                          </span>
                        ) : (
                          <span className="text-foreground">
                            Continuing from last closed period: {smartReconciliationStatus.period_status.last_closed_period?.end_date}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={smartReconciliationStatus.overall_status === 'ready' ? 'default' : 'destructive'}
                      className="text-lg px-4 py-2"
                    >
                      {smartReconciliationStatus.overall_status === 'ready' ? '✓ Ready' : '⚠ Blocked'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Period Start</p>
                      <p className="text-lg font-semibold">
                        {new Date(smartReconciliationStatus.period_status.target_period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Period End</p>
                      <p className="text-lg font-semibold">
                        {new Date(smartReconciliationStatus.period_status.target_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Recommended Close Date</p>
                      <p className="text-lg font-semibold">
                        {new Date(smartReconciliationStatus.close_date_validation.recommended_close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {smartReconciliationStatus.close_date_validation.can_close_now ? (
                          <Badge variant="default" className="ml-2 bg-green-600">Can Close Now</Badge>
                        ) : (
                          <Badge variant="secondary" className="ml-2">
                            {smartReconciliationStatus.close_date_validation.days_until_close} days
                          </Badge>
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Next Action */}
              <Card className="border-2 border-blue-600">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Next Action
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                    {smartReconciliationStatus.next_action}
                  </p>
                </CardContent>
              </Card>

              {/* Prerequisites Checklist */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Prerequisites Checklist</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-base px-3 py-1">
                        {smartReconciliationStatus.prerequisites.completed_tasks} / {smartReconciliationStatus.prerequisites.total_tasks} Complete
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        {Math.round(smartReconciliationStatus.prerequisites.completion_percentage)}%
                      </div>
                    </div>
                  </div>
                  <CardDescription>
                    Complete all prerequisites before running bank reconciliation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {smartReconciliationStatus.prerequisites.checklist.map((item: any, index: number) => (
                      <div
                        key={index}
                        className={`flex items-start gap-3 p-4 rounded-lg border-2 ${
                          item.status === 'completed'
                            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
                            : item.status === 'blocked'
                            ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20'
                            : 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20'
                        }`}
                      >
                        <div className="mt-0.5">
                          {item.status === 'completed' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : item.status === 'blocked' ? (
                            <AlertCircle className="h-5 w-5 text-red-600" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-foreground">{item.task}</h4>
                            {item.blocking && (
                              <Badge variant="destructive">Blocking</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.details}
                          </p>
                          {item.count !== undefined && item.count > 0 && (
                            <div className="mt-2">
                              <Badge variant="outline" className="text-sm">
                                {item.count} items
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Blocking Issues Summary */}
                  {smartReconciliationStatus.prerequisites.blocking_issues.length > 0 && (
                    <div className="mt-6 p-4 rounded-lg border-2 border-red-600 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
                      <h4 className="font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Blocking Issues ({smartReconciliationStatus.prerequisites.blocking_issues.length})
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-300">
                        {smartReconciliationStatus.prerequisites.blocking_issues.map((issue: string, index: number) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bank Accounts Reconciliation Summary */}
              {smartReconciliationStatus.bank_accounts && smartReconciliationStatus.bank_accounts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Bank Accounts Summary</CardTitle>
                    <CardDescription>Reconciliation status for each bank account</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {smartReconciliationStatus.bank_accounts.map((account: any) => (
                        <div key={account.bank_account.id} className="p-4 rounded-lg border">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-foreground">{account.bank_account.bank_name} - {account.bank_account.account_name}</h4>
                              <p className="text-sm text-muted-foreground">****{account.bank_account.account_number_last_four}</p>
                            </div>
                            <Badge variant={account.is_reconciled ? 'default' : 'destructive'} className="text-base px-3">
                              {account.is_reconciled ? '✓ Reconciled' : '⚠ Out of Balance'}
                            </Badge>
                          </div>
                          <div className="grid gap-4 md:grid-cols-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Bank Balance</p>
                              <p className="text-lg font-semibold">${account.bank_balance.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">GL Balance</p>
                              <p className="text-lg font-semibold">${account.gl_balance.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Difference</p>
                              <p className={`text-lg font-semibold ${account.is_reconciled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                ${Math.abs(account.difference).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Unmatched Txns</p>
                              <p className="text-lg font-semibold">{account.unmatched_transactions}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Button */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={fetchSmartReconciliationStatus}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Refresh Status
                </Button>
                <Button
                  size="lg"
                  disabled={smartReconciliationStatus.overall_status !== 'ready'}
                  className={smartReconciliationStatus.overall_status === 'ready' ? 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700' : ''}
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  {smartReconciliationStatus.overall_status === 'ready'
                    ? 'Run Bank Reconciliation'
                    : 'Complete Prerequisites First'}
                </Button>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">No reconciliation data available</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Document Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Upload Supporting Documents</DialogTitle>
            <DialogDescription>
              Upload invoices, receipts, or bank statements for this transaction.
              Required for US GAAP compliance before journal entry approval.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedTransactionForUpload && (
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4 border">
                <h4 className="font-semibold mb-2 text-foreground">Transaction Details</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-foreground"><strong>Date:</strong> {new Date(selectedTransactionForUpload.transaction_date).toLocaleDateString()}</p>
                  <p className="text-foreground"><strong>Description:</strong> {selectedTransactionForUpload.description}</p>
                  <p className="text-foreground"><strong>Amount:</strong> <span className={parseFloat(selectedTransactionForUpload.amount) > 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>
                    ${Math.abs(parseFloat(selectedTransactionForUpload.amount)).toFixed(2)}
                  </span></p>
                  <p className="text-foreground"><strong>JE Number:</strong> {selectedTransactionForUpload.matched_je_id}</p>
                </div>
              </div>
            )}
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <label htmlFor="document-upload" className="text-sm font-medium">
                Select Document(s)
              </label>
              <Input
                id="document-upload"
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => {
                  // Store files for submission
                  const fileInput = e.target;
                  if (fileInput.files) {
                    (document.getElementById('upload-submit-btn') as any)._files = fileInput.files;
                  }
                }}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Accepted formats: PDF, PNG, JPG (max 10MB per file)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              id="upload-submit-btn"
              onClick={(e) => {
                const files = (e.target as any)._files;
                handleDocumentUploadSubmit(files);
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Upload Documents
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Match Suggestions Dialog (NEW: US GAAP Workflow) */}
      <Dialog open={matchSuggestionsDialogOpen} onOpenChange={setMatchSuggestionsDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Smart Match Suggestions</DialogTitle>
            <DialogDescription>
              Automated suggestions are not available in the manual-only workflow.
              You can manually match a bank transaction to a posted journal entry.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedTransactionForMatch && (
              <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                <h4 className="font-semibold mb-2 text-blue-800">Transaction to Match</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Date:</strong> {new Date(selectedTransactionForMatch.transaction_date).toLocaleDateString()}</p>
                  <p><strong>Description:</strong> {selectedTransactionForMatch.description}</p>
                  <p><strong>Merchant:</strong> {selectedTransactionForMatch.merchant_name || 'N/A'}</p>
                  <p><strong>Amount:</strong> <span className={parseFloat(selectedTransactionForMatch.amount) > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    ${Math.abs(parseFloat(selectedTransactionForMatch.amount)).toFixed(2)}
                  </span></p>
                </div>
              </div>
            )}

            {loadingMatchSuggestions ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : matchSuggestions.length === 0 ? (
              <div className="py-8 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">No automated suggestions.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                <h4 className="font-semibold">Match Suggestions</h4>
                {matchSuggestions.map((suggestion: any, index: number) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 ${
                      suggestion.confidence >= 0.9
                        ? 'border-green-200 bg-green-50'
                        : suggestion.confidence >= 0.7
                        ? 'border-yellow-200 bg-yellow-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-semibold">{suggestion.match_type}</h5>
                          <Badge
                            variant={suggestion.confidence >= 0.9 ? 'default' : 'secondary'}
                            className={
                              suggestion.confidence >= 0.9
                                ? 'bg-green-600'
                                : suggestion.confidence >= 0.7
                                ? 'bg-yellow-600'
                                : ''
                            }
                          >
                            {Math.round(suggestion.confidence * 100)}% Confidence
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {suggestion.reason}
                        </p>
                        <div className="text-sm space-y-1">
                          <p><strong>Document:</strong> {suggestion.document_filename}</p>
                          <p><strong>Amount:</strong> ${suggestion.amount?.toFixed(2) || '0.00'}</p>
                          <p><strong>Account:</strong> {suggestion.account_name}</p>
                          {suggestion.vendor_name && (
                            <p><strong>Vendor:</strong> {suggestion.vendor_name}</p>
                          )}
                        </div>
                      </div>
                      <div />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchSuggestionsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

