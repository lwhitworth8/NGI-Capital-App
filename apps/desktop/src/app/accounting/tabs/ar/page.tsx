'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  DollarSign,
  Users,
  FileText,
  Download,
  AlertTriangle,
  Mail,
  Eye,
  Loader2,
  Edit,
  CreditCard,
} from 'lucide-react';
import { useEntityContext } from '@/hooks/useEntityContext';
import { toast } from 'sonner';

interface Customer {
  id: number;
  customer_number: string;
  customer_name: string;
  customer_type: string | null;
  email: string | null;
  phone: string | null;
  billing_address: string;
  payment_terms: string;
  is_active: boolean;
  created_at: string;
}

interface Invoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  customer_name: string;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  status: string;
  payment_terms: string;
  created_at: string;
}

interface InvoiceLine {
  description: string;
  quantity: number;
  unit_price: number;
}

interface CustomerFormData {
  customer_name: string;
  customer_type: string;
  email: string;
  phone: string;
  billing_address_line1: string;
  billing_address_line2: string;
  billing_city: string;
  billing_state: string;
  billing_zip: string;
  payment_terms: string;
  tax_id: string;
  tax_exempt: boolean;
  notes: string;
}

interface InvoiceFormData {
  customer_id: number | null;
  invoice_date: string;
  payment_terms: string;
  lines: InvoiceLine[];
  tax_rate: number | null;
  memo: string;
}

