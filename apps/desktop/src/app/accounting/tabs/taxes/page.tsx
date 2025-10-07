'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Calculator, 
  FileText, 
  AlertCircle, 
  DollarSign, 
  Calendar, 
  Building2, 
  MapPin, 
  CheckCircle2, 
  XCircle,
  Upload,
  Link2,
  Download,
  TrendingUp
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEntityContext } from '@/hooks/useEntityContext';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TaxObligation {
  id: string;
  jurisdiction: string;
  taxType: string;
  form: string;
  frequency: string;
  dueDate: string;
  amount: number | null;
  status: 'NOT_DUE' | 'DUE' | 'PAID' | 'FILED' | 'OVERDUE';
  paidDate?: string;
  paidAmount?: number;
  journalEntryId?: number;
  documentId?: string;
}

interface TaxPayment {
  id: string;
  obligationId: string;
  amount: number;
  paidDate: string;
  paymentMethod: string;
  confirmationNumber: string;
  journalEntryId: number;
  documentId?: string;
}

export default function TaxesTab() {
  const { selectedEntityId } = useEntityContext();
  const [activeTab, setActiveTab] = useState('overview');
  const [obligations, setObligations] = useState<TaxObligation[]>([]);
  const [payments, setPayments] = useState<TaxPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedObligation, setSelectedObligation] = useState<TaxObligation | null>(null);

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paidDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'check',
    confirmationNumber: ''
  });

  useEffect(() => {
    if (selectedEntityId) {
      fetchTaxData();
    }
  }, [selectedEntityId]);

  const fetchTaxData = async () => {
    setLoading(true);
    try {
      // Initialize default tax obligations for Delaware entities operating in California
      const currentYear = new Date().getFullYear();
      const currentDate = new Date('2025-10-05'); // Using actual current date from user
      
      // TODO: Fetch entity type from API to determine LLC vs C-Corp
      const isLLC = true; // This should come from entity data
      
      const defaultObligations: TaxObligation[] = [];
      
      // Delaware obligations (different for LLC vs C-Corp)
      if (isLLC) {
        const deLLCDueDate = new Date(`${currentYear + 1}-06-01`);
        const daysUntilDue = Math.ceil((deLLCDueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        defaultObligations.push({
          id: 'de-llc-annual',
          jurisdiction: 'DE',
          taxType: 'Franchise Tax',
          form: 'LLC Annual Tax',
          frequency: 'Annual',
          dueDate: deLLCDueDate.toISOString().split('T')[0],
          amount: 300,
          status: daysUntilDue <= 90 ? 'DUE' : 'NOT_DUE'
        });
      } else {
        // C-Corp franchise tax (due March 1, different calculation)
        const deCCorpDueDate = new Date(`${currentYear + 1}-03-01`);
        const daysUntilDue = Math.ceil((deCCorpDueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        defaultObligations.push({
          id: 'de-ccorp-annual',
          jurisdiction: 'DE',
          taxType: 'Franchise Tax',
          form: 'C-Corp Annual Tax',
          frequency: 'Annual',
          dueDate: deCCorpDueDate.toISOString().split('T')[0],
          amount: null, // Calculated based on authorized shares or assumed par value
          status: daysUntilDue <= 90 ? 'DUE' : 'NOT_DUE'
        });
      }
      
      // California obligations
      const caFranchiseDueDate = new Date(`${currentYear + 1}-04-15`);
      const daysUntilCADue = Math.ceil((caFranchiseDueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      defaultObligations.push({
        id: 'ca-franchise-annual',
          jurisdiction: 'CA',
          taxType: 'Franchise Tax',
          form: 'Form 100',
          frequency: 'Annual',
          dueDate: caFranchiseDueDate.toISOString().split('T')[0],
          amount: 800,
          status: daysUntilCADue <= 90 ? 'DUE' : 'NOT_DUE'
        });
      
      // Federal obligations
      const fedCorporateDueDate = new Date(`${currentYear + 1}-04-15`);
      const daysUntilFedDue = Math.ceil((fedCorporateDueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      defaultObligations.push(
        {
          id: 'fed-corporate-annual',
          jurisdiction: 'FED',
          taxType: 'Corporate Income Tax',
          form: 'Form 1120',
          frequency: 'Annual',
          dueDate: fedCorporateDueDate.toISOString().split('T')[0],
          amount: null,
          status: daysUntilFedDue <= 90 ? 'DUE' : 'NOT_DUE'
        },
        {
          id: 'fed-estimated-q1-2026',
          jurisdiction: 'FED',
          taxType: 'Estimated Tax',
          form: 'Form 1120-W',
          frequency: 'Quarterly',
          dueDate: fedCorporateDueDate.toISOString().split('T')[0],
          amount: null,
          status: daysUntilFedDue <= 90 ? 'DUE' : 'NOT_DUE'
        },
        {
          id: 'ca-estimated-q1-2026',
          jurisdiction: 'CA',
          taxType: 'Estimated Tax',
          form: 'Form 100-ES',
          frequency: 'Quarterly',
          dueDate: caFranchiseDueDate.toISOString().split('T')[0],
          amount: null,
          status: daysUntilCADue <= 90 ? 'DUE' : 'NOT_DUE'
        }
      );

      setObligations(defaultObligations);
      
      // TODO: Fetch actual obligations from /api/tax/obligations
      // TODO: Fetch payment history from /api/tax/payments
      
    } catch (error) {
      console.error('Failed to fetch tax data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedEntityId) return;

    const formData = new FormData();
    formData.append('files', selectedFile);

    try {
      // Upload document
      const uploadResponse = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) throw new Error('Upload failed');

      const uploadData = await uploadResponse.json();
      const documentId = uploadData.documents[0].id;

      // Process document to detect tax payment
      const processResponse = await fetch(`/api/documents/${documentId}/process?entity_id=${selectedEntityId}`, {
        method: 'POST'
      });

      if (processResponse.ok) {
        alert('Tax payment document uploaded successfully! The system will automatically create the journal entry and update tax obligations.');
        setIsUploadModalOpen(false);
        setSelectedFile(null);
        fetchTaxData();
      }
    } catch (error) {
      console.error('Failed to upload tax document:', error);
      alert('Failed to upload document. Please try again.');
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedObligation || !selectedEntityId) return;

    try {
      // Create journal entry for tax payment
      // Dr: Tax Expense, Cr: Cash
      const jeResponse = await fetch('/api/accounting/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: selectedEntityId,
          entry_date: paymentForm.paidDate,
          description: `${selectedObligation.jurisdiction} ${selectedObligation.taxType} Payment`,
          reference: paymentForm.confirmationNumber,
          lines: [
            {
              account_id: 1, // TODO: Get actual Tax Expense account ID
              debit_amount: parseFloat(paymentForm.amount),
              credit_amount: 0,
              description: `${selectedObligation.jurisdiction} ${selectedObligation.taxType}`
            },
            {
              account_id: 2, // TODO: Get actual Cash account ID
              debit_amount: 0,
              credit_amount: parseFloat(paymentForm.amount),
              description: `Payment via ${paymentForm.paymentMethod}`
            }
          ]
        })
      });

      if (jeResponse.ok) {
        const jeData = await jeResponse.json();
        
        // Update obligation status
        const updatedObligations = obligations.map(o => 
          o.id === selectedObligation.id 
            ? { 
                ...o, 
                status: 'PAID' as const,
                paidDate: paymentForm.paidDate,
                paidAmount: parseFloat(paymentForm.amount),
                journalEntryId: jeData.id
              }
            : o
        );
        setObligations(updatedObligations);

        alert(`Tax payment recorded successfully!\n\nJournal Entry ID: ${jeData.id}\nAmount: $${paymentForm.amount}\n\nThe payment has been linked to the tax obligation.`);
        setIsRecordPaymentModalOpen(false);
        setPaymentForm({
          amount: '',
          paidDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'check',
          confirmationNumber: ''
        });
      }
    } catch (error) {
      console.error('Failed to record tax payment:', error);
      alert('Failed to record payment. Please try again.');
    }
  };

  const upcomingObligations = obligations.filter(o => 
    o.status === 'DUE' || o.status === 'OVERDUE'
  );
  
  // Calculate days until next due obligation
  const currentDate = new Date('2025-10-05');
  const daysUntilNext = upcomingObligations.length > 0 
    ? Math.min(...upcomingObligations.map(o => {
        const dueDate = new Date(o.dueDate);
        return Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      }))
    : 0;
  
  const totalDue = obligations
    .filter(o => o.status === 'DUE' || o.status === 'OVERDUE')
    .reduce((sum, o) => sum + (o.amount || 0), 0);
  const paidThisYear = obligations
    .filter(o => o.status === 'PAID')
    .reduce((sum, o) => sum + (o.paidAmount || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tax Compliance</h2>
          <p className="text-muted-foreground">Professional tax management for Delaware entities</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload Tax Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Tax Payment Receipt</DialogTitle>
                <DialogDescription>
                  Upload your tax payment confirmation (PDF, image, or document). 
                  The system will automatically detect the payment and create the proper journal entry.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tax Payment Document</Label>
                  <Input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.docx"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Supported: PDF, PNG, JPG, DOCX. System will extract amount, date, and jurisdiction.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleFileUpload} disabled={!selectedFile}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Process
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tax Context Alert */}
      <Alert>
        <Building2 className="h-4 w-4" />
        <AlertTitle>Delaware Entity Operating in California</AlertTitle>
        <AlertDescription>
          Your entity is incorporated in Delaware and has nexus in California. Required tax filings:
          <div className="grid gap-2 mt-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span><strong>Delaware:</strong> $300 annual franchise tax (due June 1)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-500" />
              <span><strong>California:</strong> $800 minimum + 8.84% on net income (due April 15)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span><strong>Federal:</strong> 21% corporate income tax (due April 15 or 4th month after year-end)</span>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Due</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingObligations.length}</div>
            <p className="text-xs text-muted-foreground">
              {upcomingObligations.length > 0 ? `Next due in ${daysUntilNext} days` : 'No upcoming obligations'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Due</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalDue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Estimated liability
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid This Year</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${paidThisYear.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Tax payments made
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jurisdictions</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              Federal, DE, CA
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="delaware">Delaware</TabsTrigger>
          <TabsTrigger value="california">California</TabsTrigger>
          <TabsTrigger value="federal">Federal</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tax Obligations</CardTitle>
                  <CardDescription>All tax filings and payments across jurisdictions</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Tax Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {obligations.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tax obligations found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jurisdiction</TableHead>
                      <TableHead>Tax Type</TableHead>
                      <TableHead>Form</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {obligations.map((obligation, index) => (
                      <motion.tr
                        key={obligation.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <TableCell>
                          <Badge variant="outline">{obligation.jurisdiction}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{obligation.taxType}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{obligation.form}</TableCell>
                        <TableCell className="tabular-nums">
                          {new Date(obligation.dueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {obligation.amount ? `$${obligation.amount.toLocaleString()}` : 'TBD'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              obligation.status === 'PAID' ? 'default' : 
                              obligation.status === 'OVERDUE' ? 'destructive' : 
                              'secondary'
                            }
                          >
                            {obligation.status === 'PAID' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {obligation.status === 'OVERDUE' && <XCircle className="h-3 w-3 mr-1" />}
                            {obligation.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {obligation.status !== 'PAID' && obligation.amount && (
                            <Dialog open={isRecordPaymentModalOpen && selectedObligation?.id === obligation.id} 
                                    onOpenChange={(open) => {
                                      setIsRecordPaymentModalOpen(open);
                                      if (open) {
                                        setSelectedObligation(obligation);
                                        setPaymentForm(prev => ({ ...prev, amount: obligation.amount?.toString() || '' }));
                                      }
                                    }}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  Record Payment
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Record Tax Payment</DialogTitle>
                                  <DialogDescription>
                                    Record payment for {obligation.jurisdiction} {obligation.taxType}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Amount Paid *</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={paymentForm.amount}
                                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                      placeholder="300.00"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Payment Date *</Label>
                                    <Input
                                      type="date"
                                      value={paymentForm.paidDate}
                                      onChange={(e) => setPaymentForm({ ...paymentForm, paidDate: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Payment Method</Label>
                                    <select 
                                      className="w-full border rounded-md px-3 py-2"
                                      value={paymentForm.paymentMethod}
                                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                                    >
                                      <option value="check">Check</option>
                                      <option value="ach">ACH Transfer</option>
                                      <option value="wire">Wire Transfer</option>
                                      <option value="credit_card">Credit Card</option>
                                    </select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Confirmation Number</Label>
                                    <Input
                                      value={paymentForm.confirmationNumber}
                                      onChange={(e) => setPaymentForm({ ...paymentForm, confirmationNumber: e.target.value })}
                                      placeholder="e.g., Check #1234 or Transaction ID"
                                    />
                                  </div>
                                  <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="text-xs">
                                      This will create a journal entry:<br/>
                                      Dr: Tax Expense ${paymentForm.amount || '0.00'}<br/>
                                      Cr: Cash ${paymentForm.amount || '0.00'}
                                    </AlertDescription>
                                  </Alert>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setIsRecordPaymentModalOpen(false)}>
                                    Cancel
                                  </Button>
                                  <Button onClick={handleRecordPayment} disabled={!paymentForm.amount}>
                                    Record Payment
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                          {obligation.status === 'PAID' && obligation.journalEntryId && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`/accounting?tab=gl&subtab=je&je=${obligation.journalEntryId}`}>
                                <Link2 className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delaware" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Delaware Tax Compliance</CardTitle>
              <CardDescription>Annual franchise tax for Delaware entities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold mb-2">LLC Annual Tax</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>Amount: <strong>$300 flat fee</strong> (all LLCs)</li>
                  <li>Due Date: <strong>June 1</strong> annually</li>
                  <li>Payment: Online via Delaware Division of Corporations</li>
                  <li>Late Penalty: $200 + interest after June 1</li>
                </ul>
              </div>
              
              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-semibold mb-2">C-Corporation Annual Tax (when you convert)</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Due Date:</strong> March 1 annually
                </p>
                <p className="text-sm font-medium mb-2">Two calculation methods (choose the lower):</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">1. Authorized Shares Method:</p>
                    <ul className="list-disc list-inside pl-2 space-y-0.5">
                      <li>1-5,000 shares: <strong>$175 minimum</strong></li>
                      <li>5,001-10,000 shares: $250</li>
                      <li>10,001+ shares: scales up</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">2. Assumed Par Value Method:</p>
                    <ul className="list-disc list-inside pl-2 space-y-0.5">
                      <li>Formula: (Gross Assets Ã· Issued Shares) Ã— Authorized Shares</li>
                      <li>Tax: (Result Ã· $1,000,000) Ã— $400</li>
                      <li><strong>$400 minimum</strong></li>
                    </ul>
                  </div>
                  <p className="text-xs italic">Maximum: $200,000 for both methods</p>
                </div>
              </div>
              
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold mb-2">No State Income Tax</h3>
                <p className="text-sm text-muted-foreground">
                  Delaware does not impose state corporate income tax on entities operating outside Delaware.
                  Only the annual franchise tax is required.
                </p>
              </div>
              <Button variant="outline" asChild>
                <a href="https://corp.delaware.gov/" target="_blank" rel="noopener noreferrer">
                  <FileText className="h-4 w-4 mr-2" />
                  Delaware Division of Corporations
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="california" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>California Tax Compliance</CardTitle>
              <CardDescription>Franchise tax for foreign entities doing business in CA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>California Nexus Requirements</AlertTitle>
                <AlertDescription>
                  Foreign entities with physical presence or economic nexus ($500K+ sales) must register and file in California.
                </AlertDescription>
              </Alert>

              <div className="border-l-4 border-orange-500 pl-4">
                <h3 className="font-semibold mb-2">Form 100 - Franchise Tax</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>Due Date: <strong>April 15</strong> (or 15th day of 4th month)</li>
                  <li>Extension: 6 months (Form 7004)</li>
                  <li>Tax Rate: <strong>8.84%</strong> on CA-source net income</li>
                  <li>Minimum: <strong>$800/year</strong> (waived first year)</li>
                  <li>Estimated Payments: Quarterly (Form 100-ES)</li>
                </ul>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-semibold mb-2">Required Registrations</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>Statement and Designation by Foreign Corporation</li>
                  <li>Certificate of Good Standing from Delaware</li>
                  <li>Registered agent in California</li>
                  <li>CA Franchise Tax Board registration</li>
                </ul>
              </div>

              <Button variant="outline" asChild>
                <a href="https://www.ftb.ca.gov/" target="_blank" rel="noopener noreferrer">
                  <FileText className="h-4 w-4 mr-2" />
                  California Franchise Tax Board
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="federal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Federal Tax Compliance</CardTitle>
              <CardDescription>IRS corporate income tax filings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold mb-2">Form 1120 - Corporate Income Tax</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>Due Date: <strong>April 15</strong> (or 15th day of 4th month)</li>
                  <li>Extension: 6 months (Form 7004)</li>
                  <li>Tax Rate: <strong>21%</strong> flat rate on taxable income</li>
                  <li>Estimated Payments: Quarterly (Form 1120-W)</li>
                </ul>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold mb-2">Quarterly Estimated Tax</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Due dates for calendar year corporations:
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>Q1: April 15</li>
                  <li>Q2: June 15</li>
                  <li>Q3: September 15</li>
                  <li>Q4: December 15</li>
                </ul>
              </div>

              <Button variant="outline" asChild>
                <a href="https://www.irs.gov/corporations" target="_blank" rel="noopener noreferrer">
                  <FileText className="h-4 w-4 mr-2" />
                  IRS Corporate Tax Information
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Record of all tax payments made</CardDescription>
            </CardHeader>
            <CardContent>
              {obligations.filter(o => o.status === 'PAID').length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tax payments recorded yet</p>
                  <p className="text-sm">Payments will appear here after recording</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {obligations.filter(o => o.status === 'PAID').map((payment, index) => (
                    <motion.div
                      key={payment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium">
                            {payment.jurisdiction} {payment.taxType}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Paid: {payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : 'N/A'} â€¢
                            JE #{payment.journalEntryId}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold">${(payment.paidAmount || 0).toLocaleString()}</span>
                        {payment.journalEntryId && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={`/accounting?tab=gl&subtab=je&je=${payment.journalEntryId}`}>
                              <Link2 className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </motion.div>
  );
}