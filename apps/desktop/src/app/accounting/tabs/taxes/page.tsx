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
  FileText,
  Calculator,
  Upload,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Building2
} from 'lucide-react';
import { useEntityContext } from '@/hooks/useEntityContext';
import { toast } from 'sonner';

export default function TaxesPage() {
  const { selectedEntityId } = useEntityContext();
  const [activeTab, setActiveTab] = useState('payments');
  
  // Tax Payments State
  const [taxPayments, setTaxPayments] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState<any>(null);
  const [createPaymentModalOpen, setCreatePaymentModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [paymentForm, setPaymentForm] = useState({
    tax_type: 'Federal Income Tax',
    tax_period: '',
    payment_date: new Date().toISOString().split('T')[0],
    amount_paid: '',
    payment_method: 'Online',
    confirmation_number: '',
    notes: ''
  });
  
  // Tax Provision State
  const [taxProvisions, setTaxProvisions] = useState([]);
  const [selectedProvisionYear, setSelectedProvisionYear] = useState(new Date().getFullYear());
  const [provisionPeriod, setProvisionPeriod] = useState('Annual');
  const [provisionCalculating, setProvisionCalculating] = useState(false);
  const [provisionResult, setProvisionResult] = useState<any>(null);
  
  // Tax Returns State
  const [taxReturns, setTaxReturns] = useState([]);
  const [createReturnModalOpen, setCreateReturnModalOpen] = useState(false);
  const [returnForm, setReturnForm] = useState({
    return_type: 'Form 1120',
    tax_year: new Date().getFullYear(),
    due_date: '',
    extension_filed: false,
    extended_due_date: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedEntityId) {
      if (activeTab === 'payments') {
        fetchTaxPayments();
        fetchPaymentSummary();
      } else if (activeTab === 'provision') {
        fetchTaxProvisions();
      } else if (activeTab === 'returns') {
        fetchTaxReturns();
      }
    }
  }, [selectedEntityId, activeTab, selectedYear, selectedProvisionYear]);

  // ============================================================================
  // TAX PAYMENTS
  // ============================================================================

  const fetchTaxPayments = async () => {
    if (!selectedEntityId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/tax/payments?entity_id=${selectedEntityId}&tax_year=${selectedYear}`
      );
      const data = await response.json();
      if (data.success) {
        setTaxPayments(data.payments || []);
      } else {
        toast.error('Failed to fetch tax payments');
      }
    } catch (error) {
      console.error('Failed to fetch tax payments:', error);
      toast.error('Failed to fetch tax payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentSummary = async () => {
    if (!selectedEntityId) return;
    try {
      const response = await fetch(
        `/api/accounting/tax/payments/summary?entity_id=${selectedEntityId}&year=${selectedYear}`
      );
      const data = await response.json();
      if (data.success) {
        setPaymentSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch payment summary:', error);
    }
  };

  const handleCreatePayment = async () => {
    if (!selectedEntityId || !paymentForm.amount_paid) {
      toast.error('Amount is required');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/accounting/tax/payments?entity_id=${selectedEntityId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...paymentForm,
            amount_paid: parseFloat(paymentForm.amount_paid)
          }),
        }
      );
      const data = await response.json();

      if (data.success) {
        toast.success('Tax payment created successfully');
        setCreatePaymentModalOpen(false);
        fetchTaxPayments();
        fetchPaymentSummary();
        // Reset form
        setPaymentForm({
          tax_type: 'Federal Income Tax',
          tax_period: '',
          payment_date: new Date().toISOString().split('T')[0],
          amount_paid: '',
          payment_method: 'Online',
          confirmation_number: '',
          notes: ''
        });
      } else {
        toast.error(data.detail || 'Failed to create tax payment');
      }
    } catch (error) {
      console.error('Failed to create tax payment:', error);
      toast.error('Failed to create tax payment');
    } finally {
      setSubmitting(false);
    }
  };

  const getTaxTypeBadgeColor = (taxType: string) => {
    switch (taxType) {
      case 'Federal Income Tax': return 'bg-blue-100 text-blue-800';
      case 'State Income Tax': return 'bg-green-100 text-green-800';
      case 'Form 941': return 'bg-purple-100 text-purple-800';
      case 'FUTA': return 'bg-orange-100 text-orange-800';
      case 'SUTA': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // ============================================================================
  // TAX PROVISION (ASC 740)
  // ============================================================================

  const fetchTaxProvisions = async () => {
    if (!selectedEntityId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/tax/provision?entity_id=${selectedEntityId}&year=${selectedProvisionYear}`
      );
      const data = await response.json();
      if (data.success) {
        setTaxProvisions(data.provisions || []);
      } else {
        toast.error('Failed to fetch tax provisions');
      }
    } catch (error) {
      console.error('Failed to fetch tax provisions:', error);
      toast.error('Failed to fetch tax provisions');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateProvision = async () => {
    if (!selectedEntityId) return;
    setProvisionCalculating(true);
    try {
      const response = await fetch(
        `/api/accounting/tax/provision/calculate?entity_id=${selectedEntityId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            year: selectedProvisionYear,
            period: provisionPeriod
          }),
        }
      );
      const data = await response.json();

      if (data.success) {
        setProvisionResult(data.provision);
        toast.success('Tax provision calculated successfully');
        fetchTaxProvisions();
      } else {
        toast.error(data.detail || 'Failed to calculate provision');
      }
    } catch (error) {
      console.error('Failed to calculate provision:', error);
      toast.error('Failed to calculate provision');
    } finally {
      setProvisionCalculating(false);
    }
  };

  const handleCreateProvisionJE = async (provisionId: number) => {
    try {
      const response = await fetch(
        `/api/accounting/tax/provision/${provisionId}/create-je`,
        { method: 'POST' }
      );
      const data = await response.json();

      if (data.success) {
        toast.success('Provision JE created successfully');
        fetchTaxProvisions();
      } else {
        toast.error(data.message || 'Failed to create provision JE');
      }
    } catch (error) {
      console.error('Failed to create provision JE:', error);
      toast.error('Failed to create provision JE');
    }
  };

  // ============================================================================
  // TAX RETURNS
  // ============================================================================

  const fetchTaxReturns = async () => {
    if (!selectedEntityId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/tax/returns?entity_id=${selectedEntityId}&tax_year=${selectedYear}`
      );
      const data = await response.json();
      if (data.success) {
        setTaxReturns(data.returns || []);
      } else {
        toast.error('Failed to fetch tax returns');
      }
    } catch (error) {
      console.error('Failed to fetch tax returns:', error);
      toast.error('Failed to fetch tax returns');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReturn = async () => {
    if (!selectedEntityId || !returnForm.due_date) {
      toast.error('Due date is required');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/accounting/tax/returns?entity_id=${selectedEntityId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(returnForm),
        }
      );
      const data = await response.json();

      if (data.success) {
        toast.success('Tax return record created successfully');
        setCreateReturnModalOpen(false);
        fetchTaxReturns();
        // Reset form
        setReturnForm({
          return_type: 'Form 1120',
          tax_year: new Date().getFullYear(),
          due_date: '',
          extension_filed: false,
          extended_due_date: ''
        });
      } else {
        toast.error(data.detail || 'Failed to create tax return record');
      }
    } catch (error) {
      console.error('Failed to create tax return:', error);
      toast.error('Failed to create tax return');
    } finally {
      setSubmitting(false);
    }
  };

  const getReturnStatusBadge = (status: string) => {
    switch (status) {
      case 'filed': return <Badge variant="default"><CheckCircle2 className="mr-1 h-3 w-3" />Filed</Badge>;
      case 'not_filed': return <Badge variant="secondary"><AlertCircle className="mr-1 h-3 w-3" />Not Filed</Badge>;
      case 'amended': return <Badge variant="outline">Amended</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tax Paid ({selectedYear})</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${paymentSummary ? Object.values(paymentSummary[selectedYear] || {}).reduce((sum: number, type: any) => sum + type.total_paid, 0).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">All tax types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Federal Income Tax</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${paymentSummary?.[selectedYear]?.['Federal Income Tax']?.total_paid?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">Current year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">State Income Tax</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${paymentSummary?.[selectedYear]?.['State Income Tax']?.total_paid?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">California</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payroll Taxes</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${paymentSummary?.[selectedYear]?.['Form 941']?.total_paid?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">Form 941</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="payments">Tax Payments</TabsTrigger>
          <TabsTrigger value="provision">Tax Provision (ASC 740)</TabsTrigger>
          <TabsTrigger value="returns">Tax Returns</TabsTrigger>
        </TabsList>

        {/* ============================================================================ */}
        {/* TAX PAYMENTS TAB */}
        {/* ============================================================================ */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tax Payments</CardTitle>
                  <CardDescription>Track all federal, state, and payroll tax payments</CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setCreatePaymentModalOpen(true)}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Record Payment
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground">Loading tax payments...</p>
              ) : taxPayments.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">No tax payments found for {selectedYear}</p>
                  <Button onClick={() => setCreatePaymentModalOpen(true)} className="mt-4">
                    Record First Payment
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment #</TableHead>
                      <TableHead>Tax Type</TableHead>
                      <TableHead>Tax Period</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxPayments.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.payment_number}</TableCell>
                        <TableCell>
                          <Badge className={getTaxTypeBadgeColor(payment.tax_type)}>
                            {payment.tax_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{payment.tax_period}</TableCell>
                        <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-mono font-semibold">${parseFloat(payment.amount_paid).toFixed(2)}</TableCell>
                        <TableCell>{payment.payment_method}</TableCell>
                        <TableCell>
                          {payment.status === 'paid' ? (
                            <Badge variant="default">Paid</Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Info Box */}
              <div className="mt-6 rounded-lg bg-blue-50 p-4 border border-blue-200">
                <div className="flex items-start">
                  <Upload className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900">Upload Tax Payment Documents</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Go to the Documents tab to upload tax payment confirmations. The system will automatically extract payment details and create records.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================================ */}
        {/* TAX PROVISION TAB (ASC 740) */}
        {/* ============================================================================ */}
        <TabsContent value="provision" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Income Tax Provision (ASC 740)</CardTitle>
                  <CardDescription>Calculate and record income tax provision per GAAP</CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  <Select value={selectedProvisionYear.toString()} onValueChange={(value) => setSelectedProvisionYear(parseInt(value))}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={provisionPeriod} onValueChange={setProvisionPeriod}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Annual">Annual</SelectItem>
                      <SelectItem value="Q1">Q1</SelectItem>
                      <SelectItem value="Q2">Q2</SelectItem>
                      <SelectItem value="Q3">Q3</SelectItem>
                      <SelectItem value="Q4">Q4</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleCalculateProvision} disabled={provisionCalculating}>
                    <Calculator className="mr-2 h-4 w-4" />
                    {provisionCalculating ? 'Calculating...' : 'Calculate Provision'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Calculation Result */}
              {provisionResult && (
                <div className="mb-6 space-y-4">
                  <div className="rounded-lg bg-slate-50 p-4 border">
                    <h4 className="font-semibold mb-4">Tax Provision Calculation - {selectedProvisionYear}</h4>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Pretax Book Income</p>
                        <p className="text-2xl font-bold">${provisionResult.pretax_book_income.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Taxable Income</p>
                        <p className="text-2xl font-bold">${provisionResult.taxable_income.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <h5 className="font-semibold mb-2">M-1 Reconciliation (Book-Tax Differences)</h5>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div>
                          <p className="text-sm font-medium">Additions:</p>
                          {Object.entries(provisionResult.m1_additions || {}).map(([key, value]: [string, any]) => (
                            <p key={key} className="text-sm text-muted-foreground">{key}: ${value.toFixed(2)}</p>
                          ))}
                        </div>
                        <div>
                          <p className="text-sm font-medium">Subtractions:</p>
                          {Object.entries(provisionResult.m1_subtractions || {}).map(([key, value]: [string, any]) => (
                            <p key={key} className="text-sm text-muted-foreground">{key}: ${value.toFixed(2)}</p>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <h5 className="font-semibold mb-2">Tax Expense</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Current Federal Tax:</span>
                          <span className="font-mono">${provisionResult.current_tax.federal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Current State Tax:</span>
                          <span className="font-mono">${provisionResult.current_tax.state.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Deferred Tax:</span>
                          <span className="font-mono">${(provisionResult.deferred_tax?.net || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg pt-2 border-t">
                          <span>Total Tax Provision:</span>
                          <span className="font-mono">${provisionResult.total_provision.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Effective Tax Rate:</span>
                          <span>{(provisionResult.effective_rate * 100).toFixed(2)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Previous Provisions */}
              {taxProvisions.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-4">Previous Provisions</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Year</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Pretax Income</TableHead>
                        <TableHead>Taxable Income</TableHead>
                        <TableHead>Total Provision</TableHead>
                        <TableHead>Effective Rate</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {taxProvisions.map((provision: any) => (
                        <TableRow key={provision.id}>
                          <TableCell>{provision.provision_year}</TableCell>
                          <TableCell>{provision.provision_period}</TableCell>
                          <TableCell className="font-mono">${parseFloat(provision.pretax_book_income).toFixed(2)}</TableCell>
                          <TableCell className="font-mono">${parseFloat(provision.taxable_income).toFixed(2)}</TableCell>
                          <TableCell className="font-mono font-semibold">${parseFloat(provision.total_tax_provision).toFixed(2)}</TableCell>
                          <TableCell>{(parseFloat(provision.effective_tax_rate) * 100).toFixed(2)}%</TableCell>
                          <TableCell>
                            {provision.status === 'calculated' ? (
                              <Badge variant="default">Calculated</Badge>
                            ) : provision.status === 'posted' ? (
                              <Badge variant="outline">Posted</Badge>
                            ) : (
                              <Badge variant="secondary">Draft</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {!provision.journal_entry_id && (
                              <Button size="sm" onClick={() => handleCreateProvisionJE(provision.id)}>
                                Create JE
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* ASC 740 Info */}
              <div className="mt-6 rounded-lg bg-purple-50 p-4 border border-purple-200">
                <div className="flex items-start">
                  <FileText className="h-5 w-5 text-purple-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-purple-900">ASC 740 - Income Tax Accounting</h4>
                    <p className="text-sm text-purple-700 mt-1">
                      The tax provision includes current tax expense (federal & state) and deferred tax (temporary differences). 
                      The M-1 reconciliation shows book-tax differences that adjust pretax income to taxable income.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================================ */}
        {/* TAX RETURNS TAB */}
        {/* ============================================================================ */}
        <TabsContent value="returns" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tax Returns</CardTitle>
                  <CardDescription>Track filed tax returns and extensions</CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setCreateReturnModalOpen(true)}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Add Tax Return
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground">Loading tax returns...</p>
              ) : taxReturns.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">No tax returns found for {selectedYear}</p>
                  <Button onClick={() => setCreateReturnModalOpen(true)} className="mt-4">
                    Add First Return
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Return Type</TableHead>
                      <TableHead>Tax Year</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Extension</TableHead>
                      <TableHead>Filing Date</TableHead>
                      <TableHead>Taxable Income</TableHead>
                      <TableHead>Total Tax</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxReturns.map((taxReturn: any) => (
                      <TableRow key={taxReturn.id}>
                        <TableCell className="font-medium">{taxReturn.return_type}</TableCell>
                        <TableCell>{taxReturn.tax_year}</TableCell>
                        <TableCell>{new Date(taxReturn.due_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {taxReturn.extension_filed ? (
                            <span className="text-sm">
                              Extended to {new Date(taxReturn.extended_due_date).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">No</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {taxReturn.filing_date ? new Date(taxReturn.filing_date).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="font-mono">
                          {taxReturn.taxable_income ? `$${parseFloat(taxReturn.taxable_income).toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="font-mono">
                          {taxReturn.total_tax ? `$${parseFloat(taxReturn.total_tax).toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>{getReturnStatusBadge(taxReturn.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Filing Info */}
              <div className="mt-6 rounded-lg bg-green-50 p-4 border border-green-200">
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900">Tax Return Filing Deadlines</h4>
                    <p className="text-sm text-green-700 mt-1">
                      C-Corp (Form 1120): 4th month after year-end (April 15 for calendar year)
                      <br />
                      S-Corp (Form 1120S) & Partnership (Form 1065): 3rd month + 15 days (March 15)
                      <br />
                      Extensions available: Form 7004 (6-month extension)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============================================================================ */}
      {/* CREATE PAYMENT MODAL */}
      {/* ============================================================================ */}
      <Dialog open={createPaymentModalOpen} onOpenChange={setCreatePaymentModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Tax Payment</DialogTitle>
            <DialogDescription>Manually record a tax payment</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tax Type *</Label>
              <Select
                value={paymentForm.tax_type}
                onValueChange={(value) => setPaymentForm({ ...paymentForm, tax_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Federal Income Tax">Federal Income Tax</SelectItem>
                  <SelectItem value="State Income Tax">State Income Tax (CA)</SelectItem>
                  <SelectItem value="Form 941">Payroll Tax (Form 941)</SelectItem>
                  <SelectItem value="FUTA">FUTA</SelectItem>
                  <SelectItem value="SUTA">SUTA (CA)</SelectItem>
                  <SelectItem value="Sales Tax">Sales Tax</SelectItem>
                  <SelectItem value="Estimated Tax Payment">Estimated Tax Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tax Period *</Label>
              <Input
                value={paymentForm.tax_period}
                onChange={(e) => setPaymentForm({ ...paymentForm, tax_period: e.target.value })}
                placeholder="Q1 2025, 2025, etc."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Date *</Label>
                <Input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount_paid}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount_paid: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={paymentForm.payment_method}
                onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="EFTPS">EFTPS</SelectItem>
                  <SelectItem value="IRS Direct Pay">IRS Direct Pay</SelectItem>
                  <SelectItem value="State Portal">State Portal</SelectItem>
                  <SelectItem value="Check">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Confirmation Number</Label>
              <Input
                value={paymentForm.confirmation_number}
                onChange={(e) => setPaymentForm({ ...paymentForm, confirmation_number: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePayment} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================================ */}
      {/* CREATE TAX RETURN MODAL */}
      {/* ============================================================================ */}
      <Dialog open={createReturnModalOpen} onOpenChange={setCreateReturnModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Tax Return Record</DialogTitle>
            <DialogDescription>Track a filed or upcoming tax return</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Return Type *</Label>
              <Select
                value={returnForm.return_type}
                onValueChange={(value) => setReturnForm({ ...returnForm, return_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Form 1120">Form 1120 (C-Corp)</SelectItem>
                  <SelectItem value="Form 1120S">Form 1120S (S-Corp)</SelectItem>
                  <SelectItem value="Form 1065">Form 1065 (Partnership)</SelectItem>
                  <SelectItem value="Form 100">Form 100 (CA C-Corp)</SelectItem>
                  <SelectItem value="Form 568">Form 568 (CA LLC)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tax Year *</Label>
              <Input
                type="number"
                value={returnForm.tax_year}
                onChange={(e) => setReturnForm({ ...returnForm, tax_year: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label>Due Date *</Label>
              <Input
                type="date"
                value={returnForm.due_date}
                onChange={(e) => setReturnForm({ ...returnForm, due_date: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="extension_filed"
                checked={returnForm.extension_filed}
                onChange={(e) => setReturnForm({ ...returnForm, extension_filed: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="extension_filed" className="text-sm font-normal cursor-pointer">
                Extension filed (Form 7004)
              </Label>
            </div>

            {returnForm.extension_filed && (
              <div className="space-y-2">
                <Label>Extended Due Date</Label>
                <Input
                  type="date"
                  value={returnForm.extended_due_date}
                  onChange={(e) => setReturnForm({ ...returnForm, extended_due_date: e.target.value })}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateReturnModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateReturn} disabled={submitting}>
              {submitting ? 'Creating...' : 'Add Return'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
