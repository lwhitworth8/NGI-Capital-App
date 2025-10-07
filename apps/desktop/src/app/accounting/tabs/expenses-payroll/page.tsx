'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Wallet,
  Plus,
  Receipt,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Upload,
  Eye,
  Download,
  Users,
  TrendingUp,
} from 'lucide-react';
import { useEntityContext } from '@/hooks/useEntityContext';

interface ExpenseReport {
  id: string;
  report_number: string;
  employee_name: string;
  submission_date: string;
  total_amount: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed';
  item_count: number;
}

const EXPENSE_CATEGORIES = [
  'Travel - Airfare',
  'Travel - Hotel',
  'Travel - Ground Transport',
  'Meals & Entertainment',
  'Office Supplies',
  'Software & Subscriptions',
  'Client Entertainment',
  'Training & Education',
  'Mileage',
  'Other',
];

export default function ExpensesPayrollTab() {
  const { selectedEntityId } = useEntityContext();
  const [activeTab, setActiveTab] = useState('expenses');
  const [expenseReports, setExpenseReports] = useState<ExpenseReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    if (selectedEntityId) {
      fetchExpenseReports();
    }
  }, [selectedEntityId]);

  const fetchExpenseReports = async () => {
    setLoading(true);
    try {
      // TODO: Connect to actual API
      // const response = await fetch(`/api/expenses/reports?entity_id=${selectedEntityId}`);
      // const data = await response.json();
      // setExpenseReports(data.reports || []);
      setExpenseReports([]);
    } catch (error) {
      console.error('Failed to fetch expense reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: string; icon: React.ReactNode; color: string }> = {
      draft: { variant: 'secondary', icon: <Clock className="h-3 w-3" />, color: 'gray' },
      submitted: { variant: 'default', icon: <AlertCircle className="h-3 w-3" />, color: 'blue' },
      approved: { variant: 'default', icon: <CheckCircle className="h-3 w-3" />, color: 'green' },
      rejected: { variant: 'destructive', icon: <XCircle className="h-3 w-3" />, color: 'red' },
      reimbursed: { variant: 'secondary', icon: <DollarSign className="h-3 w-3" />, color: 'purple' },
    };
    
    const config = variants[status] || variants.draft;
    
    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1 w-fit">
        {config.icon}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  const draftCount = expenseReports.filter(r => r.status === 'draft').length;
  const submittedCount = expenseReports.filter(r => r.status === 'submitted').length;
  const pendingAmount = expenseReports
    .filter(r => r.status === 'submitted' || r.status === 'approved')
    .reduce((sum, r) => sum + r.total_amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Expenses & Payroll</h2>
          <p className="text-muted-foreground">Manage expense reports, approvals, and payroll processing</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expenseReports.length}</div>
            <p className="text-xs text-muted-foreground">All expense reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submittedCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reimbursement</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${pendingAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">To be paid</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Reports</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCount}</div>
            <p className="text-xs text-muted-foreground">Not yet submitted</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="expenses">
            <Receipt className="h-4 w-4 mr-2" />
            Expense Reports
          </TabsTrigger>
          <TabsTrigger value="payroll">
            <DollarSign className="h-4 w-4 mr-2" />
            Payroll
          </TabsTrigger>
          <TabsTrigger value="reports">
            <TrendingUp className="h-4 w-4 mr-2" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* EXPENSE REPORTS TAB */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Submit expenses for reimbursement with receipt upload and OCR
            </p>
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Expense Report
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Expense Report</DialogTitle>
                  <DialogDescription>
                    Submit expenses for reimbursement. Upload receipts for automatic data extraction.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Report Description *</Label>
                      <Input placeholder="Business trip to San Francisco" />
                    </div>
                    <div className="space-y-2">
                      <Label>Report Date *</Label>
                      <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Expense Items</h4>
                    
                    <div className="space-y-3">
                      <div className="border rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Category *</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {EXPENSE_CATEGORIES.map(cat => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Date *</Label>
                            <Input type="date" />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Merchant *</Label>
                            <Input placeholder="Restaurant name, airline, etc." />
                          </div>
                          <div className="space-y-2">
                            <Label>Amount *</Label>
                            <Input type="number" step="0.01" placeholder="0.00" />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Description *</Label>
                          <Input placeholder="Client meeting, conference attendance, etc." />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Receipt Upload</Label>
                          <Input type="file" accept=".pdf,.jpg,.jpeg,.png" />
                          <p className="text-xs text-muted-foreground">
                            Upload receipt for automatic OCR data extraction
                          </p>
                        </div>
                      </div>
                      
                      <Button variant="outline" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Another Expense
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 p-4">
                    <p className="text-sm font-medium mb-2">Expense Policy Reminders:</p>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Receipts required for expenses over $25</li>
                      <li>• Submit within 30 days of expense date</li>
                      <li>• Meals limited to $50/day unless with clients</li>
                      <li>• Mileage reimbursed at IRS standard rate</li>
                    </ul>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                    Save as Draft
                  </Button>
                  <Button onClick={() => setCreateModalOpen(false)}>
                    Submit for Approval
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Expense Reports</CardTitle>
              <CardDescription>
                Track expense submissions, approvals, and reimbursements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : expenseReports.length === 0 ? (
                <div className="text-center p-12">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Expense Reports Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first expense report to get started
                  </p>
                  <Button onClick={() => setCreateModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Report
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report #</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Submission Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseReports.map((report, index) => (
                      <motion.tr
                        key={report.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-muted/50"
                      >
                        <TableCell className="font-mono text-sm">{report.report_number}</TableCell>
                        <TableCell className="font-medium">{report.employee_name}</TableCell>
                        <TableCell>{new Date(report.submission_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-semibold">
                          ${report.total_amount.toLocaleString()}
                        </TableCell>
                        <TableCell>{report.item_count} items</TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {report.status === 'submitted' && (
                              <>
                                <Button variant="ghost" size="sm">
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
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

          {/* Features Info */}
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
            <CardHeader>
              <CardTitle className="text-blue-900 dark:text-blue-100">
                Modern Expense Management Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-2">Employee Features</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Mobile receipt capture with OCR</li>
                    <li>• Auto-extract: vendor, amount, date, tax</li>
                    <li>• Multi-receipt support per report</li>
                    <li>• Policy compliance checking</li>
                    <li>• Real-time status updates</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Manager & Finance</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Multi-level approval workflow</li>
                    <li>• Bulk approval actions</li>
                    <li>• Auto JE creation on reimbursement</li>
                    <li>• Duplicate detection</li>
                    <li>• Spending analytics by category</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAYROLL TAB */}
        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Processing</CardTitle>
              <CardDescription>
                Process payroll with automatic timesheet integration and JE creation
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
              <DollarSign className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium mb-2">Payroll System</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                Custom payroll processing with timesheet integration, tax calculations, 
                direct deposit, and automatic journal entry creation.
              </p>
              <div className="max-w-md mx-auto text-left space-y-2 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Features:</p>
                <ul className="space-y-1">
                  <li>• Timesheet approval integration</li>
                  <li>• Gross/net pay calculation</li>
                  <li>• Federal/State/FICA tax withholding</li>
                  <li>• Auto JE: Dr: Payroll Expense, Cr: Cash/Liabilities</li>
                  <li>• Pay stub generation (PDF)</li>
                  <li>• W-2 and Form 941 reporting</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REPORTS TAB */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Expense by Category</CardTitle>
                <CardDescription>Spending breakdown by expense type</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense by Employee</CardTitle>
                <CardDescription>Individual spending patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reimbursement Status</CardTitle>
                <CardDescription>Pending and paid reimbursements</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tax Deductible Summary</CardTitle>
                <CardDescription>Deductible vs non-deductible expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}