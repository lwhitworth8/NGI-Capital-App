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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  Search,
  Link as LinkIcon,
  Unlink,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useEntityContext } from '@/hooks/useEntityContext';
import { toast } from 'sonner';

export default function BankingPage() {
  const { selectedEntityId } = useEntityContext();
  const [activeTab, setActiveTab] = useState('accounts');
  
  // Bank Accounts State
  const [bankAccounts, setBankAccounts] = useState([]);
  const [createAccountModalOpen, setCreateAccountModalOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({
    bank_name: 'Mercury',
    account_name: '',
    account_number_last_four: '',
    account_type: 'Checking',
    routing_number: '',
    is_primary: false
  });
  
  // Transactions State
  const [transactions, setTransactions] = useState([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState<number | null>(null);
  
  // Reconciliation State
  const [reconciliationStatus, setReconciliationStatus] = useState<any>(null);
  const [selectedReconciliationAccount, setSelectedReconciliationAccount] = useState<number | null>(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (selectedEntityId) {
      if (activeTab === 'accounts') {
        fetchBankAccounts();
      } else if (activeTab === 'transactions') {
        fetchTransactions();
      } else if (activeTab === 'reconciliation') {
        if (selectedReconciliationAccount) {
          fetchReconciliationStatus();
        }
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
        `/api/accounting/banking/accounts?entity_id=${selectedEntityId}`
      );
      const data = await response.json();
      if (data.success) {
        setBankAccounts(data.accounts || []);
        if (data.accounts.length > 0 && !selectedBankAccount) {
          setSelectedBankAccount(data.accounts[0].id);
          setSelectedReconciliationAccount(data.accounts[0].id);
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

  const handleCreateBankAccount = async () => {
    if (!selectedEntityId || !accountForm.account_name) {
      toast.error('Account name is required');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/accounting/banking/accounts?entity_id=${selectedEntityId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(accountForm),
        }
      );
      const data = await response.json();

      if (data.success) {
        toast.success('Bank account created successfully');
        setCreateAccountModalOpen(false);
        fetchBankAccounts();
        // Reset form
        setAccountForm({
          bank_name: 'Mercury',
          account_name: '',
          account_number_last_four: '',
          account_type: 'Checking',
          routing_number: '',
          is_primary: false
        });
      } else {
        toast.error(data.detail || 'Failed to create bank account');
      }
    } catch (error) {
      console.error('Failed to create bank account:', error);
      toast.error('Failed to create bank account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncMercury = async () => {
    if (!selectedEntityId) return;
    setSyncing(true);
    try {
      const response = await fetch(
        `/api/accounting/banking/mercury/sync?entity_id=${selectedEntityId}&days_back=30`,
        { method: 'POST' }
      );
      const data = await response.json();

      if (data.success) {
        toast.success(data.message || `Synced ${data.synced} transactions: ${data.matched} matched, ${data.created_drafts} drafts created`);
        fetchTransactions();
      } else {
        toast.error(data.message || 'Sync failed');
      }
    } catch (error) {
      console.error('Mercury sync failed:', error);
      toast.error('Mercury sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // ============================================================================
  // TRANSACTIONS
  // ============================================================================

  const fetchTransactions = async () => {
    if (!selectedEntityId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        entity_id: selectedEntityId.toString()
      });
      if (selectedBankAccount) {
        params.append('bank_account_id', selectedBankAccount.toString());
      }

      const response = await fetch(
        `/api/accounting/banking/transactions?${params}`
      );
      const data = await response.json();
      if (data.success) {
        setTransactions(data.transactions || []);
      } else {
        toast.error('Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionStatusBadge = (isMatched: boolean, status: string) => {
    if (isMatched) {
      return <Badge variant="default"><CheckCircle2 className="mr-1 h-3 w-3" />Matched</Badge>;
    }
    if (status === 'pending') {
      return <Badge variant="secondary"><AlertCircle className="mr-1 h-3 w-3" />Unmatched</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  // ============================================================================
  // RECONCILIATION
  // ============================================================================

  const fetchReconciliationStatus = async () => {
    if (!selectedReconciliationAccount || !asOfDate) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/banking/reconciliation/status?bank_account_id=${selectedReconciliationAccount}&as_of_date=${asOfDate}`
      );
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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
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

        <Card>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matched Transactions</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getMatchedCount()}</div>
            <p className="text-xs text-muted-foreground">Linked to GL entries</p>
          </CardContent>
        </Card>

        <Card>
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="accounts">Bank Accounts</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
        </TabsList>

        {/* ============================================================================ */}
        {/* BANK ACCOUNTS TAB */}
        {/* ============================================================================ */}
        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Bank Accounts</CardTitle>
                  <CardDescription>Manage Mercury bank accounts and connections</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSyncMercury} disabled={syncing} variant="outline">
                    <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing...' : 'Sync Mercury'}
                  </Button>
                  <Button onClick={() => setCreateAccountModalOpen(true)}>
                    <Building2 className="mr-2 h-4 w-4" />
                    Add Bank Account
                  </Button>
                </div>
              </div>
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

              {/* Mercury Auto-Sync Info */}
              <div className="mt-6 rounded-lg bg-blue-50 p-4 border border-blue-200">
                <div className="flex items-start">
                  <RefreshCw className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900">Automatic Mercury Sync</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Mercury transactions automatically sync every 6 hours. The system intelligently matches transactions to existing journal entries and creates draft entries for unmatched transactions.
                    </p>
                    <p className="text-sm text-blue-700 mt-2">
                      Click "Sync Mercury" to manually trigger a sync for the last 30 days.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================================ */}
        {/* TRANSACTIONS TAB */}
        {/* ============================================================================ */}
        <TabsContent value="transactions" className="space-y-4">
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
                          {txn.is_matched ? (
                            <Button size="sm" variant="ghost">
                              <LinkIcon className="h-4 w-4 mr-1" />
                              View JE
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline">
                              Match to JE
                            </Button>
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
        {/* RECONCILIATION TAB */}
        {/* ============================================================================ */}
        <TabsContent value="reconciliation" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Bank Reconciliation</CardTitle>
                  <CardDescription>Reconcile bank transactions with general ledger</CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  <Select
                    value={selectedReconciliationAccount?.toString() || ''}
                    onValueChange={(value) => setSelectedReconciliationAccount(parseInt(value))}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account: any) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={asOfDate}
                    onChange={(e) => setAsOfDate(e.target.value)}
                    className="w-[180px]"
                  />
                  <Button onClick={fetchReconciliationStatus}>
                    <Search className="mr-2 h-4 w-4" />
                    Check Status
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Reconciliation Workflow Explanation */}
              <div className="mb-6 rounded-lg bg-slate-50 p-4 border">
                <h4 className="font-semibold mb-2">Bank Reconciliation Workflow</h4>
                <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                  <li>Mercury transactions auto-sync every 6 hours</li>
                  <li>System attempts to auto-match transactions to journal entries</li>
                  <li>Matched transactions show with green checkmark ✓</li>
                  <li>Unmatched transactions show in "Needs Review" section</li>
                  <li>Click unmatched transaction to match to existing JE or create new JE</li>
                  <li>Once all transactions matched, reconciliation is complete</li>
                  <li>Generate bank reconciliation report</li>
                </ol>
              </div>

              {loading ? (
                <p className="text-center text-muted-foreground">Loading reconciliation status...</p>
              ) : reconciliationStatus ? (
                <div className="space-y-6">
                  {/* Reconciliation Summary */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Bank Balance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          ${reconciliationStatus.bank_balance?.toFixed(2) || '0.00'}
                        </div>
                        <p className="text-xs text-muted-foreground">Per Mercury</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">GL Balance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          ${reconciliationStatus.gl_balance?.toFixed(2) || '0.00'}
                        </div>
                        <p className="text-xs text-muted-foreground">Per General Ledger</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Difference</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${reconciliationStatus.is_reconciled ? 'text-green-600' : 'text-red-600'}`}>
                          ${Math.abs(reconciliationStatus.difference || 0).toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {reconciliationStatus.is_reconciled ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Reconciled
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Not reconciled
                            </span>
                          )}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Transaction Stats */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Matched Transactions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-green-600">
                          {reconciliationStatus.matched_transactions || 0}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Linked to GL entries</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Unmatched Transactions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-orange-600">
                          {reconciliationStatus.unmatched_transactions || 0}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Needs review</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Unmatched Transactions List */}
                  {reconciliationStatus.unmatched_txn_list && reconciliationStatus.unmatched_txn_list.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Unmatched Transactions - Needs Review</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reconciliationStatus.unmatched_txn_list.map((txn: any) => (
                              <TableRow key={txn.id}>
                                <TableCell>{new Date(txn.date).toLocaleDateString()}</TableCell>
                                <TableCell>{txn.description}</TableCell>
                                <TableCell className={txn.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                                  ${Math.abs(txn.amount).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline">
                                      <LinkIcon className="mr-1 h-3 w-3" />
                                      Match to JE
                                    </Button>
                                    <Button size="sm">
                                      Create JE
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  {/* Generate Report Button */}
                  <div className="flex justify-end">
                    <Button size="lg">
                      <Download className="mr-2 h-4 w-4" />
                      Generate Reconciliation Report
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">Select a bank account and date to view reconciliation status</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============================================================================ */}
      {/* CREATE BANK ACCOUNT MODAL */}
      {/* ============================================================================ */}
      <Dialog open={createAccountModalOpen} onOpenChange={setCreateAccountModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
            <DialogDescription>Connect your Mercury bank account for automatic transaction syncing</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Select
                value={accountForm.bank_name}
                onValueChange={(value) => setAccountForm({ ...accountForm, bank_name: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mercury">Mercury</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Account Name *</Label>
              <Input
                value={accountForm.account_name}
                onChange={(e) => setAccountForm({ ...accountForm, account_name: e.target.value })}
                placeholder="Operating Account"
              />
            </div>

            <div className="space-y-2">
              <Label>Account Number (Last 4 digits)</Label>
              <Input
                value={accountForm.account_number_last_four}
                onChange={(e) => setAccountForm({ ...accountForm, account_number_last_four: e.target.value })}
                placeholder="1234"
                maxLength={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Account Type</Label>
              <Select
                value={accountForm.account_type}
                onValueChange={(value) => setAccountForm({ ...accountForm, account_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Checking">Checking</SelectItem>
                  <SelectItem value="Savings">Savings</SelectItem>
                  <SelectItem value="Money Market">Money Market</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Routing Number</Label>
              <Input
                value={accountForm.routing_number}
                onChange={(e) => setAccountForm({ ...accountForm, routing_number: e.target.value })}
                placeholder="123456789"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_primary"
                checked={accountForm.is_primary}
                onChange={(e) => setAccountForm({ ...accountForm, is_primary: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_primary" className="text-sm font-normal cursor-pointer">
                Set as primary account
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateAccountModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBankAccount} disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Bank Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
