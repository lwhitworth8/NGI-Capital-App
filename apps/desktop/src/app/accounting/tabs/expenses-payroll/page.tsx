"use client"

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Receipt,
  Clock,
  DollarSign,
  Plus,
  Search,
  FileText,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  Trash2,
  Download,
  User,
  TrendingUp
} from 'lucide-react';
import { useEntityContext } from '@/hooks/useEntityContext';
import { toast } from 'sonner';

export default function ExpensesPayrollPage() {
  const { selectedEntityId } = useEntityContext();
  const [activeTab, setActiveTab] = useState('expense-reports');
  
  // Expense Reports State
  const [expenseReports, setExpenseReports] = useState([]);
  const [createExpenseModalOpen, setCreateExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    period_start: '',
    period_end: '',
    memo: '',
    lines: [{ expense_date: '', merchant: '', category: 'Meals', description: '', amount: 0, tax_amount: 0 }]
  });
  
  // Timesheets State
  const [timesheets, setTimesheets] = useState([]);
  const [createTimesheetModalOpen, setCreateTimesheetModalOpen] = useState(false);
  const [timesheetForm, setTimesheetForm] = useState({
    week_start_date: '',
    week_end_date: '',
    entries: [
      { work_date: '', hours: 0, project_name: '', task_description: '', pay_type: 'Regular' }
    ]
  });
  
  // Payroll State
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [calculatePayrollModalOpen, setCalculatePayrollModalOpen] = useState(false);
  const [payrollForm, setPayrollForm] = useState({
    pay_period_start: '',
    pay_period_end: '',
    pay_date: '',
    timesheet_ids: []
  });
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Current user email (would come from Clerk in production)
  const currentUserEmail = 'lwhitworth@ngicapitaladvisory.com';
  const currentUserName = 'Landon Whitworth';

  useEffect(() => {
    if (selectedEntityId) {
      if (activeTab === 'expense-reports') {
        fetchExpenseReports();
      } else if (activeTab === 'timesheets') {
        fetchTimesheets();
      } else if (activeTab === 'payroll') {
        fetchPayrollRuns();
      }
    }
  }, [selectedEntityId, activeTab]);

  // ============================================================================
  // EXPENSE REPORTS
  // ============================================================================

  const fetchExpenseReports = async () => {
    if (!selectedEntityId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/expenses-payroll/expense-reports?entity_id=${selectedEntityId}`
      );
      const data = await response.json();
      if (data.success) {
        setExpenseReports(data.reports || []);
      } else {
        toast.error('Failed to fetch expense reports');
      }
    } catch (error) {
      console.error('Failed to fetch expense reports:', error);
      toast.error('Failed to fetch expense reports');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpenseReport = async () => {
    if (!selectedEntityId || expenseForm.lines.length === 0) {
      toast.error('At least one expense line is required');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/accounting/expenses-payroll/expense-reports?entity_id=${selectedEntityId}&employee_email=${currentUserEmail}&employee_name=${encodeURIComponent(currentUserName)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expenseForm),
        }
      );
      const data = await response.json();

      if (data.success) {
        toast.success('Expense report created successfully');
        setCreateExpenseModalOpen(false);
        fetchExpenseReports();
        // Reset form
        setExpenseForm({
          period_start: '',
          period_end: '',
          memo: '',
          lines: [{ expense_date: '', merchant: '', category: 'Meals', description: '', amount: 0, tax_amount: 0 }]
        });
      } else {
        toast.error(data.detail || 'Failed to create expense report');
      }
    } catch (error) {
      console.error('Failed to create expense report:', error);
      toast.error('Failed to create expense report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitExpenseReport = async (reportId: number) => {
    try {
      const response = await fetch(
        `/api/accounting/expenses-payroll/expense-reports/${reportId}/submit?submitted_by_email=${currentUserEmail}`,
        { method: 'POST' }
      );
      const data = await response.json();

      if (data.success) {
        toast.success('Expense report submitted for approval');
        fetchExpenseReports();
      } else {
        toast.error(data.message || 'Failed to submit expense report');
      }
    } catch (error) {
      console.error('Failed to submit expense report:', error);
      toast.error('Failed to submit expense report');
    }
  };

  const handleApproveExpenseReport = async (reportId: number) => {
    try {
      const response = await fetch(
        `/api/accounting/expenses-payroll/expense-reports/${reportId}/approve?approved_by_email=${currentUserEmail}`,
        { method: 'POST' }
      );
      const data = await response.json();

      if (data.success) {
        toast.success('Expense report approved and JE created');
        fetchExpenseReports();
      } else {
        toast.error(data.message || 'Failed to approve expense report');
      }
    } catch (error) {
      console.error('Failed to approve expense report:', error);
      toast.error('Failed to approve expense report');
    }
  };

  const addExpenseLine = () => {
    setExpenseForm(prev => ({
      ...prev,
      lines: [...prev.lines, { expense_date: '', merchant: '', category: 'Meals', description: '', amount: 0, tax_amount: 0 }]
    }));
  };

  const removeExpenseLine = (index: number) => {
    setExpenseForm(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }));
  };

  const getExpenseStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: 'secondary' as const, label: 'Draft' },
      pending_approval: { variant: 'default' as const, label: 'Pending Approval' },
      approved: { variant: 'default' as const, label: 'Approved' },
      reimbursed: { variant: 'default' as const, label: 'Reimbursed' },
      rejected: { variant: 'destructive' as const, label: 'Rejected' }
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // ============================================================================
  // TIMESHEETS
  // ============================================================================

  const fetchTimesheets = async () => {
    if (!selectedEntityId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/expenses-payroll/timesheets?entity_id=${selectedEntityId}`
      );
      const data = await response.json();
      if (data.success) {
        setTimesheets(data.timesheets || []);
      } else {
        toast.error('Failed to fetch timesheets');
      }
    } catch (error) {
      console.error('Failed to fetch timesheets:', error);
      toast.error('Failed to fetch timesheets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTimesheet = async () => {
    if (!selectedEntityId || timesheetForm.entries.length === 0) {
      toast.error('At least one timesheet entry is required');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/accounting/expenses-payroll/timesheets?entity_id=${selectedEntityId}&employee_email=${currentUserEmail}&employee_name=${encodeURIComponent(currentUserName)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(timesheetForm),
        }
      );
      const data = await response.json();

      if (data.success) {
        toast.success('Timesheet created successfully');
        setCreateTimesheetModalOpen(false);
        fetchTimesheets();
        // Reset form
        setTimesheetForm({
          week_start_date: '',
          week_end_date: '',
          entries: [{ work_date: '', hours: 0, project_name: '', task_description: '', pay_type: 'Regular' }]
        });
      } else {
        toast.error(data.detail || 'Failed to create timesheet');
      }
    } catch (error) {
      console.error('Failed to create timesheet:', error);
      toast.error('Failed to create timesheet');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitTimesheet = async (timesheetId: number) => {
    try {
      const response = await fetch(
        `/api/accounting/expenses-payroll/timesheets/${timesheetId}/submit`,
        { method: 'POST' }
      );
      const data = await response.json();

      if (data.success) {
        toast.success('Timesheet submitted for approval');
        fetchTimesheets();
      } else {
        toast.error(data.message || 'Failed to submit timesheet');
      }
    } catch (error) {
      console.error('Failed to submit timesheet:', error);
      toast.error('Failed to submit timesheet');
    }
  };

  const handleApproveTimesheet = async (timesheetId: number) => {
    try {
      const response = await fetch(
        `/api/accounting/expenses-payroll/timesheets/${timesheetId}/approve?approved_by_email=${currentUserEmail}`,
        { method: 'POST' }
      );
      const data = await response.json();

      if (data.success) {
        toast.success('Timesheet approved');
        fetchTimesheets();
      } else {
        toast.error(data.message || 'Failed to approve timesheet');
      }
    } catch (error) {
      console.error('Failed to approve timesheet:', error);
      toast.error('Failed to approve timesheet');
    }
  };

  const addTimesheetEntry = () => {
    setTimesheetForm(prev => ({
      ...prev,
      entries: [...prev.entries, { work_date: '', hours: 0, project_name: '', task_description: '', pay_type: 'Regular' }]
    }));
  };

  const removeTimesheetEntry = (index: number) => {
    setTimesheetForm(prev => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== index)
    }));
  };

  const getTimesheetStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: 'secondary' as const, label: 'Draft' },
      submitted: { variant: 'default' as const, label: 'Submitted' },
      approved: { variant: 'default' as const, label: 'Approved' },
      rejected: { variant: 'destructive' as const, label: 'Rejected' },
      processed: { variant: 'outline' as const, label: 'Processed' }
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // ============================================================================
  // PAYROLL
  // ============================================================================

  const fetchPayrollRuns = async () => {
    if (!selectedEntityId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/expenses-payroll/payroll-runs?entity_id=${selectedEntityId}`
      );
      const data = await response.json();
      if (data.success) {
        setPayrollRuns(data.payroll_runs || []);
      } else {
        toast.error('Failed to fetch payroll runs');
      }
    } catch (error) {
      console.error('Failed to fetch payroll runs:', error);
      toast.error('Failed to fetch payroll runs');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculatePayroll = async () => {
    if (!selectedEntityId || !payrollForm.pay_period_start || !payrollForm.pay_period_end) {
      toast.error('Pay period dates are required');
      return;
    }

    setSubmitting(true);
    try {
      // Get approved timesheets for the period
      const timesheetsResponse = await fetch(
        `/api/accounting/expenses-payroll/timesheets?entity_id=${selectedEntityId}&status=approved`
      );
      const timesheetsData = await timesheetsResponse.json();
      
      if (!timesheetsData.success || !timesheetsData.timesheets || timesheetsData.timesheets.length === 0) {
        toast.error('No approved timesheets found for this period');
        setSubmitting(false);
        return;
      }

      const timesheetIds = timesheetsData.timesheets.map((t: any) => t.id);

      const response = await fetch(
        `/api/accounting/expenses-payroll/payroll-runs/calculate?entity_id=${selectedEntityId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pay_period_start: payrollForm.pay_period_start,
            pay_period_end: payrollForm.pay_period_end,
            pay_date: payrollForm.pay_date,
            timesheet_ids: timesheetIds
          }),
        }
      );
      const data = await response.json();

      if (data.success) {
        toast.success(`Payroll calculated: $${data.total_net} net pay`);
        setCalculatePayrollModalOpen(false);
        fetchPayrollRuns();
        // Reset form
        setPayrollForm({
          pay_period_start: '',
          pay_period_end: '',
          pay_date: '',
          timesheet_ids: []
        });
      } else {
        toast.error(data.detail || 'Failed to calculate payroll');
      }
    } catch (error) {
      console.error('Failed to calculate payroll:', error);
      toast.error('Failed to calculate payroll');
    } finally {
      setSubmitting(false);
    }
  };

  const getPayrollStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: 'secondary' as const, label: 'Draft' },
      approved: { variant: 'default' as const, label: 'Approved' },
      processed: { variant: 'default' as const, label: 'Processed' },
      completed: { variant: 'outline' as const, label: 'Completed' }
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // ============================================================================
  // SUMMARY CARDS
  // ============================================================================

  const getTotalPendingExpenses = () => {
    return expenseReports
      .filter(r => r.status === 'pending_approval')
      .reduce((sum, r) => sum + parseFloat(r.reimbursable_amount || '0'), 0);
  };

  const getTotalPendingTimesheets = () => {
    return timesheets.filter(t => t.status === 'submitted').length;
  };

  const getTotalPayrollYTD = () => {
    return payrollRuns
      .reduce((sum, pr) => sum + parseFloat(pr.total_net_pay || '0'), 0);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${getTotalPendingExpenses().toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {expenseReports.filter(r => r.status === 'pending_approval').length} reports
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Timesheets</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalPendingTimesheets()}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">YTD Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${getTotalPayrollYTD().toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{payrollRuns.length} payroll runs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2025</div>
            <p className="text-xs text-muted-foreground">Tax tables up to date</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="expense-reports">Expense Reports</TabsTrigger>
          <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* ============================================================================ */}
        {/* EXPENSE REPORTS TAB */}
        {/* ============================================================================ */}
        <TabsContent value="expense-reports" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Expense Reports</CardTitle>
                  <CardDescription>Submit and approve expense reports with automatic reimbursement</CardDescription>
                </div>
                <Button onClick={() => setCreateExpenseModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Expense Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground">Loading expense reports...</p>
              ) : expenseReports.length === 0 ? (
                <p className="text-center text-muted-foreground">No expense reports found. Create your first expense report to get started.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseReports.map((report: any) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.report_number}</TableCell>
                        <TableCell>{new Date(report.report_date).toLocaleDateString()}</TableCell>
                        <TableCell>{report.employee_name}</TableCell>
                        <TableCell>${parseFloat(report.reimbursable_amount).toFixed(2)}</TableCell>
                        <TableCell>{getExpenseStatusBadge(report.status)}</TableCell>
                        <TableCell>
                          {report.status === 'draft' && report.employee_email === currentUserEmail && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSubmitExpenseReport(report.id)}
                            >
                              <Send className="mr-2 h-3 w-3" />
                              Submit
                            </Button>
                          )}
                          {report.status === 'pending_approval' && report.employee_email !== currentUserEmail && (
                            <Button
                              size="sm"
                              onClick={() => handleApproveExpenseReport(report.id)}
                            >
                              <CheckCircle2 className="mr-2 h-3 w-3" />
                              Approve
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
        {/* TIMESHEETS TAB */}
        {/* ============================================================================ */}
        <TabsContent value="timesheets" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Timesheets</CardTitle>
                  <CardDescription>Track partner hours for payroll processing</CardDescription>
                </div>
                <Button onClick={() => setCreateTimesheetModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Timesheet
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground">Loading timesheets...</p>
              ) : timesheets.length === 0 ? (
                <p className="text-center text-muted-foreground">No timesheets found. Create your first timesheet to get started.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timesheet #</TableHead>
                      <TableHead>Week</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timesheets.map((timesheet: any) => (
                      <TableRow key={timesheet.id}>
                        <TableCell className="font-medium">{timesheet.timesheet_number}</TableCell>
                        <TableCell>
                          {new Date(timesheet.week_start_date).toLocaleDateString()} - {new Date(timesheet.week_end_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{timesheet.employee_name}</TableCell>
                        <TableCell>{parseFloat(timesheet.total_hours).toFixed(2)}</TableCell>
                        <TableCell>{getTimesheetStatusBadge(timesheet.status)}</TableCell>
                        <TableCell>
                          {timesheet.status === 'draft' && timesheet.employee_email === currentUserEmail && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSubmitTimesheet(timesheet.id)}
                            >
                              <Send className="mr-2 h-3 w-3" />
                              Submit
                            </Button>
                          )}
                          {timesheet.status === 'submitted' && timesheet.employee_email !== currentUserEmail && (
                            <Button
                              size="sm"
                              onClick={() => handleApproveTimesheet(timesheet.id)}
                            >
                              <CheckCircle2 className="mr-2 h-3 w-3" />
                              Approve
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
        {/* PAYROLL TAB */}
        {/* ============================================================================ */}
        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payroll Runs</CardTitle>
                  <CardDescription>Calculate and process payroll with full 2025 tax compliance</CardDescription>
                </div>
                <Button onClick={() => setCalculatePayrollModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Calculate Payroll
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground">Loading payroll runs...</p>
              ) : payrollRuns.length === 0 ? (
                <p className="text-center text-muted-foreground">No payroll runs found. Calculate your first payroll run to get started.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payroll #</TableHead>
                      <TableHead>Pay Period</TableHead>
                      <TableHead>Pay Date</TableHead>
                      <TableHead>Gross Wages</TableHead>
                      <TableHead>Net Pay</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollRuns.map((payroll: any) => (
                      <TableRow key={payroll.id}>
                        <TableCell className="font-medium">{payroll.payroll_run_number}</TableCell>
                        <TableCell>
                          {new Date(payroll.pay_period_start).toLocaleDateString()} - {new Date(payroll.pay_period_end).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{new Date(payroll.pay_date).toLocaleDateString()}</TableCell>
                        <TableCell>${parseFloat(payroll.total_gross_wages).toFixed(2)}</TableCell>
                        <TableCell>${parseFloat(payroll.total_net_pay).toFixed(2)}</TableCell>
                        <TableCell>{getPayrollStatusBadge(payroll.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================================ */}
        {/* REPORTS TAB */}
        {/* ============================================================================ */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Expense Reports</CardTitle>
                <CardDescription>Analyze expense spending patterns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Expense by Category
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <User className="mr-2 h-4 w-4" />
                  Expense by Employee
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Reimbursement Status
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Tax Deductible Summary
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payroll Reports</CardTitle>
                <CardDescription>Payroll and tax compliance reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Payroll Summary (YTD)
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Form 941 (Quarterly)
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  W-2 Generation
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  State Tax Reports (CA)
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ============================================================================ */}
      {/* CREATE EXPENSE REPORT MODAL */}
      {/* ============================================================================ */}
      <Dialog open={createExpenseModalOpen} onOpenChange={setCreateExpenseModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Expense Report</DialogTitle>
            <DialogDescription>Submit expenses for reimbursement. Other partner will review and approve.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Period Start</Label>
                <Input
                  type="date"
                  value={expenseForm.period_start}
                  onChange={(e) => setExpenseForm({ ...expenseForm, period_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Input
                  type="date"
                  value={expenseForm.period_end}
                  onChange={(e) => setExpenseForm({ ...expenseForm, period_end: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Memo</Label>
              <Textarea
                value={expenseForm.memo}
                onChange={(e) => setExpenseForm({ ...expenseForm, memo: e.target.value })}
                placeholder="Optional memo for this expense report"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Expense Lines</Label>
                <Button type="button" size="sm" variant="outline" onClick={addExpenseLine}>
                  <Plus className="mr-2 h-3 w-3" />
                  Add Line
                </Button>
              </div>

              {expenseForm.lines.map((line, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-6 gap-4">
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={line.expense_date}
                          onChange={(e) => {
                            const newLines = [...expenseForm.lines];
                            newLines[index].expense_date = e.target.value;
                            setExpenseForm({ ...expenseForm, lines: newLines });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Merchant</Label>
                        <Input
                          value={line.merchant}
                          onChange={(e) => {
                            const newLines = [...expenseForm.lines];
                            newLines[index].merchant = e.target.value;
                            setExpenseForm({ ...expenseForm, lines: newLines });
                          }}
                          placeholder="Vendor name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={line.category}
                          onValueChange={(value) => {
                            const newLines = [...expenseForm.lines];
                            newLines[index].category = value;
                            setExpenseForm({ ...expenseForm, lines: newLines });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Meals">Meals</SelectItem>
                            <SelectItem value="Travel">Travel</SelectItem>
                            <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                            <SelectItem value="Software">Software</SelectItem>
                            <SelectItem value="Professional Fees">Professional Fees</SelectItem>
                            <SelectItem value="Marketing">Marketing</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label>Description</Label>
                        <Input
                          value={line.description}
                          onChange={(e) => {
                            const newLines = [...expenseForm.lines];
                            newLines[index].description = e.target.value;
                            setExpenseForm({ ...expenseForm, lines: newLines });
                          }}
                          placeholder="Expense description"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Amount</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={line.amount}
                            onChange={(e) => {
                              const newLines = [...expenseForm.lines];
                              newLines[index].amount = parseFloat(e.target.value) || 0;
                              setExpenseForm({ ...expenseForm, lines: newLines });
                            }}
                            placeholder="0.00"
                          />
                          {expenseForm.lines.length > 1 && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => removeExpenseLine(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">
                  ${expenseForm.lines.reduce((sum, line) => sum + (line.amount || 0), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateExpenseModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateExpenseReport} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Expense Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================================ */}
      {/* CREATE TIMESHEET MODAL */}
      {/* ============================================================================ */}
      <Dialog open={createTimesheetModalOpen} onOpenChange={setCreateTimesheetModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Timesheet</DialogTitle>
            <DialogDescription>Enter weekly hours for payroll processing</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Week Start Date</Label>
                <Input
                  type="date"
                  value={timesheetForm.week_start_date}
                  onChange={(e) => setTimesheetForm({ ...timesheetForm, week_start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Week End Date</Label>
                <Input
                  type="date"
                  value={timesheetForm.week_end_date}
                  onChange={(e) => setTimesheetForm({ ...timesheetForm, week_end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Daily Hours</Label>
                <Button type="button" size="sm" variant="outline" onClick={addTimesheetEntry}>
                  <Plus className="mr-2 h-3 w-3" />
                  Add Day
                </Button>
              </div>

              {timesheetForm.entries.map((entry, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-5 gap-4">
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={entry.work_date}
                          onChange={(e) => {
                            const newEntries = [...timesheetForm.entries];
                            newEntries[index].work_date = e.target.value;
                            setTimesheetForm({ ...timesheetForm, entries: newEntries });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Hours</Label>
                        <Input
                          type="number"
                          step="0.25"
                          value={entry.hours}
                          onChange={(e) => {
                            const newEntries = [...timesheetForm.entries];
                            newEntries[index].hours = parseFloat(e.target.value) || 0;
                            setTimesheetForm({ ...timesheetForm, entries: newEntries });
                          }}
                          placeholder="8.0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Project</Label>
                        <Input
                          value={entry.project_name}
                          onChange={(e) => {
                            const newEntries = [...timesheetForm.entries];
                            newEntries[index].project_name = e.target.value;
                            setTimesheetForm({ ...timesheetForm, entries: newEntries });
                          }}
                          placeholder="Optional"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Task</Label>
                        <Input
                          value={entry.task_description}
                          onChange={(e) => {
                            const newEntries = [...timesheetForm.entries];
                            newEntries[index].task_description = e.target.value;
                            setTimesheetForm({ ...timesheetForm, entries: newEntries });
                          }}
                          placeholder="Optional"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <div className="flex gap-2">
                          <Select
                            value={entry.pay_type}
                            onValueChange={(value) => {
                              const newEntries = [...timesheetForm.entries];
                              newEntries[index].pay_type = value;
                              setTimesheetForm({ ...timesheetForm, entries: newEntries });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Regular">Regular</SelectItem>
                              <SelectItem value="Overtime">Overtime</SelectItem>
                              <SelectItem value="Holiday">Holiday</SelectItem>
                            </SelectContent>
                          </Select>
                          {timesheetForm.entries.length > 1 && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => removeTimesheetEntry(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">
                  {timesheetForm.entries.reduce((sum, entry) => sum + (entry.hours || 0), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTimesheetModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTimesheet} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Timesheet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================================ */}
      {/* CALCULATE PAYROLL MODAL */}
      {/* ============================================================================ */}
      <Dialog open={calculatePayrollModalOpen} onOpenChange={setCalculatePayrollModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Calculate Payroll</DialogTitle>
            <DialogDescription>
              Calculate payroll from approved timesheets with full 2025 tax compliance
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pay Period Start</Label>
              <Input
                type="date"
                value={payrollForm.pay_period_start}
                onChange={(e) => setPayrollForm({ ...payrollForm, pay_period_start: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Pay Period End</Label>
              <Input
                type="date"
                value={payrollForm.pay_period_end}
                onChange={(e) => setPayrollForm({ ...payrollForm, pay_period_end: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Pay Date</Label>
              <Input
                type="date"
                value={payrollForm.pay_date}
                onChange={(e) => setPayrollForm({ ...payrollForm, pay_date: e.target.value })}
              />
            </div>

            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">Tax Withholding (2025)</p>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>Federal Income Tax (W-4)</li>
                <li>FICA: 6.2% (Social Security)</li>
                <li>Medicare: 1.45%</li>
                <li>CA State Income Tax (DE-4)</li>
                <li>CA SDI: ~1%</li>
                <li>Employer: FICA, Medicare, FUTA, SUTA, ETT</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCalculatePayrollModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCalculatePayroll} disabled={submitting}>
              {submitting ? 'Calculating...' : 'Calculate Payroll'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
