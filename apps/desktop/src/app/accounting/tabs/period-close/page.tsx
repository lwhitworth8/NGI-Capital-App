"use client"

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Lock,
  Unlock,
  FileText,
  DollarSign,
  Calendar,
  TrendingUp,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { useEntityContext } from '@/hooks/useEntityContext';
import { toast } from 'sonner';

export default function PeriodClosePage() {
  const { selectedEntityId } = useEntityContext();
  const [periodCloses, setPeriodCloses] = useState([]);
  const [currentClose, setCurrentClose] = useState<any>(null);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initiateModalOpen, setInitiateModalOpen] = useState(false);
  const [confirmCloseModalOpen, setConfirmCloseModalOpen] = useState(false);
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  
  const [closeForm, setCloseForm] = useState({
    period_type: 'month',
    period_end_date: new Date().toISOString().split('T')[0],
    initiated_by_email: 'lwhitworth@ngicapitaladvisory.com'
  });
  
  const [reopenReason, setReopenReason] = useState('');

  useEffect(() => {
    if (selectedEntityId) {
      fetchPeriodCloses();
    }
  }, [selectedEntityId]);

  const fetchPeriodCloses = async () => {
    if (!selectedEntityId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/period-close/list?entity_id=${selectedEntityId}&limit=20`
      );
      const data = await response.json();
      if (data.success) {
        setPeriodCloses(data.closes || []);
      }
    } catch (error) {
      console.error('Failed to fetch period closes:', error);
      toast.error('Failed to fetch period closes');
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateClose = async () => {
    if (!selectedEntityId) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/period-close/initiate?entity_id=${selectedEntityId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(closeForm),
        }
      );
      const data = await response.json();
      
      if (data.success) {
        toast.success('Period close initiated successfully');
        setInitiateModalOpen(false);
        fetchPeriodCloses();
        
        // Load the new close
        if (data.close_id) {
          loadCloseDetails(data.close_id);
        }
      } else {
        toast.error(data.message || 'Failed to initiate period close');
      }
    } catch (error) {
      console.error('Failed to initiate period close:', error);
      toast.error('Failed to initiate period close');
    } finally {
      setLoading(false);
    }
  };

  const loadCloseDetails = async (closeId: number) => {
    try {
      const response = await fetch(`/api/accounting/period-close/${closeId}`);
      const data = await response.json();
      
      if (data.success) {
        setCurrentClose(data.close);
        setChecklist(data.close.checklist_status || []);
      }
    } catch (error) {
      console.error('Failed to load close details:', error);
    }
  };

  const refreshChecklist = async () => {
    if (!currentClose) return;
    
    try {
      const response = await fetch(
        `/api/accounting/period-close/${currentClose.id}/checklist`
      );
      const data = await response.json();
      
      if (data.success) {
        setChecklist(data.checklist);
        // Reload full details to update completion status
        loadCloseDetails(currentClose.id);
      }
    } catch (error) {
      console.error('Failed to refresh checklist:', error);
    }
  };

  const handleExecuteClose = async () => {
    if (!currentClose) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/period-close/${currentClose.id}/execute`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            closed_by_email: 'lwhitworth@ngicapitaladvisory.com',
            force: false
          }),
        }
      );
      const data = await response.json();
      
      if (data.success) {
        toast.success('Period closed successfully!');
        setConfirmCloseModalOpen(false);
        fetchPeriodCloses();
        loadCloseDetails(currentClose.id);
      } else {
        toast.error(data.message || 'Failed to execute period close');
        if (data.incomplete_items) {
          toast.error(`Incomplete items: ${data.incomplete_items.join(', ')}`);
        }
      }
    } catch (error) {
      console.error('Failed to execute period close:', error);
      toast.error('Failed to execute period close');
    } finally {
      setLoading(false);
    }
  };

  const handleReopenPeriod = async () => {
    if (!currentClose || !reopenReason.trim()) {
      toast.error('Please provide a reason for reopening');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/period-close/${currentClose.id}/reopen`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reopened_by_email: 'lwhitworth@ngicapitaladvisory.com',
            reason: reopenReason
          }),
        }
      );
      const data = await response.json();
      
      if (data.success) {
        toast.success('Period reopened successfully');
        setReopenModalOpen(false);
        setReopenReason('');
        fetchPeriodCloses();
        loadCloseDetails(currentClose.id);
      } else {
        toast.error(data.message || 'Failed to reopen period');
      }
    } catch (error) {
      console.error('Failed to reopen period:', error);
      toast.error('Failed to reopen period');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'closed':
        return <Badge variant="default" className="bg-green-600"><Lock className="mr-1 h-3 w-3" />Closed</Badge>;
      case 'in_progress':
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />In Progress</Badge>;
      case 'reopened':
        return <Badge variant="outline" className="text-orange-600"><Unlock className="mr-1 h-3 w-3" />Reopened</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getChecklistIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'incomplete':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'manual_review':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'ready':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'waiting':
        return <Clock className="h-5 w-5 text-gray-400" />;
      default:
        return <Activity className="h-5 w-5 text-gray-400" />;
    }
  };

  const calculateProgress = () => {
    if (!checklist.length) return 0;
    const completed = checklist.filter((item: any) => 
      item.status === 'complete' || item.status === 'ready'
    ).length;
    return (completed / checklist.length) * 100;
  };

  const canExecuteClose = () => {
    if (!currentClose || currentClose.status === 'closed') return false;
    const incompleteItems = checklist.filter((item: any) => 
      item.status !== 'complete' && item.status !== 'ready'
    );
    return incompleteItems.length === 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Period Close</h2>
          <p className="text-muted-foreground">
            Month, quarter, and year-end close process with comprehensive checklist
          </p>
        </div>
        <Button onClick={() => setInitiateModalOpen(true)} size="lg">
          <Calendar className="mr-2 h-4 w-4" />
          Initiate New Period Close
        </Button>
      </div>

      {/* Workflow Explanation */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">Period Close Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-blue-800">
            <p><strong>1. Initiate Close:</strong> Select period type (month/quarter/year) and end date</p>
            <p><strong>2. Complete Checklist:</strong> System validates all requirements automatically</p>
            <p><strong>3. Review Items:</strong> Address any incomplete checklist items</p>
            <p><strong>4. Execute Close:</strong> Lock period and generate financial statements</p>
            <p><strong>5. Post-Close:</strong> Period is locked; statements are available for reporting</p>
            <p className="flex items-center gap-2 pt-2 border-t border-blue-200">
              <AlertTriangle className="h-4 w-4" />
              <span><strong>Important:</strong> Reopening a closed period requires approval and reason documentation</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Current Close in Progress */}
      {currentClose && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">
                  {currentClose.fiscal_period} Close
                </CardTitle>
                <CardDescription>
                  {new Date(currentClose.period_start).toLocaleDateString()} - {new Date(currentClose.period_end).toLocaleDateString()}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(currentClose.status)}
                {currentClose.status === 'closed' && (
                  <Button variant="outline" onClick={() => setReopenModalOpen(true)}>
                    <Unlock className="mr-2 h-4 w-4" />
                    Reopen Period
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Bar */}
            {currentClose.status !== 'closed' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Overall Progress</span>
                  <span className="text-muted-foreground">{Math.round(calculateProgress())}%</span>
                </div>
                <Progress value={calculateProgress()} className="h-2" />
              </div>
            )}

            {/* Financial Summary */}
            {currentClose.status === 'closed' && (
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${currentClose.financial_summary.total_assets.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Liabilities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${currentClose.financial_summary.total_liabilities.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Equity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${currentClose.financial_summary.total_equity.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Net Income</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${currentClose.financial_summary.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${currentClose.financial_summary.net_income.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Checklist */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Period Close Checklist</h3>
                {currentClose.status !== 'closed' && (
                  <Button variant="outline" size="sm" onClick={refreshChecklist}>
                    Refresh Checklist
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {checklist.map((item: any, index: number) => (
                  <div
                    key={index}
                    className={`flex items-start gap-4 p-4 rounded-lg border-2 ${
                      item.status === 'complete' || item.status === 'ready'
                        ? 'bg-green-50 border-green-200'
                        : item.status === 'manual_review'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="mt-0.5">{getChecklistIcon(item.status)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{item.item}</p>
                        <Badge variant={item.status === 'complete' ? 'default' : 'secondary'}>
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.details}</p>
                      {item.action_url && item.status !== 'complete' && (
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto"
                          onClick={() => window.location.href = item.action_url}
                        >
                          Go to {item.category} →
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trial Balance Summary */}
            {currentClose.trial_balance && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Trial Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Debits</p>
                      <p className="text-lg font-semibold">
                        ${currentClose.trial_balance.debits.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Credits</p>
                      <p className="text-lg font-semibold">
                        ${currentClose.trial_balance.credits.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className={`text-lg font-semibold ${currentClose.trial_balance.is_balanced ? 'text-green-600' : 'text-red-600'}`}>
                        {currentClose.trial_balance.is_balanced ? 'Balanced ✓' : 'Out of Balance'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Execute Close Button */}
            {currentClose.status !== 'closed' && (
              <div className="pt-4 border-t">
                <Button
                  size="lg"
                  className="w-full text-lg h-14"
                  onClick={() => setConfirmCloseModalOpen(true)}
                  disabled={!canExecuteClose()}
                >
                  {canExecuteClose() ? (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Execute Period Close
                    </>
                  ) : (
                    <>
                      <AlertCircle className="mr-2 h-5 w-5" />
                      Complete Checklist to Close Period
                    </>
                  )}
                </Button>
                {!canExecuteClose() && (
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    All checklist items must be complete before closing the period
                  </p>
                )}
              </div>
            )}

            {/* View Statements (if closed) */}
            {currentClose.status === 'closed' && (
              <div className="pt-4 border-t">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => window.location.href = '/accounting/reporting'}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View Financial Statements
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Previous Period Closes */}
      <Card>
        <CardHeader>
          <CardTitle>Period Close History</CardTitle>
          <CardDescription>View all previous period closes</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading period closes...</p>
          ) : periodCloses.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">No period closes yet</p>
              <Button onClick={() => setInitiateModalOpen(true)} className="mt-4">
                Initiate First Period Close
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Period Start</TableHead>
                  <TableHead>Period End</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Net Income</TableHead>
                  <TableHead>Closed Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodCloses.map((close: any) => (
                  <TableRow key={close.id}>
                    <TableCell className="font-medium">{close.fiscal_period}</TableCell>
                    <TableCell className="capitalize">{close.period_type}</TableCell>
                    <TableCell>{new Date(close.period_start).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(close.period_end).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusBadge(close.status)}</TableCell>
                    <TableCell className={`font-mono ${close.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${close.net_income.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {close.closed_at ? new Date(close.closed_at).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadCloseDetails(close.id)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Initiate Close Modal */}
      <Dialog open={initiateModalOpen} onOpenChange={setInitiateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Initiate Period Close</DialogTitle>
            <DialogDescription>
              Select the period type and end date to begin the close process
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Period Type</Label>
              <Select
                value={closeForm.period_type}
                onValueChange={(value) => setCloseForm({ ...closeForm, period_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="quarter">Quarter</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Period End Date</Label>
              <Input
                type="date"
                value={closeForm.period_end_date}
                onChange={(e) => setCloseForm({ ...closeForm, period_end_date: e.target.value })}
              />
            </div>

            <div className="rounded-lg bg-yellow-50 p-3 border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> The system will automatically calculate the period start date based on the type and end date selected.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInitiateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInitiateClose} disabled={loading}>
              {loading ? 'Initiating...' : 'Initiate Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Close Modal */}
      <Dialog open={confirmCloseModalOpen} onOpenChange={setConfirmCloseModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Period Close</DialogTitle>
            <DialogDescription>
              Are you sure you want to close this period? This action will:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
              <ul className="space-y-2 text-sm text-blue-900">
                <li className="flex items-start gap-2">
                  <Lock className="h-4 w-4 mt-0.5" />
                  <span>Lock all journal entries in the period</span>
                </li>
                <li className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5" />
                  <span>Generate final financial statements</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5" />
                  <span>Mark the period as closed</span>
                </li>
                {currentClose?.period_type === 'year' && (
                  <li className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 mt-0.5" />
                    <span>Create year-end closing entries</span>
                  </li>
                )}
              </ul>
            </div>

            <div className="rounded-lg bg-red-50 p-4 border border-red-200">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> Once closed, the period will be locked and changes will require reopening with approval and documentation.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCloseModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExecuteClose} disabled={loading}>
              {loading ? 'Closing...' : 'Confirm and Close Period'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen Period Modal */}
      <Dialog open={reopenModalOpen} onOpenChange={setReopenModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reopen Closed Period</DialogTitle>
            <DialogDescription>
              Reopening a closed period requires documentation. Please provide a reason.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason for Reopening *</Label>
              <textarea
                className="w-full min-h-[100px] p-3 border rounded-md"
                placeholder="Enter detailed reason for reopening this period..."
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
              />
            </div>

            <div className="rounded-lg bg-orange-50 p-3 border border-orange-200">
              <p className="text-sm text-orange-800">
                <strong>Note:</strong> Reopening will unlock all journal entries in the period and allow modifications. A new close will be required after making changes.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReopenModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReopenPeriod} disabled={loading || !reopenReason.trim()}>
              {loading ? 'Reopening...' : 'Reopen Period'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
