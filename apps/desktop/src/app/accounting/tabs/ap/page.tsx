'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Search,
  DollarSign,
  Users,
  FileText,
  Upload,
  X,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { useEntityContext } from '@/hooks/useEntityContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

interface Vendor {
  id: number;
  vendor_number: string;
  vendor_name: string;
  vendor_type?: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  payment_terms: string;
  autopay_enabled: boolean;
  is_1099_vendor: boolean;
  is_active: boolean;
}

interface BillLine {
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  expense_account_id?: number;
}

interface Bill {
  id: number;
  internal_bill_number: string;
  bill_number: string;
  vendor_id: number;
  vendor_name?: string;
  bill_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  status: string;
  payment_terms: string;
  memo?: string;
  lines?: BillLine[];
  journal_entry_id?: number;
}

export default function AccountsPayableTab() {
  const { selectedEntityId } = useEntityContext();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('vendors');
  const [searchVendor, setSearchVendor] = useState('');
  const [searchBill, setSearchBill] = useState('');
  
  // Modals
  const [isCreateVendorModalOpen, setIsCreateVendorModalOpen] = useState(false);
  const [isCreateBillModalOpen, setIsCreateBillModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isBillDetailModalOpen, setIsBillDetailModalOpen] = useState(false);
  
  // Form states
  const [newVendor, setNewVendor] = useState({
    vendor_name: '',
    vendor_type: 'Service Provider',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: 'CA',
    zip_code: '',
    payment_terms: 'Net 30',
    autopay_enabled: true,
    is_1099_vendor: false,
    tax_id: '',
    notes: ''
  });

  const [newBill, setNewBill] = useState({
    vendor_id: '',
    bill_number: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: '',
    payment_terms: 'Net 30',
    memo: '',
    lines: [
      { description: '', quantity: 1, unit_price: 0, expense_account_id: null }
    ]
  });

  useEffect(() => {
    if (selectedEntityId) {
      fetchVendors();
      fetchBills();
    }
  }, [selectedEntityId]);

  const fetchVendors = async () => {
    if (!selectedEntityId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/accounting/ap/vendors?entity_id=${selectedEntityId}`);
      if (response.ok) {
      const data = await response.json();
      setVendors(data.vendors || []);
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBills = async () => {
    if (!selectedEntityId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/accounting/ap/bills?entity_id=${selectedEntityId}`);
      if (response.ok) {
      const data = await response.json();
      setBills(data.bills || []);
      }
    } catch (error) {
      console.error('Failed to fetch bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/accounting/ap/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: selectedEntityId,
          ...newVendor
        })
      });

      if (response.ok) {
        setIsCreateVendorModalOpen(false);
        fetchVendors();
        // Reset form
        setNewVendor({
          vendor_name: '',
          vendor_type: 'Service Provider',
          email: '',
          phone: '',
          address_line1: '',
          address_line2: '',
          city: '',
          state: 'CA',
          zip_code: '',
          payment_terms: 'Net 30',
          autopay_enabled: true,
          is_1099_vendor: false,
          tax_id: '',
          notes: ''
        });
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Failed to create vendor:', error);
      alert('Failed to create vendor. Please try again.');
    }
  };

  const calculateBillTotals = (lines: any[]) => {
    const subtotal = lines.reduce((sum, line) => {
      const lineTotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0);
      return sum + lineTotal;
    }, 0);
    return {
      subtotal,
      tax_amount: 0, // Can add tax calculation here
      total_amount: subtotal
    };
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate lines
    const validLines = newBill.lines.filter(line => 
      line.description && line.quantity > 0 && line.unit_price > 0
    );
    
    if (validLines.length === 0) {
      alert('Please add at least one line item');
      return;
    }

    const totals = calculateBillTotals(validLines);
    
    try {
      const response = await fetch('/api/accounting/ap/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: selectedEntityId,
          vendor_id: parseInt(newBill.vendor_id),
          bill_number: newBill.bill_number,
          bill_date: newBill.bill_date,
          due_date: newBill.due_date,
          payment_terms: newBill.payment_terms,
          memo: newBill.memo,
          subtotal: totals.subtotal,
          tax_amount: totals.tax_amount,
          total_amount: totals.total_amount,
          lines: validLines.map((line, idx) => ({
            line_number: idx + 1,
            description: line.description,
            quantity: parseFloat(line.quantity),
            unit_price: parseFloat(line.unit_price),
            total_amount: parseFloat(line.quantity) * parseFloat(line.unit_price),
            expense_account_id: line.expense_account_id
          }))
        })
      });

      if (response.ok) {
        setIsCreateBillModalOpen(false);
        fetchBills();
        // Reset form
        setNewBill({
          vendor_id: '',
          bill_number: '',
          bill_date: new Date().toISOString().split('T')[0],
          due_date: '',
          payment_terms: 'Net 30',
          memo: '',
          lines: [
            { description: '', quantity: 1, unit_price: 0, expense_account_id: null }
          ]
        });
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Failed to create bill:', error);
      alert('Failed to create bill. Please try again.');
    }
  };

  const addBillLine = () => {
    setNewBill({
      ...newBill,
      lines: [
        ...newBill.lines,
        { description: '', quantity: 1, unit_price: 0, expense_account_id: null }
      ]
    });
  };

  const removeBillLine = (index: number) => {
    const lines = [...newBill.lines];
    lines.splice(index, 1);
    setNewBill({ ...newBill, lines });
  };

  const updateBillLine = (index: number, field: string, value: any) => {
    const lines = [...newBill.lines];
    lines[index] = { ...lines[index], [field]: value };
    setNewBill({ ...newBill, lines });
  };

  const handleVendorSelect = (vendorId: string) => {
    const vendor = vendors.find(v => v.id === parseInt(vendorId));
    if (vendor) {
      // Auto-calculate due date based on payment terms
      const billDate = new Date(newBill.bill_date);
      let daysToAdd = 30;
      
      if (vendor.payment_terms.includes('15')) daysToAdd = 15;
      else if (vendor.payment_terms.includes('45')) daysToAdd = 45;
      else if (vendor.payment_terms.includes('60')) daysToAdd = 60;
      else if (vendor.payment_terms.toLowerCase().includes('receipt')) daysToAdd = 0;
      
      const dueDate = new Date(billDate);
      dueDate.setDate(dueDate.getDate() + daysToAdd);
      
      setNewBill({
        ...newBill,
        vendor_id: vendorId,
        payment_terms: vendor.payment_terms,
        due_date: dueDate.toISOString().split('T')[0]
      });
    }
  };

  const viewBillDetails = async (bill: Bill) => {
    // Fetch full bill details including lines
    try {
      const response = await fetch(`/api/accounting/ap/bills/${bill.id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedBill(data);
        setIsBillDetailModalOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch bill details:', error);
    }
  };

  // Filter functions
  const filteredVendors = vendors.filter(vendor =>
    vendor.vendor_name.toLowerCase().includes(searchVendor.toLowerCase()) ||
    vendor.vendor_number.toLowerCase().includes(searchVendor.toLowerCase())
  );

  const filteredBills = bills.filter(bill =>
    bill.internal_bill_number.toLowerCase().includes(searchBill.toLowerCase()) ||
    bill.bill_number.toLowerCase().includes(searchBill.toLowerCase()) ||
    (bill.vendor_name && bill.vendor_name.toLowerCase().includes(searchBill.toLowerCase()))
  );

  // Summary calculations
  const openBillsCount = bills.filter(b => b.status === 'draft' || b.status === 'approved').length;
  const totalOutstanding = bills.reduce((sum, b) => sum + (b.amount_due || 0), 0);
  const overdueCount = bills.filter(b => {
    const dueDate = new Date(b.due_date);
    return (b.status === 'draft' || b.status === 'approved') && dueDate < new Date();
  }).length;
  const activeVendorsCount = vendors.filter(v => v.is_active).length;

  const billTotals = calculateBillTotals(newBill.lines);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Accounts Payable</h2>
          <p className="text-muted-foreground">Manage vendors and bills with intelligent automation</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Bills</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openBillsCount}</div>
            <p className="text-xs text-muted-foreground">
              {overdueCount > 0 && (
                <span className="text-red-600 font-medium">
                  <AlertTriangle className="inline h-3 w-3 mr-1" />
              {overdueCount} overdue
                </span>
              )}
              {overdueCount === 0 && 'All current'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Amount payable
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeVendorsCount}</div>
            <p className="text-xs text-muted-foreground">
              {vendors.filter(v => v.autopay_enabled).length} with autopay
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">1099 Vendors</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendors.filter(v => v.is_1099_vendor).length}</div>
            <p className="text-xs text-muted-foreground">
              Tax reporting required
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="bills">Bills</TabsTrigger>
        </TabsList>

        {/* VENDORS TAB */}
        <TabsContent value="vendors" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search vendors..." 
                className="pl-10" 
                value={searchVendor}
                onChange={(e) => setSearchVendor(e.target.value)}
              />
            </div>
            <Dialog open={isCreateVendorModalOpen} onOpenChange={setIsCreateVendorModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Vendor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Vendor</DialogTitle>
                  <DialogDescription>Add a new vendor to your vendor master</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateVendor} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Vendor Name *</Label>
                      <Input
                        required
                        value={newVendor.vendor_name}
                        onChange={(e) => setNewVendor({ ...newVendor, vendor_name: e.target.value })}
                        placeholder="ABC Supplies Inc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Vendor Type</Label>
                      <Select
                        value={newVendor.vendor_type}
                        onValueChange={(value) => setNewVendor({ ...newVendor, vendor_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Service Provider">Service Provider</SelectItem>
                          <SelectItem value="Supplier">Supplier</SelectItem>
                          <SelectItem value="Contractor">Contractor</SelectItem>
                          <SelectItem value="Consultant">Consultant</SelectItem>
                          <SelectItem value="Software/SaaS">Software/SaaS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={newVendor.email}
                        onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                        placeholder="vendor@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={newVendor.phone}
                        onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Address Line 1</Label>
                    <Input
                      value={newVendor.address_line1}
                      onChange={(e) => setNewVendor({ ...newVendor, address_line1: e.target.value })}
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Address Line 2</Label>
                    <Input
                      value={newVendor.address_line2}
                      onChange={(e) => setNewVendor({ ...newVendor, address_line2: e.target.value })}
                      placeholder="Suite 200"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        value={newVendor.city}
                        onChange={(e) => setNewVendor({ ...newVendor, city: e.target.value })}
                        placeholder="San Francisco"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input
                        value={newVendor.state}
                        onChange={(e) => setNewVendor({ ...newVendor, state: e.target.value })}
                        placeholder="CA"
                        maxLength={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ZIP Code</Label>
                      <Input
                        value={newVendor.zip_code}
                        onChange={(e) => setNewVendor({ ...newVendor, zip_code: e.target.value })}
                        placeholder="94102"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Payment Terms</Label>
                      <Select
                        value={newVendor.payment_terms}
                        onValueChange={(value) => setNewVendor({ ...newVendor, payment_terms: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Net 15">Net 15</SelectItem>
                          <SelectItem value="Net 30">Net 30</SelectItem>
                          <SelectItem value="Net 45">Net 45</SelectItem>
                          <SelectItem value="Net 60">Net 60</SelectItem>
                          <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tax ID (Optional)</Label>
                      <Input
                        value={newVendor.tax_id}
                        onChange={(e) => setNewVendor({ ...newVendor, tax_id: e.target.value })}
                        placeholder="XX-XXXXXXX"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={newVendor.autopay_enabled}
                        onCheckedChange={(checked) => setNewVendor({ ...newVendor, autopay_enabled: !!checked })}
                      />
                      <Label>Autopay Enabled</Label>
                    </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={newVendor.is_1099_vendor}
                          onCheckedChange={(checked) => setNewVendor({ ...newVendor, is_1099_vendor: !!checked })}
                        />
                        <Label>1099 Vendor</Label>
                      </div>
                    </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={newVendor.notes}
                      onChange={(e) => setNewVendor({ ...newVendor, notes: e.target.value })}
                      placeholder="Additional vendor information..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsCreateVendorModalOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1">
                      Create Vendor
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : filteredVendors.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No vendors found</p>
                  <p className="text-sm">Create your first vendor to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor #</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Terms</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVendors.map((vendor, index) => (
                      <motion.tr
                        key={vendor.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell className="font-mono text-sm">{vendor.vendor_number}</TableCell>
                        <TableCell className="font-medium">{vendor.vendor_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{vendor.vendor_type}</TableCell>
                        <TableCell className="text-sm">{vendor.email}</TableCell>
                        <TableCell className="text-sm">{vendor.phone}</TableCell>
                        <TableCell className="text-sm">{vendor.payment_terms}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {vendor.autopay_enabled && (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Autopay
                              </Badge>
                            )}
                          {vendor.is_1099_vendor && (
                              <Badge variant="outline" className="text-xs">1099</Badge>
                          )}
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BILLS TAB */}
        <TabsContent value="bills" className="space-y-4">
          <div className="flex justify-between items-center gap-4">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search bills..." 
                className="pl-10" 
                value={searchBill}
                onChange={(e) => setSearchBill(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload Bill
              </Button>
            <Dialog open={isCreateBillModalOpen} onOpenChange={setIsCreateBillModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Enter Bill
                </Button>
              </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Enter Bill</DialogTitle>
                    <DialogDescription>Record a vendor invoice with line items</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateBill} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vendor *</Label>
                    <Select
                      value={newBill.vendor_id}
                          onValueChange={handleVendorSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map(v => (
                              <SelectItem key={v.id} value={v.id.toString()}>
                                {v.vendor_name}
                              </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Vendor Invoice # *</Label>
                        <Input
                          required
                          value={newBill.bill_number}
                          onChange={(e) => setNewBill({ ...newBill, bill_number: e.target.value })}
                          placeholder="INV-12345"
                        />
                      </div>
                  </div>

                    <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Bill Date *</Label>
                      <Input
                        type="date"
                        required
                        value={newBill.bill_date}
                        onChange={(e) => setNewBill({ ...newBill, bill_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date *</Label>
                      <Input
                        type="date"
                        required
                        value={newBill.due_date}
                        onChange={(e) => setNewBill({ ...newBill, due_date: e.target.value })}
                      />
                    </div>
                      <div className="space-y-2">
                        <Label>Payment Terms</Label>
                        <Select
                          value={newBill.payment_terms}
                          onValueChange={(value) => setNewBill({ ...newBill, payment_terms: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Net 15">Net 15</SelectItem>
                            <SelectItem value="Net 30">Net 30</SelectItem>
                            <SelectItem value="Net 45">Net 45</SelectItem>
                            <SelectItem value="Net 60">Net 60</SelectItem>
                            <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                  </div>

                    <div className="space-y-2">
                      <Label>Memo</Label>
                      <Textarea
                        value={newBill.memo}
                        onChange={(e) => setNewBill({ ...newBill, memo: e.target.value })}
                        placeholder="Internal notes about this bill..."
                        rows={2}
                      />
                    </div>

                    {/* Line Items */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Line Items *</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addBillLine}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add Line
                        </Button>
                      </div>
                      <div className="border rounded-lg p-4 space-y-3">
                        <AnimatePresence>
                          {newBill.lines.map((line, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="grid grid-cols-12 gap-2 items-end"
                            >
                              <div className="col-span-5 space-y-1">
                                <Label className="text-xs">Description</Label>
                                <Input
                                  value={line.description}
                                  onChange={(e) => updateBillLine(index, 'description', e.target.value)}
                                  placeholder="Service or product description"
                                />
                              </div>
                              <div className="col-span-2 space-y-1">
                                <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        step="0.01"
                                  min="0"
                                  value={line.quantity}
                                  onChange={(e) => updateBillLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                              <div className="col-span-2 space-y-1">
                                <Label className="text-xs">Unit Price</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={line.unit_price}
                                  onChange={(e) => updateBillLine(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                />
                  </div>
                              <div className="col-span-2 space-y-1">
                                <Label className="text-xs">Total</Label>
                    <Input
                                  value={`$${(line.quantity * line.unit_price).toFixed(2)}`}
                                  disabled
                                  className="bg-muted"
                                />
                              </div>
                              <div className="col-span-1">
                                {newBill.lines.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeBillLine(index)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-medium">${billTotals.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax:</span>
                        <span className="font-medium">${billTotals.tax_amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>${billTotals.total_amount.toFixed(2)}</span>
                      </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsCreateBillModalOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1">
                        Create Bill & Generate JE
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : filteredBills.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No bills found</p>
                  <p className="text-sm">Enter your first bill or upload a vendor invoice</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill #</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>JE</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBills.map((bill, index) => {
                      const isOverdue = new Date(bill.due_date) < new Date() && bill.status !== 'paid';
                      
                      return (
                        <motion.tr
                          key={bill.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => viewBillDetails(bill)}
                        >
                          <TableCell className="font-mono text-sm">{bill.internal_bill_number}</TableCell>
                          <TableCell className="font-medium">{bill.vendor_name}</TableCell>
                          <TableCell className="text-sm">{new Date(bill.bill_date).toLocaleDateString('en-US')}</TableCell>
                          <TableCell className={isOverdue ? 'text-red-600 font-medium text-sm' : 'text-sm'}>
                            {new Date(bill.due_date).toLocaleDateString('en-US')}
                            {isOverdue && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                          </TableCell>
                          <TableCell className="text-right">${bill.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right">${bill.amount_paid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right font-semibold">
                            ${bill.amount_due.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              bill.status === 'draft' ? 'secondary' :
                              bill.status === 'approved' ? 'default' :
                              bill.status === 'paid' ? 'outline' : 'secondary'
                            }>
                              {bill.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {bill.journal_entry_id && (
                              <Button variant="ghost" size="sm" className="h-7 px-2">
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bill Detail Modal */}
      <Dialog open={isBillDetailModalOpen} onOpenChange={setIsBillDetailModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bill Details</DialogTitle>
            <DialogDescription>
              {selectedBill?.internal_bill_number} - {selectedBill?.vendor_name}
            </DialogDescription>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Vendor Invoice #:</p>
                  <p className="font-medium">{selectedBill.bill_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Bill Date:</p>
                  <p className="font-medium">{new Date(selectedBill.bill_date).toLocaleDateString('en-US')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Due Date:</p>
                  <p className="font-medium">{new Date(selectedBill.due_date).toLocaleDateString('en-US')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Terms:</p>
                  <p className="font-medium">{selectedBill.payment_terms}</p>
                </div>
              </div>

              {selectedBill.memo && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Memo:</p>
                  <p className="text-sm">{selectedBill.memo}</p>
                </div>
              )}

              {selectedBill.lines && selectedBill.lines.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Line Items:</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBill.lines.map((line, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{line.description}</TableCell>
                          <TableCell className="text-right">{line.quantity}</TableCell>
                          <TableCell className="text-right">${line.unit_price.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">${line.total_amount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">${selectedBill.subtotal.toFixed(2)}</span>
                </div>
                {selectedBill.tax_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax:</span>
                    <span className="font-medium">${selectedBill.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>${selectedBill.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid:</span>
                  <span className="font-medium">${selectedBill.amount_paid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-red-600">
                  <span>Amount Due:</span>
                  <span>${selectedBill.amount_due.toFixed(2)}</span>
                </div>
              </div>

              {selectedBill.journal_entry_id && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Journal Entry Created</span>
                  </div>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View JE
                </Button>
          </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
