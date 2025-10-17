'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedText } from '@ngi/ui';
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
  Trash2,
} from 'lucide-react';
import { useEntityContext } from '@/hooks/useEntityContext';
import { toast } from 'sonner';
import { InvoicePDFPreview } from '@/components/accounting/InvoicePDFPreview';

interface Customer {
  id: number;
  customer_number: string;
  customer_name: string;
  customer_type: string | null;
  email: string | null;
  phone: string | null;
  billing_address: string;
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
  amount?: number | null;
  revenue_account_id?: number | null;
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
  tax_id: string;
  tax_exempt: boolean;
  notes: string;
}

interface InvoiceFormData {
  customer_id: number | null;
  invoice_date: string;
  due_date?: string | null;
  payment_terms: string;
  lines: InvoiceLine[];
  tax_rate: number | null;
  memo: string;
  status: 'draft' | 'sent';
}

interface RevenueAccount {
  id: number;
  account_number: string;
  account_name: string;
}

export default function AccountsReceivableTab() {
  const { selectedEntityId } = useEntityContext();
  const [activeTab, setActiveTab] = useState('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [createCustomerModalOpen, setCreateCustomerModalOpen] = useState(false);
  const [editCustomerModalOpen, setEditCustomerModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [createInvoiceModalOpen, setCreateInvoiceModalOpen] = useState(false);
  const [editInvoiceModalOpen, setEditInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const [recordPaymentInvoice, setRecordPaymentInvoice] = useState<Invoice | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

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
    tax_id: '',
    tax_exempt: false,
    notes: '',
  });

  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormData>({
    customer_id: null,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: null,
    payment_terms: 'Net 30',
    lines: [{ description: '', quantity: 1, unit_price: 0, amount: null, revenue_account_id: undefined }],
    tax_rate: null,
    memo: '',
    status: 'draft',
  });

  const [revenueAccounts, setRevenueAccounts] = useState<RevenueAccount[]>([]);
  const [aging, setAging] = useState<{ totals: { [k: string]: number }, total_open_ar: number } | null>(null);
  const [agingSelectedBucket, setAgingSelectedBucket] = useState<string>('>90');
  const [remittance, setRemittance] = useState<{ bank_name?: string; account_name?: string; routing_number?: string; account_number_masked?: string } | null>(null);
  const [previewInvoiceNumber, setPreviewInvoiceNumber] = useState<string>('');
  const [entityName, setEntityName] = useState<string>('');

  const [paymentForm, setPaymentForm] = useState({
    payment_amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Bank',
    reference_number: '',
    notes: '',
    file: null as File | null,
    uploadedDoc: null as any,
  });

  useEffect(() => {
    if (selectedEntityId) {
      fetchCustomers();
      fetchInvoices();
      fetchRevenueAccounts();
      fetchAging();
      fetchRemittance();
      fetchNextInvoiceNumber();
      fetchEntity();
    }
  }, [selectedEntityId]);

  const fetchRevenueAccounts = async () => {
    if (!selectedEntityId) return;
    try {
      const res = await fetch(`/api/accounting/ar/revenue-accounts?entity_id=${selectedEntityId}`);
      const data = await res.json();
      if (data.success) {
        setRevenueAccounts(data.accounts || []);
      }
    } catch (e) {
      console.error('Failed to fetch revenue accounts', e);
    }
  };

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

  const openEditCustomer = async (customerId: number) => {
    try {
      setSubmitting(true);
      setEditingCustomerId(customerId);
      const res = await fetch(`/api/accounting/ar/customers/${customerId}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || 'Failed to load customer');
      const c = data.customer;
      setCustomerForm({
        customer_name: c.customer_name || '',
        customer_type: c.customer_type || 'Corporation',
        email: c.email || '',
        phone: c.phone || '',
        billing_address_line1: c.billing_address_line1 || '',
        billing_address_line2: c.billing_address_line2 || '',
        billing_city: c.billing_city || '',
        billing_state: c.billing_state || 'CA',
        billing_zip: c.billing_zip || '',
        tax_id: c.tax_id || '',
        tax_exempt: !!c.tax_exempt,
        notes: c.notes || '',
      });
      setEditCustomerModalOpen(true);
    } catch (e) {
      console.error('Failed to open edit customer', e);
      toast.error('Failed to open customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomerId) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/accounting/ar/customers/${editingCustomerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerForm.customer_name || undefined,
          customer_type: customerForm.customer_type || undefined,
          email: customerForm.email || undefined,
          phone: customerForm.phone || undefined,
          billing_address_line1: customerForm.billing_address_line1 || undefined,
          billing_address_line2: customerForm.billing_address_line2 || undefined,
          billing_city: customerForm.billing_city || undefined,
          billing_state: customerForm.billing_state || undefined,
          billing_zip: customerForm.billing_zip || undefined,
          tax_id: customerForm.tax_id || undefined,
          tax_exempt: customerForm.tax_exempt,
          notes: customerForm.notes || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.detail || 'Failed to update customer');
      toast.success('Customer updated');
      setEditCustomerModalOpen(false);
      setEditingCustomerId(null);
      fetchCustomers();
    } catch (e: any) {
      console.error('Failed to update customer', e);
      toast.error(e?.message || 'Failed to update customer');
    } finally {
      setSubmitting(false);
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
        // refresh aging after invoices load
        fetchAging();
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

  const fetchAging = async () => {
    if (!selectedEntityId) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/accounting/ar/reports/ar-aging?entity_id=${selectedEntityId}&as_of=${today}`);
      const data = await res.json();
      if (data.success) {
        setAging({ totals: data.totals || {}, total_open_ar: data.total_open_ar || 0 });
      }
    } catch (e) {
      console.error('Failed to fetch aging', e);
    }
  };

  const fetchRemittance = async () => {
    if (!selectedEntityId) return;
    try {
      // Derive remittance from Mercury bank account details
      const res = await fetch(`/api/accounting/bank-reconciliation/accounts?entity_id=${selectedEntityId}`);
      if (!res.ok) return;
      const accounts = await res.json();
      const primary = Array.isArray(accounts) ? (accounts.find((a: any) => a.is_primary) || accounts[0]) : null;
      if (primary && primary.bank_name) {
        setRemittance({
          bank_name: primary.bank_name,
          account_name: primary.account_name,
          routing_number: primary.routing_number,
          account_number_masked: primary.account_number_masked,
        });
      }
    } catch (e) {
      // silent
    }
  };

  const fetchNextInvoiceNumber = async () => {
    if (!selectedEntityId) return;
    try {
      const res = await fetch(`/api/accounting/ar/invoices/next-number?entity_id=${selectedEntityId}`);
      const data = await res.json();
      if (data.success) setPreviewInvoiceNumber(data.next_invoice_number);
    } catch {}
  };

  const fetchEntity = async () => {
    try {
      const res = await fetch('/api/entities');
      if (!res.ok) return;
      const list = await res.json();
      const ent = (list || []).find((e: any) => e.id === selectedEntityId);
      if (ent?.entity_name) setEntityName(ent.entity_name);
    } catch {}
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
          due_date: null,
          payment_terms: 'Net 30',
          lines: [{ description: '', quantity: 1, unit_price: 0, amount: null, revenue_account_id: undefined }],
          tax_rate: null,
          memo: '',
        });
        setPreviewInvoiceNumber('');
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

  const handleDeleteInvoice = async (invoiceId: number, invoiceNumber: string) => {
    if (!confirm(`Are you sure you want to delete invoice ${invoiceNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/accounting/ar/invoices/${invoiceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Invoice deleted successfully');
        // Refresh the invoices list
        await fetchInvoices();
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Failed to delete invoice');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const handleEditInvoice = async (invoice: Invoice) => {
    try {
      // Fetch the full invoice details including lines
      const response = await fetch(`/api/accounting/ar/invoices/${invoice.id}`);
      if (response.ok) {
        const data = await response.json();
        const fullInvoice = data.invoice;
        
        // Convert invoice lines to the form format
        const lines = fullInvoice.lines?.map((line: any) => ({
          description: line.description || '',
          quantity: line.quantity || 1,
          unit_price: line.unit_price || 0,
          amount: line.total_amount || null,
          revenue_account_id: line.revenue_account_id
        })) || [{ description: '', quantity: 1, unit_price: 0, amount: null, revenue_account_id: undefined }];

        // Set the form data
        setInvoiceForm({
          customer_id: fullInvoice.customer_id,
          invoice_date: fullInvoice.invoice_date,
          due_date: fullInvoice.due_date,
          payment_terms: fullInvoice.payment_terms || 'Net 30',
          lines: lines,
          tax_rate: fullInvoice.tax_rate,
          memo: fullInvoice.memo || '',
          status: fullInvoice.status
        });

        // Set editing state
        setEditingInvoice(fullInvoice);
        setEditInvoiceModalOpen(true);
      } else {
        toast.error('Failed to load invoice details');
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error('Failed to load invoice details');
    }
  };

  const handleUpdateInvoice = async () => {
    if (!editingInvoice || !selectedEntityId || !invoiceForm.customer_id) {
      toast.error('Customer is required');
      return;
    }

    if (invoiceForm.lines.length === 0 || !invoiceForm.lines[0].description) {
      toast.error('At least one line item is required');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/accounting/ar/invoices/${editingInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceForm),
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Invoice ${editingInvoice.invoice_number} updated successfully`);
        setEditInvoiceModalOpen(false);
        setEditingInvoice(null);
        fetchInvoices();
        
        // Reset form
        setInvoiceForm({
          customer_id: null,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: null,
          payment_terms: 'Net 30',
          lines: [{ description: '', quantity: 1, unit_price: 0, amount: null, revenue_account_id: undefined }],
          tax_rate: null,
          memo: '',
          status: 'draft',
        });
      } else {
        toast.error(data.detail || 'Failed to update invoice');
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenRecordPayment = (invoice: Invoice) => {
    setRecordPaymentInvoice(invoice);
    setPaymentForm({
      payment_amount: invoice.amount_due,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'Bank',
      reference_number: '',
      notes: `Payment for ${invoice.invoice_number}`,
      file: null,
      uploadedDoc: null,
    });
    setRecordPaymentModalOpen(true);
  };

  const handleUploadBankDoc = async () => {
    if (!selectedEntityId || !paymentForm.file) return null;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', paymentForm.file);
      formData.append('entity_id', String(selectedEntityId));
      formData.append('category', 'banking');
      const res = await fetch('/api/accounting/documents/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const doc = await res.json();
      setPaymentForm(prev => ({ ...prev, uploadedDoc: doc }));
      toast.success('Bank document uploaded');
      return doc;
    } catch (e) {
      toast.error('Failed to upload bank document');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedEntityId || !recordPaymentInvoice) return;
    if (paymentForm.payment_amount <= 0) {
      toast.error('Payment amount must be positive');
      return;
    }
    setSubmitting(true);
    try {
      // Upload bank doc if provided
      if (paymentForm.file && !paymentForm.uploadedDoc) {
        const uploaded = await handleUploadBankDoc();
        if (!uploaded) {
          setSubmitting(false);
          return;
        }
      }
      // Build notes with doc reference
      const notes = paymentForm.uploadedDoc ? `${paymentForm.notes || ''} [Doc #${paymentForm.uploadedDoc.id}]` : paymentForm.notes;
      const res = await fetch(`/api/accounting/ar/invoices/${recordPaymentInvoice.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_date: paymentForm.payment_date,
          payment_amount: paymentForm.payment_amount,
          payment_method: paymentForm.payment_method,
          reference_number: paymentForm.reference_number || null,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.detail || 'Failed to record payment');
      }
      toast.success('Payment recorded');
      setRecordPaymentModalOpen(false);
      setRecordPaymentInvoice(null);
      fetchInvoices();
    } catch (e: any) {
      console.error('Record payment failed', e);
      toast.error(e?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const addInvoiceLine = () => {
    setInvoiceForm(prev => ({
      ...prev,
      lines: [...prev.lines, { description: '', quantity: 1, unit_price: 0, amount: null, revenue_account_id: undefined }],
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

  const calculateLineAmount = (line: InvoiceLine) => {
    if (line.amount !== null && line.amount !== undefined && !Number.isNaN(line.amount)) return line.amount;
    const qty = line.quantity || 0;
    const rate = line.unit_price || 0;
    return qty * rate;
  };

  const calculateInvoiceSubtotal = () => {
    return invoiceForm.lines.reduce((sum, line) => sum + calculateLineAmount(line), 0);
  };

  const calculateInvoiceTotal = () => {
    const subtotal = calculateInvoiceSubtotal();
    const tax = invoiceForm.tax_rate ? subtotal * (invoiceForm.tax_rate / 100) : 0;
    return subtotal + tax;
  };
  const fmtCurrency = (n: number) => `$${(n || 0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`;

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
          <AnimatedText 
            text="Accounts Receivable" 
            as="h2" 
            className="text-2xl font-bold tracking-tight"
            delay={0.1}
          />
          <AnimatedText 
            text="Manage customers and invoices per ASC 606" 
            as="p" 
            className="text-muted-foreground"
            delay={0.3}
            stagger={0.02}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer">
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

        <Card className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer">
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

        <Card className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A/R Aging</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${((aging?.totals?.[agingSelectedBucket] || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {[
                { label: '0–30', key: '0_30' },
                { label: '31–60', key: '31_60' },
                { label: '61–90', key: '61_90' },
                { label: '>90', key: '>90' },
              ].map(b => (
                <Badge
                  key={b.key}
                  variant={agingSelectedBucket === b.key ? 'default' : 'secondary'}
                  className="cursor-pointer"
                  onClick={() => setAgingSelectedBucket(b.key)}
                  title={`Show ${b.label} bucket amount`}
                >
                  {b.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Removed separate AR Aging row to keep summary compact */}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="mb-6 flex justify-center">
          <TabsList className="h-11 bg-muted/50">
            <TabsTrigger value="customers" className="data-[state=active]:bg-background px-6">
              Customers
            </TabsTrigger>
            <TabsTrigger value="invoices" className="data-[state=active]:bg-background px-6">
              Invoices
            </TabsTrigger>
          </TabsList>
        </div>

        {/* CUSTOMERS TAB */}
        <TabsContent value="customers" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <CardTitle>Customers</CardTitle>
                <div className="flex items-center gap-3 mt-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search customers..." 
                      className="pl-10 w-64"
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
                          <Label>Tax ID (optional)</Label>
                          <Input 
                            placeholder="XX-XXXXXXX"
                            value={customerForm.tax_id}
                            onChange={(e) => setCustomerForm({...customerForm, tax_id: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tax Exempt</Label>
                          <Select
                            value={customerForm.tax_exempt ? 'true' : 'false'}
                            onValueChange={(value) => setCustomerForm({...customerForm, tax_exempt: value === 'true'})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="false">No</SelectItem>
                              <SelectItem value="true">Yes</SelectItem>
                            </SelectContent>
                          </Select>
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
              </div>
            </CardHeader>
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
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map(customer => (
                      <TableRow key={customer.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openEditCustomer(customer.id)}>
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
        <TabsContent value="invoices" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <CardTitle>Invoices</CardTitle>
                <div className="flex items-center gap-3 mt-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search invoices..." 
                      className="pl-10 w-64"
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
                          <Label>Payment Terms (optional)</Label>
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
                          <Label>Invoice Status</Label>
                          <Select
                            value={invoiceForm.status}
                            onValueChange={(value: 'draft' | 'sent') => setInvoiceForm({...invoiceForm, status: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft (Save for later editing)</SelectItem>
                              <SelectItem value="sent">Approved & Ready to Send</SelectItem>
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
                          <Label>Due Date *</Label>
                          <Input 
                            type="date"
                            value={invoiceForm.due_date || ''}
                            onChange={(e) => setInvoiceForm({...invoiceForm, due_date: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
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
                        <div className="space-y-2">
                          <Label>Preset</Label>
                          <Select
                            onValueChange={(v) => {
                              if (v === 'advisory') {
                                setInvoiceForm(prev => ({
                                  ...prev,
                                  lines: prev.lines.map((ln, i) => ({
                                    ...ln,
                                    description: i === 0 && !ln.description ? 'Professional services' : ln.description,
                                    revenue_account_id: revenueAccounts.find(a => a.account_number.startsWith('40110'))?.id || ln.revenue_account_id,
                                  }))
                                }));
                              } else if (v === 'sponsorship') {
                                setInvoiceForm(prev => ({
                                  ...prev,
                                  lines: prev.lines.map((ln, i) => ({
                                    ...ln,
                                    description: i === 0 && !ln.description ? 'Sponsorship deliverables' : ln.description,
                                    revenue_account_id: revenueAccounts.find(a => a.account_number.startsWith('40180'))?.id || ln.revenue_account_id,
                                  }))
                                }));
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select preset (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="advisory">Advisory</SelectItem>
                              <SelectItem value="sponsorship">Sponsorship</SelectItem>
                            </SelectContent>
                          </Select>
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
                            <div className="flex justify-between items-center mb-1">
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
                            <div className="grid grid-cols-4 gap-2">
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
                                  type="number"
                                  step="0.01"
                                  placeholder="Amount (overrides Qty x Rate)"
                                  value={line.amount ?? ''}
                                  onChange={(e) => updateInvoiceLine(index, 'amount', e.target.value ? parseFloat(e.target.value) : null)}
                                />
                              </div>
                              <div>
                                <Input
                                  disabled
                                  value={fmtCurrency(calculateLineAmount(line))}
                                  className="bg-muted"
                                />
                              </div>
                            </div>
                          <div className="grid grid-cols-1 gap-2">
                            <div className="space-y-2">
                              <Label>Revenue Account</Label>
                              <Select
                                value={line.revenue_account_id?.toString() || ''}
                                onValueChange={(value) => updateInvoiceLine(index, 'revenue_account_id', value ? parseInt(value) : null)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select revenue account" />
                                </SelectTrigger>
                                <SelectContent>
                                  {revenueAccounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id.toString()}>{acc.account_number} - {acc.account_name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
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

                      {/* Live PDF Preview */}
                      <div className="mt-6 border rounded-lg p-4 bg-muted/30">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm font-semibold">Live PDF Preview</div>
                          <div className="text-xs text-muted-foreground">Real-time PDF generation</div>
                        </div>
                        <div className="min-h-[400px]">
                          <InvoicePDFPreview 
                            invoiceData={invoiceForm}
                            entityId={selectedEntityId}
                            className="w-full h-full"
                          />
                        </div>
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
                        {invoiceForm.status === 'draft' ? 'Save as Draft' : 'Create Invoice & Generate PDF'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Edit Invoice Modal */}
                <Dialog open={editInvoiceModalOpen} onOpenChange={setEditInvoiceModalOpen}>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Invoice {editingInvoice?.invoice_number}</DialogTitle>
                      <DialogDescription>Edit draft invoice details and change status</DialogDescription>
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
                          <Label>Payment Terms (optional)</Label>
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
                          <Label>Invoice Status</Label>
                          <Select
                            value={invoiceForm.status}
                            onValueChange={(value: 'draft' | 'sent') => setInvoiceForm({...invoiceForm, status: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft (Save for later editing)</SelectItem>
                              <SelectItem value="sent">Approved & Ready to Send</SelectItem>
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
                          <Label>Due Date *</Label>
                          <Input 
                            type="date"
                            value={invoiceForm.due_date || ''}
                            onChange={(e) => setInvoiceForm({...invoiceForm, due_date: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tax Rate (%) [optional]</Label>
                          <Input 
                            type="number"
                            step="0.01"
                            value={invoiceForm.tax_rate || ''}
                            onChange={(e) => setInvoiceForm({...invoiceForm, tax_rate: parseFloat(e.target.value) || null})}
                            placeholder="9.5"
                          />
                        </div>
                      </div>
                      
                      {/* Line Items */}
                      <div className="space-y-2">
                        <Label>Line Items *</Label>
                        {invoiceForm.lines.map((line, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 items-end">
                            <div className="col-span-5">
                              <Input
                                placeholder="Description"
                                value={line.description}
                                onChange={(e) => {
                                  const newLines = [...invoiceForm.lines];
                                  newLines[index].description = e.target.value;
                                  setInvoiceForm({...invoiceForm, lines: newLines});
                                }}
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Qty"
                                value={line.quantity || ''}
                                onChange={(e) => {
                                  const newLines = [...invoiceForm.lines];
                                  newLines[index].quantity = parseFloat(e.target.value) || 0;
                                  setInvoiceForm({...invoiceForm, lines: newLines});
                                }}
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Rate"
                                value={line.unit_price || ''}
                                onChange={(e) => {
                                  const newLines = [...invoiceForm.lines];
                                  newLines[index].unit_price = parseFloat(e.target.value) || 0;
                                  setInvoiceForm({...invoiceForm, lines: newLines});
                                }}
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Amount"
                                value={line.amount || ''}
                                onChange={(e) => {
                                  const newLines = [...invoiceForm.lines];
                                  newLines[index].amount = parseFloat(e.target.value) || null;
                                  setInvoiceForm({...invoiceForm, lines: newLines});
                                }}
                              />
                            </div>
                            <div className="col-span-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newLines = invoiceForm.lines.filter((_, i) => i !== index);
                                  setInvoiceForm({...invoiceForm, lines: newLines});
                                }}
                                disabled={invoiceForm.lines.length === 1}
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setInvoiceForm({
                            ...invoiceForm,
                            lines: [...invoiceForm.lines, { description: '', quantity: 1, unit_price: 0, amount: null, revenue_account_id: undefined }]
                          })}
                        >
                          + Add Line
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label>Memo (optional)</Label>
                        <Textarea
                          placeholder="Additional notes or terms..."
                          value={invoiceForm.memo}
                          onChange={(e) => setInvoiceForm({...invoiceForm, memo: e.target.value})}
                         />
                      </div>

                      {/* Live PDF Preview */}
                      <div className="mt-6 border rounded-lg p-4 bg-muted/30">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm font-semibold">Live PDF Preview</div>
                          <div className="text-xs text-muted-foreground">Real-time PDF generation</div>
                        </div>
                        <div className="min-h-[400px]">
                          <InvoicePDFPreview 
                            invoiceData={invoiceForm}
                            entityId={selectedEntityId}
                            className="w-full h-full"
                          />
                        </div>
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
                        <div className="flex justify-between text-sm font-bold">
                          <span>Total:</span>
                          <span>${(calculateInvoiceSubtotal() + (invoiceForm.tax_rate ? calculateInvoiceSubtotal() * (invoiceForm.tax_rate / 100) : 0)).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEditInvoiceModalOpen(false)} disabled={submitting}>
                        Cancel
                      </Button>
                      <Button onClick={handleUpdateInvoice} disabled={submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {invoiceForm.status === 'draft' ? 'Save as Draft' : 'Update & Mark as Ready'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                </div>
              </div>
            </CardHeader>
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenRecordPayment(invoice)}
                                title="Record Payment"
                              >
                                <CreditCard className="h-4 w-4" />
                              </Button>
                              {invoice.status === 'draft' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditInvoice(invoice)}
                                    title="Edit Draft Invoice"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteInvoice(invoice.id, invoice.invoice_number)}
                                    title="Delete Draft Invoice"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
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

      {/* Record Payment Modal */}
      <Dialog open={recordPaymentModalOpen} onOpenChange={setRecordPaymentModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Upload bank support and record a payment for this invoice</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Payment Date</Label>
                <Input type="date" value={paymentForm.payment_date} onChange={(e)=>setPaymentForm({...paymentForm, payment_date: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>Amount</Label>
                <Input type="number" step="0.01" value={paymentForm.payment_amount}
                  onChange={(e)=>setPaymentForm({...paymentForm, payment_amount: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Method</Label>
                <Select value={paymentForm.payment_method} onValueChange={(v)=>setPaymentForm({...paymentForm, payment_method: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank">Bank</SelectItem>
                    <SelectItem value="Wire">Wire</SelectItem>
                    <SelectItem value="ACH">ACH</SelectItem>
                    <SelectItem value="Check">Check</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Reference</Label>
                <Input value={paymentForm.reference_number}
                  onChange={(e)=>setPaymentForm({...paymentForm, reference_number: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={2} value={paymentForm.notes} onChange={(e)=>setPaymentForm({...paymentForm, notes: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Bank Support (required)</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.csv,.txt,.doc,.docx,.xls,.xlsx" onChange={(e)=>setPaymentForm({...paymentForm, file: e.target.files?.[0] || null})} />
              <div className="flex gap-2">
                <Button type="button" variant="outline" disabled={!paymentForm.file || uploading} onClick={handleUploadBankDoc}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Upload'}
                </Button>
                {paymentForm.uploadedDoc && (
                  <Badge variant="secondary">Uploaded: {paymentForm.uploadedDoc.filename}</Badge>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=>setRecordPaymentModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={submitting || !paymentForm.uploadedDoc}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Modal */}
      <Dialog open={editCustomerModalOpen} onOpenChange={setEditCustomerModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>View and update customer information</DialogDescription>
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
                <Label>Tax ID (optional)</Label>
                <Input 
                  placeholder="XX-XXXXXXX"
                  value={customerForm.tax_id}
                  onChange={(e) => setCustomerForm({...customerForm, tax_id: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Tax Exempt</Label>
                <Select
                  value={customerForm.tax_exempt ? 'true' : 'false'}
                  onValueChange={(value) => setCustomerForm({...customerForm, tax_exempt: value === 'true'})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">No</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                  </SelectContent>
                </Select>
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
            <Button variant="outline" onClick={() => setEditCustomerModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCustomer} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
