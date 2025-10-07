'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  TrendingDown,
  Plus,
  Search,
  DollarSign,
  Users,
  FileText,
  CreditCard,
  Download,
  AlertTriangle,
  CheckCircle
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
  id: string;
  vendor_number: string;
  vendor_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  payment_terms: string;
  is_1099_vendor: boolean;
  status: string;
}

interface Bill {
  id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  amount_total: number;
  amount_paid: number;
  status: string;
  match_status: string;
  vendor_name: string;
}

export default function AccountsPayableTab() {
  const { selectedEntityId } = useEntityContext();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('vendors');
  
  // Modals
  const [isCreateVendorModalOpen, setIsCreateVendorModalOpen] = useState(false);
  const [isCreateBillModalOpen, setIsCreateBillModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  // Form states
  const [newVendor, setNewVendor] = useState({
    vendor_name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    payment_terms: 'net_30',
    is_1099_vendor: false
  });

  const [newBill, setNewBill] = useState({
    vendor_id: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount_total: '',
    invoice_number: '',
    description: ''
  });

  const [selectedBillsForPayment, setSelectedBillsForPayment] = useState<string[]>([]);

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
      const response = await fetch(`/api/accounts-payable/vendors?entity_id=${selectedEntityId}`);
      const data = await response.json();
      setVendors(data.vendors || []);
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
      const response = await fetch(`/api/accounts-payable/bills?entity_id=${selectedEntityId}&status=open`);
      const data = await response.json();
      setBills(data.bills || []);
    } catch (error) {
      console.error('Failed to fetch bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/accounts-payable/vendors', {
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
        setNewVendor({
          vendor_name: '',
          contact_name: '',
          email: '',
          phone: '',
          address: '',
          payment_terms: 'net_30',
          is_1099_vendor: false
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

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/accounts-payable/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: selectedEntityId,
          vendor_id: newBill.vendor_id,
          bill_date: newBill.bill_date,
          due_date: newBill.due_date,
          amount_total: parseFloat(newBill.amount_total),
          invoice_number: newBill.invoice_number,
          description: newBill.description
        })
      });

      if (response.ok) {
        setIsCreateBillModalOpen(false);
        fetchBills();
        setNewBill({
          vendor_id: '',
          bill_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          amount_total: '',
          invoice_number: '',
          description: ''
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

  const handlePayBills = async () => {
    if (selectedBillsForPayment.length === 0) {
      alert('Please select at least one bill to pay');
      return;
    }

    try {
      const billsToPay = bills
        .filter(b => selectedBillsForPayment.includes(b.id))
        .map(b => ({
          bill_id: b.id,
          payment_amount: b.amount_total - b.amount_paid
        }));

      const response = await fetch('/api/accounts-payable/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: selectedEntityId,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'check',
          bills: billsToPay
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Payment processed successfully! ${data.bills_paid} bills paid.`);
        setIsPaymentModalOpen(false);
        setSelectedBillsForPayment([]);
        fetchBills();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Failed to process payment:', error);
      alert('Failed to process payment. Please try again.');
    }
  };

  const openBillsCount = bills.filter(b => b.status === 'open').length;
  const totalOutstanding = bills.reduce((sum, b) => sum + (b.amount_total - b.amount_paid), 0);
  const overdueCount = bills.filter(b => {
    const dueDate = new Date(b.due_date);
    return b.status === 'open' && dueDate < new Date();
  }).length;

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
          <p className="text-muted-foreground">Manage vendors, bills, and payments</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <CreditCard className="h-4 w-4 mr-2" />
                Pay Bills
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Pay Bills</DialogTitle>
                <DialogDescription>Select bills to pay in batch</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {bills.filter(b => b.status === 'open').map(bill => (
                  <div key={bill.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedBillsForPayment.includes(bill.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedBillsForPayment([...selectedBillsForPayment, bill.id]);
                          } else {
                            setSelectedBillsForPayment(selectedBillsForPayment.filter(id => id !== bill.id));
                          }
                        }}
                      />
                      <div>
                        <p className="font-medium">{bill.vendor_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {bill.bill_number} â€¢ Due: {new Date(bill.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${(bill.amount_total - bill.amount_paid).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Outstanding</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {selectedBillsForPayment.length} bills selected
                </p>
                <p className="text-lg font-bold">
                  Total: ${bills
                    .filter(b => selectedBillsForPayment.includes(b.id))
                    .reduce((sum, b) => sum + (b.amount_total - b.amount_paid), 0)
                    .toLocaleString()}
                </p>
              </div>
              <Button onClick={handlePayBills} className="w-full" disabled={selectedBillsForPayment.length === 0}>
                Process Payment
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Bills</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openBillsCount}</div>
            <p className="text-xs text-muted-foreground">
              {overdueCount} overdue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalOutstanding.toLocaleString()}</div>
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
            <div className="text-2xl font-bold">{vendors.length}</div>
            <p className="text-xs text-muted-foreground">
              Vendor relationships
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="vendors" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search vendors..." className="pl-10" />
            </div>
            <Dialog open={isCreateVendorModalOpen} onOpenChange={setIsCreateVendorModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Vendor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
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
                      <Label>Contact Name</Label>
                      <Input
                        value={newVendor.contact_name}
                        onChange={(e) => setNewVendor({ ...newVendor, contact_name: e.target.value })}
                        placeholder="John Doe"
                      />
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
                    <Label>Address</Label>
                    <Input
                      value={newVendor.address}
                      onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                      placeholder="123 Main St, City, State ZIP"
                    />
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
                          <SelectItem value="net_15">Net 15</SelectItem>
                          <SelectItem value="net_30">Net 30</SelectItem>
                          <SelectItem value="net_45">Net 45</SelectItem>
                          <SelectItem value="net_60">Net 60</SelectItem>
                          <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 flex items-end">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={newVendor.is_1099_vendor}
                          onCheckedChange={(checked) => setNewVendor({ ...newVendor, is_1099_vendor: !!checked })}
                        />
                        <Label>1099 Vendor</Label>
                      </div>
                    </div>
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
              ) : vendors.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No vendors found</p>
                  <p className="text-sm">Create your first vendor to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor #</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Terms</TableHead>
                      <TableHead>1099</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.map((vendor, index) => (
                      <motion.tr
                        key={vendor.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell className="font-mono text-sm">{vendor.vendor_number}</TableCell>
                        <TableCell className="font-medium">{vendor.vendor_name}</TableCell>
                        <TableCell>{vendor.contact_name}</TableCell>
                        <TableCell>{vendor.email}</TableCell>
                        <TableCell>{vendor.phone}</TableCell>
                        <TableCell>{vendor.payment_terms}</TableCell>
                        <TableCell>
                          {vendor.is_1099_vendor && (
                            <Badge variant="secondary">1099</Badge>
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

        <TabsContent value="bills" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search bills..." className="pl-10" />
            </div>
            <Dialog open={isCreateBillModalOpen} onOpenChange={setIsCreateBillModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Enter Bill
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Enter Bill</DialogTitle>
                  <DialogDescription>Record a vendor invoice</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateBill} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Vendor *</Label>
                    <Select
                      value={newBill.vendor_id}
                      onValueChange={(value) => setNewBill({ ...newBill, vendor_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.vendor_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Invoice Number</Label>
                      <Input
                        value={newBill.invoice_number}
                        onChange={(e) => setNewBill({ ...newBill, invoice_number: e.target.value })}
                        placeholder="INV-12345"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        required
                        value={newBill.amount_total}
                        onChange={(e) => setNewBill({ ...newBill, amount_total: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={newBill.description}
                      onChange={(e) => setNewBill({ ...newBill, description: e.target.value })}
                      placeholder="Service description"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsCreateBillModalOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1">
                      Enter Bill
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
              ) : bills.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No bills found</p>
                  <p className="text-sm">Enter your first bill to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill #</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Match</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.map((bill, index) => {
                      const isOverdue = new Date(bill.due_date) < new Date() && bill.status === 'open';
                      const outstanding = bill.amount_total - bill.amount_paid;
                      
                      return (
                        <motion.tr
                          key={bill.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="cursor-pointer hover:bg-muted/50"
                        >
                          <TableCell className="font-mono text-sm">{bill.bill_number}</TableCell>
                          <TableCell className="font-medium">{bill.vendor_name}</TableCell>
                          <TableCell>{new Date(bill.bill_date).toLocaleDateString()}</TableCell>
                          <TableCell className={isOverdue ? 'text-red-600 font-medium' : ''}>
                            {new Date(bill.due_date).toLocaleDateString()}
                            {isOverdue && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                          </TableCell>
                          <TableCell className="text-right">${bill.amount_total.toLocaleString()}</TableCell>
                          <TableCell className="text-right">${bill.amount_paid.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-semibold">
                            ${outstanding.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={bill.status === 'open' ? 'destructive' : 'default'}>
                              {bill.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {bill.match_status === 'matched' && (
                              <Badge variant="secondary">
                                <CheckCircle className="h-3 w-3 mr-1" /> Matched
                              </Badge>
                            )}
                            {bill.match_status === 'variance' && (
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" /> Variance
                              </Badge>
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

        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>AP Aging Report</CardTitle>
                <CardDescription>Bills by aging buckets (Current, 1-30, 31-60, 61-90, 90+)</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download AP Aging
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>1099 Summary</CardTitle>
                <CardDescription>Year-end 1099 vendor reporting</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Generate 1099 Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vendor Payment History</CardTitle>
                <CardDescription>Payment history by vendor</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download History
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cash Requirements</CardTitle>
                <CardDescription>Forecast upcoming payment obligations</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline" disabled>
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}