export default function AccountsReceivableTab() {
  const { selectedEntityId } = useEntityContext();
  const [activeTab, setActiveTab] = useState('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [createCustomerModalOpen, setCreateCustomerModalOpen] = useState(false);
  const [createInvoiceModalOpen, setCreateInvoiceModalOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Customer form state
  const [customerForm, setCustomerForm] = useState<CustomerFormData>({
    customer_name: '',
    customer_type: 'Corporation',
    email: '',
    phone: '',
    billing_address_line1: '',
    billing_address_line2: '',
    billing_city: '',
    billing_state: 'CA',
    billing_zip: '',
    payment_terms: 'Net 30',
    tax_id: '',
    tax_exempt: false,
    notes: '',
  });

  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormData>({
    customer_id: null,
    invoice_date: new Date().toISOString().split('T')[0],
    payment_terms: 'Net 30',
    lines: [{ description: '', quantity: 1, unit_price: 0 }],
    tax_rate: null,
    memo: '',
  });

  useEffect(() => {
    if (selectedEntityId) {
      fetchCustomers();
      fetchInvoices();
    }
  }, [selectedEntityId]);

  const fetchCustomers = async () => {
    if (!selectedEntityId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/accounting/ar/customers?entity_id=${selectedEntityId}`);
      const data = await response.json();
      if (data.success) {
        setCustomers(data.customers || []);
      } else {
        toast.error('Failed to fetch customers');
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch customers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    if (!selectedEntityId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/accounting/ar/invoices?entity_id=${selectedEntityId}`);
      const data = await response.json();
      if (data.success) {
        setInvoices(data.invoices || []);
      } else {
        toast.error('Failed to fetch invoices');
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch invoices',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!selectedEntityId || !customerForm.customer_name) {
      toast.error('Customer name is required');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/accounting/ar/customers?entity_id=${selectedEntityId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerForm),
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Customer created successfully');
        setCreateCustomerModalOpen(false);
        fetchCustomers();
        // Reset form
        setCustomerForm({
          customer_name: '',
          customer_type: 'Corporation',
          email: '',
          phone: '',
          billing_address_line1: '',
          billing_address_line2: '',
          billing_city: '',
          billing_state: 'CA',
          billing_zip: '',
          payment_terms: 'Net 30',
          tax_id: '',
          tax_exempt: false,
          notes: '',
        });
      } else {
        toast.error(data.detail || 'Failed to create customer');
      }
    } catch (error) {
      console.error('Failed to create customer:', error);
      toast.error('Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!selectedEntityId || !invoiceForm.customer_id) {
      toast.error('Customer is required');
      return;
    }

    if (invoiceForm.lines.length === 0 || !invoiceForm.lines[0].description) {
      toast.error('At least one line item is required');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/accounting/ar/invoices?entity_id=${selectedEntityId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...invoiceForm,
          generate_pdf: true,
          create_je: true,
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Invoice ${data.invoice.invoice_number} created successfully`);
        setCreateInvoiceModalOpen(false);
        fetchInvoices();
        // Reset form
        setInvoiceForm({
          customer_id: null,
          invoice_date: new Date().toISOString().split('T')[0],
          payment_terms: 'Net 30',
          lines: [{ description: '', quantity: 1, unit_price: 0 }],
          tax_rate: null,
          memo: '',
        });
      } else {
        toast.error(data.detail || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Failed to create invoice:', error);
      toast.error('Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadInvoicePDF = async (invoiceId: number, invoiceNumber: string) => {
    try {
      const response = await fetch(`/api/accounting/ar/invoices/${invoiceId}/pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('Invoice PDF downloaded');
      } else {
        toast.error('Failed to download invoice PDF');
      }
    } catch (error) {
      console.error('Failed to download invoice PDF:', error);
      toast.error('Failed to download invoice PDF');
    }
  };

  const addInvoiceLine = () => {
    setInvoiceForm(prev => ({
      ...prev,
      lines: [...prev.lines, { description: '', quantity: 1, unit_price: 0 }],
    }));
  };

  const updateInvoiceLine = (index: number, field: keyof InvoiceLine, value: any) => {
    setInvoiceForm(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) => 
        i === index ? { ...line, [field]: value } : line
      ),
    }));
  };

  const removeInvoiceLine = (index: number) => {
    setInvoiceForm(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const calculateInvoiceSubtotal = () => {
    return invoiceForm.lines.reduce((sum, line) => sum + (line.quantity * line.unit_price), 0);
  };

  const calculateInvoiceTotal = () => {
    const subtotal = calculateInvoiceSubtotal();
    const tax = invoiceForm.tax_rate ? subtotal * (invoiceForm.tax_rate / 100) : 0;
    return subtotal + tax;
  };

  const filteredCustomers = customers.filter(c =>
    c.customer_name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(customerSearchTerm.toLowerCase()))
  );

  const filteredInvoices = invoices.filter(i =>
    i.invoice_number.toLowerCase().includes(invoiceSearchTerm.toLowerCase()) ||
    i.customer_name.toLowerCase().includes(invoiceSearchTerm.toLowerCase())
  );

  const openInvoicesCount = invoices.filter(i => ['draft', 'sent', 'viewed'].includes(i.status)).length;
  const totalAR = invoices.reduce((sum, i) => sum + i.amount_due, 0);
  const overdueCount = invoices.filter(i => {
    const dueDate = new Date(i.due_date);
    return i.status !== 'paid' && i.status !== 'cancelled' && dueDate < new Date();
  }).length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="bg-gray-100">Draft</Badge>;
      case 'sent':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Sent</Badge>;
      case 'viewed':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Viewed</Badge>;
      case 'partially_paid':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Partial</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Accounts Receivable</h2>
          <p className="text-muted-foreground">Manage customers and invoices per ASC 606</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openInvoicesCount}</div>
            <p className="text-xs text-muted-foreground">
              {overdueCount} overdue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total AR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAR.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <p className="text-xs text-muted-foreground">
              Amount receivable
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.filter(c => c.is_active).length}</div>
            <p className="text-xs text-muted-foreground">
              Customer relationships
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        {/* CUSTOMERS TAB */}
        <TabsContent value="customers" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search customers..." 
                className="pl-10"
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
              />
            </div>
            <Dialog open={createCustomerModalOpen} onOpenChange={setCreateCustomerModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Customer</DialogTitle>
                  <DialogDescription>Add a new customer to your customer master</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Customer Name *</Label>
                      <Input 
                        placeholder="Acme Corporation"
                        value={customerForm.customer_name}
                        onChange={(e) => setCustomerForm({...customerForm, customer_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Customer Type</Label>
                      <Select
                        value={customerForm.customer_type}
                        onValueChange={(value) => setCustomerForm({...customerForm, customer_type: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Individual">Individual</SelectItem>
                          <SelectItem value="Corporation">Corporation</SelectItem>
                          <SelectItem value="LLC">LLC</SelectItem>
                          <SelectItem value="Government">Government</SelectItem>
                          <SelectItem value="Non-Profit">Non-Profit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input 
                        type="email" 
                        placeholder="customer@example.com"
                        value={customerForm.email}
                        onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input 
                        placeholder="(555) 123-4567"
                        value={customerForm.phone}
                        onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Address Line 1</Label>
                    <Input 
                      placeholder="123 Main St"
                      value={customerForm.billing_address_line1}
                      onChange={(e) => setCustomerForm({...customerForm, billing_address_line1: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Address Line 2</Label>
                    <Input 
                      placeholder="Suite 100"
                      value={customerForm.billing_address_line2}
                      onChange={(e) => setCustomerForm({...customerForm, billing_address_line2: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input 
                        placeholder="Los Angeles"
                        value={customerForm.billing_city}
                        onChange={(e) => setCustomerForm({...customerForm, billing_city: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input 
                        placeholder="CA" 
                        maxLength={2}
                        value={customerForm.billing_state}
                        onChange={(e) => setCustomerForm({...customerForm, billing_state: e.target.value.toUpperCase()})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ZIP Code</Label>
                      <Input 
                        placeholder="90001"
                        value={customerForm.billing_zip}
                        onChange={(e) => setCustomerForm({...customerForm, billing_zip: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Payment Terms</Label>
                      <Select
                        value={customerForm.payment_terms}
                        onValueChange={(value) => setCustomerForm({...customerForm, payment_terms: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Net 15">Net 15</SelectItem>
                          <SelectItem value="Net 30">Net 30</SelectItem>
                          <SelectItem value="Net 60">Net 60</SelectItem>
                          <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tax ID (optional)</Label>
                      <Input 
                        placeholder="XX-XXXXXXX"
                        value={customerForm.tax_id}
                        onChange={(e) => setCustomerForm({...customerForm, tax_id: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Textarea 
                      placeholder="Additional notes about this customer..."
                      rows={3}
                      value={customerForm.notes}
                      onChange={(e) => setCustomerForm({...customerForm, notes: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateCustomerModalOpen(false)} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCustomer} disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Customer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex justify-center items-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No customers found</p>
                  <p className="text-sm">Create your first customer to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer #</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Terms</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map(customer => (
                      <TableRow key={customer.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-sm">{customer.customer_number}</TableCell>
                        <TableCell className="font-medium">{customer.customer_name}</TableCell>
                        <TableCell>
                          {customer.email && (
                            <div className="text-sm text-muted-foreground">{customer.email}</div>
                          )}
                          {customer.phone && (
                            <div className="text-sm text-muted-foreground">{customer.phone}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {customer.billing_address}
                        </TableCell>
                        <TableCell>{customer.payment_terms}</TableCell>
                        <TableCell>
                          <Badge variant={customer.is_active ? "default" : "secondary"}>
                            {customer.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVOICES TAB */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search invoices..." 
                className="pl-10"
                value={invoiceSearchTerm}
                onChange={(e) => setInvoiceSearchTerm(e.target.value)}
              />
            </div>
            <Dialog open={createInvoiceModalOpen} onOpenChange={setCreateInvoiceModalOpen}>
              <DialogTrigger asChild>
                <Button disabled={customers.length === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Invoice</DialogTitle>
                  <DialogDescription>Generate a new customer invoice per ASC 606</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Customer *</Label>
                      <Select
                        value={invoiceForm.customer_id?.toString() || ''}
                        onValueChange={(value) => setInvoiceForm({...invoiceForm, customer_id: parseInt(value)})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.filter(c => c.is_active).map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.customer_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Terms</Label>
                      <Select
                        value={invoiceForm.payment_terms}
                        onValueChange={(value) => setInvoiceForm({...invoiceForm, payment_terms: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Net 15">Net 15</SelectItem>
                          <SelectItem value="Net 30">Net 30</SelectItem>
                          <SelectItem value="Net 60">Net 60</SelectItem>
                          <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Invoice Date *</Label>
                      <Input 
                        type="date"
                        value={invoiceForm.invoice_date}
                        onChange={(e) => setInvoiceForm({...invoiceForm, invoice_date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tax Rate (%) [optional]</Label>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="9.50"
                        value={invoiceForm.tax_rate || ''}
                        onChange={(e) => setInvoiceForm({...invoiceForm, tax_rate: e.target.value ? parseFloat(e.target.value) : null})}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label>Line Items *</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addInvoiceLine}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add Line
                      </Button>
                    </div>
                    {invoiceForm.lines.map((line, index) => (
                      <div key={index} className="border rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Line {index + 1}</span>
                          {invoiceForm.lines.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeInvoiceLine(index)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Input
                            placeholder="Description of goods/services"
                            value={line.description}
                            onChange={(e) => updateInvoiceLine(index, 'description', e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Input
                              type="number"
                              placeholder="Quantity"
                              value={line.quantity}
                              onChange={(e) => updateInvoiceLine(index, 'quantity', parseFloat(e.target.value) || 1)}
                            />
                          </div>
                          <div>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Unit Price"
                              value={line.unit_price}
                              onChange={(e) => updateInvoiceLine(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <Input
                              disabled
                              value={`$${(line.quantity * line.unit_price).toFixed(2)}`}
                              className="bg-muted"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label>Memo (optional)</Label>
                    <Textarea
                      placeholder="Additional notes or terms..."
                      rows={2}
                      value={invoiceForm.memo}
                      onChange={(e) => setInvoiceForm({...invoiceForm, memo: e.target.value})}
                    />
                  </div>

                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span className="font-semibold">${calculateInvoiceSubtotal().toFixed(2)}</span>
                    </div>
                    {invoiceForm.tax_rate && (
                      <div className="flex justify-between text-sm">
                        <span>Tax ({invoiceForm.tax_rate}%):</span>
                        <span className="font-semibold">${(calculateInvoiceSubtotal() * (invoiceForm.tax_rate / 100)).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold border-t pt-2">
                      <span>Total:</span>
                      <span>${calculateInvoiceTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateInvoiceModalOpen(false)} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateInvoice} disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Invoice & Generate PDF
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex justify-center items-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No invoices found</p>
                  <p className="text-sm">Create your first invoice to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map(invoice => {
                      const isOverdue = new Date(invoice.due_date) < new Date() && invoice.status !== 'paid' && invoice.status !== 'cancelled';
                      
                      return (
                        <TableRow key={invoice.id} className="hover:bg-muted/50">
                          <TableCell className="font-mono text-sm font-medium">{invoice.invoice_number}</TableCell>
                          <TableCell>{invoice.customer_name}</TableCell>
                          <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                          <TableCell className={isOverdue ? 'text-red-600 font-medium' : ''}>
                            {new Date(invoice.due_date).toLocaleDateString()}
                            {isOverdue && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                          </TableCell>
                          <TableCell className="text-right">${invoice.total_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell>
                          <TableCell className="text-right">${invoice.amount_paid.toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell>
                          <TableCell className="text-right font-semibold">${invoice.amount_due.toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell>
                          <TableCell>
                            {getStatusBadge(invoice.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadInvoicePDF(invoice.id, invoice.invoice_number)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
