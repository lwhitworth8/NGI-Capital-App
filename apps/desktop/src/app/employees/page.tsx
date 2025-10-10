'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Users,
  Plus,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  DollarSign,
  Briefcase,
  FileText,
  Download,
  Edit,
  Trash2,
  UserPlus,
  Target,
  Award,
  Loader2,
} from 'lucide-react';
import { useEntity } from '@/lib/context/UnifiedEntityContext';
import { EntitySelector } from '@/components/common/EntitySelector';
import { useUser } from '@clerk/nextjs';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ModuleHeader } from '@ngi/ui/components/layout';

// Interfaces
interface Employee {
  id: number;
  name: string;
  email: string;
  title: string;
  role: string;
  classification: string;
  status: string;
  employment_type: string;
  start_date: string;
  team_id?: number;
  team_name?: string;
  projects?: Array<{ id: number; name: string }>;
}

interface Team {
  id: number;
  name: string;
  description: string;
  employee_count: number;
  lead_name?: string;
}

interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  student_count: number;
  leads?: Array<{ id: number; employee_name: string; role: string }>;
}

interface Timesheet {
  id: number;
  employee_id: number;
  employee_name: string;
  pay_period_start: string;
  pay_period_end: string;
  total_hours: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  submitted_date?: string;
  approved_date?: string;
  rejected_date?: string;
  rejection_reason?: string;
  entries_count: number;
}

interface TimesheetEntry {
  id?: number;
  entry_date: string;
  hours: number;
  project_id?: number;
  team_id?: number;
  notes?: string;
}

export default function EmployeesPage() {
  const { selectedEntity } = useEntity();
  const selectedEntityId = selectedEntity?.id || null;
  const { user } = useUser();
  const currentUserEmail = user?.primaryEmailAddress?.emailAddress || '';
  
  // State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Entity detection
  const [entityName, setEntityName] = useState('');
  const isAdvisory = entityName.toLowerCase().includes('advisory');
  
  // Modals
  const [createEmployeeModal, setCreateEmployeeModal] = useState(false);
  const [createTeamModal, setCreateTeamModal] = useState(false);
  const [createProjectModal, setCreateProjectModal] = useState(false);
  const [createTimesheetModal, setCreateTimesheetModal] = useState(false);
  const [timesheetDetailModal, setTimesheetDetailModal] = useState(false);
  
  // Selected items
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timesheetStatusFilter, setTimesheetStatusFilter] = useState('all');
  
  // Form states
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    title: '',
    role: '',
    classification: '',
    employment_type: 'full_time',
    start_date: new Date().toISOString().split('T')[0],
    team_id: '',
    compensation_type: 'salary',
    hourly_rate: '',
    annual_salary: ''
  });
  
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: ''
  });
  
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    status: 'active'
  });
  
  // My Timesheets personal entry
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay());
    return sunday.toISOString().split('T')[0];
  });
  
  const [weeklyEntries, setWeeklyEntries] = useState<Array<{
    date: string;
    dayName: string;
    worked: boolean;
    hours: number;
    project_team_id: string;
    task_description: string;
  }>>([]);

  useEffect(() => {
    if (selectedEntityId) {
      fetchAllData();
      generateWeeklyEntries();
    }
  }, [selectedEntityId, currentWeekStart]);

  // ChatKit event listeners
  useEffect(() => {
    const handleCreateEmployee = (e: CustomEvent) => {
      setCreateEmployeeModal(true);
      // Pre-fill form with e.detail data if available
      if (e.detail) {
        console.log('Pre-filling employee form with:', e.detail);
        // You can pre-fill form fields here
      }
    };

    const handleCreateTeam = (e: CustomEvent) => {
      setCreateTeamModal(true);
      if (e.detail) {
        console.log('Pre-filling team form with:', e.detail);
      }
    };

    const handleCreateTimesheet = (e: CustomEvent) => {
      setCreateTimesheetModal(true);
      if (e.detail) {
        console.log('Pre-filling timesheet form with:', e.detail);
      }
    };

    const handleSubmitTimesheet = (e: CustomEvent) => {
      if (e.detail?.timesheet_id) {
        // Handle timesheet submission
        console.log('Submitting timesheet:', e.detail.timesheet_id);
      }
    };
    
    window.addEventListener('nex:create_employee', handleCreateEmployee);
    window.addEventListener('nex:create_team', handleCreateTeam);
    window.addEventListener('nex:create_timesheet', handleCreateTimesheet);
    window.addEventListener('nex:submit_timesheet', handleSubmitTimesheet);
    
    return () => {
      window.removeEventListener('nex:create_employee', handleCreateEmployee);
      window.removeEventListener('nex:create_team', handleCreateTeam);
      window.removeEventListener('nex:create_timesheet', handleCreateTimesheet);
      window.removeEventListener('nex:submit_timesheet', handleSubmitTimesheet);
    };
  }, []);
  
  const generateWeeklyEntries = () => {
    const start = new Date(currentWeekStart);
    const entries = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      
      entries.push({
        date: date.toISOString().split('T')[0],
        dayName,
        worked: false,
        hours: 0,
        project_team_id: '',
        task_description: ''
      });
    }
    
    setWeeklyEntries(entries);
  };
  
  const navigateWeek = (direction: 'prev' | 'next') => {
    const current = new Date(currentWeekStart);
    current.setDate(current.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(current.toISOString().split('T')[0]);
  };
  
  const currentEmployee = employees.find(e => e.email === currentUserEmail);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchEmployees(),
        fetchTeams(),
        fetchProjects(),
        fetchTimesheets()
      ]);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`/api/employees?entity_id=${selectedEntityId}`);
      const data = await response.json();
      setEmployees(data || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      setEmployees([]);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch(`/api/teams?entity_id=${selectedEntityId}`);
      const data = await response.json();
      setTeams(data || []);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      setTeams([]);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch(`/api/projects?entity_id=${selectedEntityId}`);
      const data = await response.json();
      setProjects(data || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      setProjects([]);
    }
  };

  const fetchTimesheets = async () => {
    try {
      const response = await fetch(`/api/timesheets?entity_id=${selectedEntityId}`);
      const data = await response.json();
      setTimesheets(data.timesheets || []);
    } catch (error) {
      console.error('Failed to fetch timesheets:', error);
      setTimesheets([]);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
    const payload: any = {
        entity_id: selectedEntityId,
        name: newEmployee.name,
        email: newEmployee.email
      };
      
      // Add optional fields only if they have values
      if (newEmployee.title) payload.title = newEmployee.title;
      if (newEmployee.role) payload.role = newEmployee.role;
      if (newEmployee.classification) payload.classification = newEmployee.classification;
      if (newEmployee.employment_type) payload.employment_type = newEmployee.employment_type;
      if (newEmployee.start_date) payload.start_date = newEmployee.start_date;
      if (newEmployee.team_id) payload.team_id = parseInt(newEmployee.team_id);
      
      // Compensation
      if (newEmployee.compensation_type === 'hourly' && newEmployee.hourly_rate) {
        payload.hourly_rate = parseFloat(newEmployee.hourly_rate);
      } else if (newEmployee.compensation_type === 'salary' && newEmployee.annual_salary) {
        payload.annual_salary = parseFloat(newEmployee.annual_salary);
      }
      
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('Employee created successfully!');
        setCreateEmployeeModal(false);
        fetchEmployees();
        setNewEmployee({
          name: '',
          email: '',
          title: '',
          role: '',
          classification: '',
          employment_type: 'full_time',
          start_date: new Date().toISOString().split('T')[0],
          team_id: '',
          compensation_type: 'salary',
          hourly_rate: '',
          annual_salary: ''
        });
      } else {
        const errorText = await response.text();
        console.error('Failed to create employee:', errorText);
        alert(`Failed to create employee: ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to create employee:', error);
      alert('Failed to create employee. Please try again.');
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: selectedEntityId,
          ...newTeam
        })
      });

      if (response.ok) {
        setCreateTeamModal(false);
        fetchTeams();
        setNewTeam({ name: '', description: '' });
      }
    } catch (error) {
      console.error('Failed to create team:', error);
      alert('Failed to create team');
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: selectedEntityId,
          ...newProject
        })
      });

      if (response.ok) {
        setCreateProjectModal(false);
        fetchProjects();
        setNewProject({ name: '', description: '', status: 'active' });
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project');
    }
  };

  const handleCreateTimesheet = async () => {
    // Validate
    if (!newTimesheet.employee_id || !newTimesheet.pay_period_start || !newTimesheet.pay_period_end) {
      alert('Please select employee and date range');
      return;
    }
    
    try {
      // Create timesheet
      const response = await fetch('/api/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: selectedEntityId,
          ...newTimesheet
        })
      });

      if (response.ok) {
        const data = await response.json();
        const timesheetId = data.id;
        
        // Save entries if any hours entered
        const entriesWithHours = newTimesheetEntries.filter(e => e.hours > 0);
        if (entriesWithHours.length > 0) {
          await fetch(`/api/timesheets/${timesheetId}/entries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entries: entriesWithHours })
          });
        }
        
        alert('Timesheet created successfully!');
        setCreateTimesheetModal(false);
        fetchTimesheets();
        setNewTimesheet({ employee_id: '', pay_period_start: '', pay_period_end: '' });
        setNewTimesheetEntries([]);
      } else {
        const errorText = await response.text();
        alert(`Failed to create timesheet: ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to create timesheet:', error);
      alert('Failed to create timesheet');
    }
  };
  
  const generateWeekDays = () => {
    if (!newTimesheet.pay_period_start || !newTimesheet.pay_period_end) return;
    
    const start = new Date(newTimesheet.pay_period_start);
    const end = new Date(newTimesheet.pay_period_end);
    const days: TimesheetEntry[] = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push({
        entry_date: d.toISOString().split('T')[0],
        hours: 0,
        notes: ''
      });
    }
    
    setNewTimesheetEntries(days);
  };

  const openTimesheetForEntry = (timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet);
    // Generate week days
    const start = new Date(timesheet.pay_period_start);
    const end = new Date(timesheet.pay_period_end);
    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push({
        entry_date: d.toISOString().split('T')[0],
        hours: 0,
        notes: ''
      });
    }
    setTimesheetEntries(days);
    setTimesheetDetailModal(true);
  };

  const handleSaveTimesheetEntries = async () => {
    if (!selectedTimesheet) return;
    
    try {
      const response = await fetch(`/api/timesheets/${selectedTimesheet.id}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: timesheetEntries })
      });

      if (response.ok) {
        alert('Timesheet saved!');
        setTimesheetDetailModal(false);
        fetchTimesheets();
      }
    } catch (error) {
      console.error('Failed to save entries:', error);
      alert('Failed to save timesheet');
    }
  };

  const handleSubmitTimesheet = async () => {
    if (!selectedTimesheet) return;
    
    try {
      await handleSaveTimesheetEntries();
      
      const response = await fetch(`/api/timesheets/${selectedTimesheet.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        alert('Timesheet submitted for approval!');
        setTimesheetDetailModal(false);
        fetchTimesheets();
      }
    } catch (error) {
      console.error('Failed to submit timesheet:', error);
      alert('Failed to submit timesheet');
    }
  };

  const handleApproveTimesheet = async (timesheetId: number) => {
    try {
      const response = await fetch(`/api/timesheets/${timesheetId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        alert('Timesheet approved!');
        fetchTimesheets();
      }
    } catch (error) {
      console.error('Failed to approve timesheet:', error);
      alert('Failed to approve timesheet');
    }
  };

  const handleRejectTimesheet = async (timesheetId: number) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    
    try {
      const response = await fetch(`/api/timesheets/${timesheetId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        alert('Timesheet rejected');
        fetchTimesheets();
      }
    } catch (error) {
      console.error('Failed to reject timesheet:', error);
      alert('Failed to reject timesheet');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: React.ReactNode; label: string }> = {
      draft: { variant: 'secondary', icon: <Clock className="h-3 w-3" />, label: 'Draft' },
      submitted: { variant: 'default', icon: <AlertCircle className="h-3 w-3" />, label: 'Pending' },
      approved: { variant: 'default', icon: <CheckCircle className="h-3 w-3" />, label: 'Approved' },
      rejected: { variant: 'destructive', icon: <XCircle className="h-3 w-3" />, label: 'Rejected' },
      paid: { variant: 'secondary', icon: <DollarSign className="h-3 w-3" />, label: 'Paid' },
      active: { variant: 'default', icon: <CheckCircle className="h-3 w-3" />, label: 'Active' },
      inactive: { variant: 'secondary', icon: <Clock className="h-3 w-3" />, label: 'Inactive' },
    };
    
    const config = variants[status] || variants.active;

  return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        {config.icon}
        <span>{config.label}</span>
      </Badge>
    );
  };

  // Filtered data
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredTimesheets = timesheets.filter(ts => {
    return timesheetStatusFilter === 'all' || ts.status === timesheetStatusFilter;
  });

  // KPIs
  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const pendingTimesheets = timesheets.filter(t => t.status === 'submitted').length;
  const approvedTimesheets = timesheets.filter(t => t.status === 'approved').length;
  const totalPendingHours = timesheets
    .filter(t => t.status === 'approved')
    .reduce((sum, t) => sum + (t.total_hours || 0), 0);

  // If no entity selected, show selector
  if (!selectedEntityId) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Select an Entity</CardTitle>
            <CardDescription>Choose an entity to manage employees</CardDescription>
          </CardHeader>
          <CardContent>
            <EntitySelector />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Fixed header - consistent with Finance module */}
      <ModuleHeader 
        title="Employee Management" 
        subtitle={`${selectedEntity?.entity_name} - Manage employees, teams, projects, and timesheets`}
        rightContent={<EntitySelector />}
      />
      
      {/* Scrollable content area */}
      <div className="flex-1 overflow-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-6 p-8"
        >

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full h-auto" style={{gridTemplateColumns: 'repeat(3, 1fr)'}}>
          <TabsTrigger value="dashboard">
            <TrendingUp className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="employees">
            <Users className="h-4 w-4 mr-2" />
            Employees
          </TabsTrigger>
          <TabsTrigger value={isAdvisory ? 'projects' : 'teams'}>
            <Briefcase className="h-4 w-4 mr-2" />
            {isAdvisory ? 'Projects' : 'Teams'}
          </TabsTrigger>
        </TabsList>
        <TabsList className="grid w-full h-auto mt-2" style={{gridTemplateColumns: 'repeat(3, 1fr)'}}>
          <TabsTrigger value="timesheets">
            <Clock className="h-4 w-4 mr-2" />
            My Timesheets
          </TabsTrigger>
          <TabsTrigger value="approvals">
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve Timesheets
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="h-4 w-4 mr-2" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* ==================== DASHBOARD TAB ==================== */}
        <TabsContent value="dashboard" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeEmployees}</div>
                  <p className="text-xs text-muted-foreground">
                    {employees.length - activeEmployees} inactive
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {isAdvisory ? 'Active Projects' : 'Teams'}
                  </CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isAdvisory ? projects.length : teams.length}
          </div>
                  <p className="text-xs text-muted-foreground">
                    Organizational units
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingTimesheets}</div>
                  <p className="text-xs text-muted-foreground">
                    Timesheets awaiting review
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ready for Payroll</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{approvedTimesheets}</div>
                  <p className="text-xs text-muted-foreground">
                    {totalPendingHours.toFixed(1)} hours
                  </p>
                </CardContent>
              </Card>
        </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common employee management tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-3">
                  <Button onClick={() => setCreateEmployeeModal(true)} className="w-full">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Employee
                  </Button>
                  <Button
                    onClick={() => isAdvisory ? setCreateProjectModal(true) : setCreateTeamModal(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {isAdvisory ? 'Create Project' : 'Create Team'}
                  </Button>
                  <Button onClick={() => setCreateTimesheetModal(true)} variant="outline" className="w-full">
                    <Clock className="h-4 w-4 mr-2" />
                    New Timesheet
                  </Button>
          </div>
              </CardContent>
            </Card>

            {/* Pending Approvals - FOR MANAGERS/PARTNERS */}
            {pendingTimesheets > 0 && (
              <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950">
                <CardHeader>
                  <CardTitle className="text-yellow-900 dark:text-yellow-100 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Timesheets Awaiting Your Approval ({pendingTimesheets})
                  </CardTitle>
                  <CardDescription className="text-yellow-700 dark:text-yellow-300">
                    {isAdvisory 
                      ? 'Note: Student timesheets are approved by project leads in the Project Dashboard'
                      : 'Review and approve your team members\' timesheets'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {timesheets
                      .filter(t => t.status === 'submitted')
                      .map((ts, idx) => (
                        <motion.div
                          key={ts.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center justify-between p-4 border-2 rounded-lg hover:bg-background/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-lg">{ts.employee_name}</p>
                              <Badge variant="outline">{ts.total_hours.toFixed(1)}h</Badge>
              </div>
                            <p className="text-sm text-muted-foreground">
                              Week of {new Date(ts.pay_period_start).toLocaleDateString()} - {new Date(ts.pay_period_end).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Submitted {new Date(ts.submitted_date!).toLocaleDateString()} • {ts.entries_count} days logged
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={async () => {
                                const timesheet = await (await fetch(`/api/timesheets/${ts.id}`)).json();
                                setSelectedTimesheet(timesheet);
                                setTimesheetEntries(timesheet.entries || []);
                                setTimesheetDetailModal(true);
                              }}
                              variant="outline"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApproveTimesheet(ts.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectTimesheet(ts.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </motion.div>
                      ))}
          </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </TabsContent>

        {/* ==================== EMPLOYEES TAB ==================== */}
        <TabsContent value="employees" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex justify-between items-center">
              <div className="flex gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
          </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Dialog open={createEmployeeModal} onOpenChange={setCreateEmployeeModal}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Employee
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Employee</DialogTitle>
                    <DialogDescription>Create a new employee record</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateEmployee} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name *</Label>
                        <Input
                          required
                          value={newEmployee.name}
                          onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input
                          required
                          type="email"
                          value={newEmployee.email}
                          onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                          placeholder="john@example.com"
                        />
        </div>
      </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Job Title</Label>
                        <Input
                          value={newEmployee.title}
                          onChange={(e) => setNewEmployee({ ...newEmployee, title: e.target.value })}
                          placeholder="Software Engineer"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Input
                          value={newEmployee.role}
                          onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                          placeholder="Developer"
                        />
            </div>
          </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Classification</Label>
                        <Select
                          value={newEmployee.classification}
                          onValueChange={(value) => setNewEmployee({ ...newEmployee, classification: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select classification" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="executive">Executive</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="contractor">Contractor</SelectItem>
                            <SelectItem value="intern">Intern</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Employment Type</Label>
                        <Select
                          value={newEmployee.employment_type}
                          onValueChange={(value) => setNewEmployee({ ...newEmployee, employment_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full_time">Full Time</SelectItem>
                            <SelectItem value="part_time">Part Time</SelectItem>
                            <SelectItem value="contractor">Contractor</SelectItem>
                            <SelectItem value="intern">Intern</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={newEmployee.start_date}
                          onChange={(e) => setNewEmployee({ ...newEmployee, start_date: e.target.value })}
                        />
                      </div>
                      {!isAdvisory && (
                        <div className="space-y-2">
                          <Label>Team (Optional)</Label>
                          <Select
                            value={newEmployee.team_id || 'none'}
                            onValueChange={(value) => setNewEmployee({ ...newEmployee, team_id: value === 'none' ? '' : value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="No team" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Team</SelectItem>
                              {teams.map(t => (
                                <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {/* Compensation Section */}
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-semibold mb-3">Compensation</h4>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Compensation Type</Label>
                          <Select
                            value={newEmployee.compensation_type}
                            onValueChange={(value) => setNewEmployee({ ...newEmployee, compensation_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="salary">Salary (Annual)</SelectItem>
                              <SelectItem value="hourly">Hourly Rate</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {newEmployee.compensation_type === 'hourly' ? (
                          <div className="space-y-2">
                            <Label>Hourly Rate</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                              <Input
                                type="number"
                                step="0.01"
                                value={newEmployee.hourly_rate}
                                onChange={(e) => setNewEmployee({ ...newEmployee, hourly_rate: e.target.value })}
                                placeholder="25.00"
                                className="pl-7"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Used to calculate payroll from approved timesheets
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label>Annual Salary</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                              <Input
                                type="number"
                                value={newEmployee.annual_salary}
                                onChange={(e) => setNewEmployee({ ...newEmployee, annual_salary: e.target.value })}
                                placeholder="75000"
                                className="pl-7"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Will be divided by 2080 hours for payroll calculations
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setCreateEmployeeModal(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        Create Employee
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Employee Directory</CardTitle>
                <CardDescription>
                  {filteredEmployees.length} {filteredEmployees.length === 1 ? 'employee' : 'employees'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="text-center p-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Employees Found</h3>
                    <p className="text-muted-foreground mb-4">
                      {employees.length === 0
                        ? 'Add your first employee to get started'
                        : 'No employees match your search criteria'}
                    </p>
                    {employees.length === 0 && (
                      <Button onClick={() => setCreateEmployeeModal(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add First Employee
                      </Button>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Classification</TableHead>
                        <TableHead>Type</TableHead>
                        {!isAdvisory && <TableHead>Team</TableHead>}
                        {isAdvisory && <TableHead>Projects</TableHead>}
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {filteredEmployees.map((emp, index) => (
                          <motion.tr
                            key={emp.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ delay: index * 0.03 }}
                            className="hover:bg-muted/50"
                          >
                            <TableCell className="font-medium">{emp.name}</TableCell>
                            <TableCell className="text-muted-foreground">{emp.email}</TableCell>
                            <TableCell>{emp.title || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {emp.classification || 'staff'}
                              </Badge>
                            </TableCell>
                            <TableCell className="capitalize">
                              {emp.employment_type?.replace('_', ' ') || '-'}
                            </TableCell>
                            {!isAdvisory && (
                              <TableCell>{emp.team_name || 'No Team'}</TableCell>
                            )}
            {isAdvisory && (
                              <TableCell>
                                {emp.projects && emp.projects.length > 0 ? (
                                  <span className="text-sm">
                                    {emp.projects.length} {emp.projects.length === 1 ? 'project' : 'projects'}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">No projects</span>
                                )}
                              </TableCell>
                            )}
                            <TableCell>{getStatusBadge(emp.status)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
          </div>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ==================== TEAMS/PROJECTS TAB ==================== */}
        <TabsContent value={isAdvisory ? 'projects' : 'teams'} className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                {isAdvisory ? 'Projects & Student Teams' : 'Teams & Org Structure'}
              </h2>
              <Dialog
                open={isAdvisory ? createProjectModal : createTeamModal}
                onOpenChange={isAdvisory ? setCreateProjectModal : setCreateTeamModal}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {isAdvisory ? 'Create Project' : 'Create Team'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{isAdvisory ? 'Create Project' : 'Create Team'}</DialogTitle>
                    <DialogDescription>
                      {isAdvisory 
                        ? 'Create a new project for student employees'
                        : 'Create a new team for organizing employees'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={isAdvisory ? handleCreateProject : handleCreateTeam} className="space-y-4">
                    <div className="space-y-2">
                      <Label>{isAdvisory ? 'Project' : 'Team'} Name *</Label>
                      <Input
                        required
                        value={isAdvisory ? newProject.name : newTeam.name}
                        onChange={(e) =>
                          isAdvisory
                            ? setNewProject({ ...newProject, name: e.target.value })
                            : setNewTeam({ ...newTeam, name: e.target.value })
                        }
                        placeholder={isAdvisory ? 'Website Redesign' : 'Engineering'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={isAdvisory ? newProject.description : newTeam.description}
                        onChange={(e) =>
                          isAdvisory
                            ? setNewProject({ ...newProject, description: e.target.value })
                            : setNewTeam({ ...newTeam, description: e.target.value })
                        }
                        placeholder="Brief description..."
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          isAdvisory ? setCreateProjectModal(false) : setCreateTeamModal(false)
                        }
                      >
                        Cancel
                      </Button>
                      <Button type="submit">
                        Create {isAdvisory ? 'Project' : 'Team'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
        </div>

            {isAdvisory ? (
              /* ADVISORY PROJECTS VIEW */
              <div className="grid gap-4">
                {projects.length === 0 ? (
                  <Card>
                    <CardContent className="text-center p-12">
                      <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">No Projects Yet</p>
                      <p className="text-sm text-muted-foreground">
                        Create your first project to organize student employees
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  projects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
          <div>
                              <CardTitle className="flex items-center gap-2">
                                <Briefcase className="h-5 w-5" />
                                {project.name}
                              </CardTitle>
                              <CardDescription>{project.description}</CardDescription>
                </div>
                            <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                              {project.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2 flex items-center gap-2">
                                <Award className="h-4 w-4" />
                                Project Leads
                              </h4>
                              {project.leads && project.leads.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {project.leads.map(lead => (
                                    <Badge key={lead.id} variant="secondary" className="text-sm">
                                      {lead.employee_name} ({lead.role})
                                    </Badge>
                                  ))}
            </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No leads assigned</p>
                              )}
                              <Button variant="outline" size="sm" className="mt-2">
                                <Plus className="h-3 w-3 mr-1" />
                                Add Lead
                              </Button>
          </div>

                            <div>
                              <h4 className="font-semibold mb-2 flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Student Employees
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {project.student_count} students on this project
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Auto-created when students are onboarded
                              </p>
            </div>
          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
        </div>
            ) : (
              /* REGULAR TEAMS VIEW */
              <div className="grid gap-4 md:grid-cols-2">
                {teams.length === 0 ? (
                  <Card className="col-span-2">
                    <CardContent className="text-center p-12">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">No Teams Yet</p>
                      <p className="text-sm text-muted-foreground">
                        Create your first team to organize employees
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  teams.map((team, index) => (
                    <motion.div
                      key={team.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            {team.name}
                          </CardTitle>
                          <CardDescription>{team.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-2xl font-bold">{team.employee_count || 0}</p>
                              <p className="text-sm text-muted-foreground">Team members</p>
      </div>
                            {team.lead_name && (
                              <div className="text-right">
                                <p className="text-sm font-medium">{team.lead_name}</p>
                                <p className="text-xs text-muted-foreground">Team Lead</p>
    </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </TabsContent>

        {/* ==================== MY TIMESHEETS TAB (Personal Entry) ==================== */}
        <TabsContent value="timesheets" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {!currentEmployee ? (
              <Card className="border-yellow-200">
                <CardContent className="p-6">
                  <p className="text-muted-foreground">
                    You need to be added as an employee first. Email: {currentUserEmail}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Week Navigation */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          My Timesheet - {currentEmployee.name}
                        </CardTitle>
                        <CardDescription>
                          Week of {new Date(currentWeekStart).toLocaleDateString()} - {new Date(new Date(currentWeekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                          Previous Week
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                          Next Week
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Weekly Entry Grid */}
                    {weeklyEntries.map((entry, index) => {
                      const isWeekend = entry.dayName === 'Saturday' || entry.dayName === 'Sunday';
                      
                      return (
                        <motion.div
                          key={entry.date}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`border-2 rounded-lg p-4 ${
                            isWeekend ? 'bg-muted/30 border-muted' : 'bg-background border-border'
                          } ${entry.worked ? 'border-primary/50' : ''}`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex items-center gap-3 min-w-[200px]">
                              <Checkbox
                                checked={entry.worked}
                                onCheckedChange={(checked) => {
                                  const updated = [...weeklyEntries];
                                  updated[index].worked = !!checked;
                                  if (!checked) {
                                    updated[index].hours = 0;
                                    updated[index].project_team_id = '';
                                    updated[index].task_description = '';
                                  }
                                  setWeeklyEntries(updated);
                                }}
                              />
                              <div>
                                <p className="font-semibold">{entry.dayName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(entry.date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            
                            {entry.worked ? (
                              <div className="flex-1 grid grid-cols-12 gap-3">
                                <div className="col-span-2">
                                  <Label className="text-xs">Hours</Label>
                                  <Input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="24"
                                    value={entry.hours || ''}
                                    onChange={(e) => {
                                      const updated = [...weeklyEntries];
                                      updated[index].hours = parseFloat(e.target.value) || 0;
                                      setWeeklyEntries(updated);
                                    }}
                                    className="text-center font-semibold"
                                    placeholder="0.0"
                                  />
                                </div>
                                <div className="col-span-4">
                                  <Label className="text-xs">Project/Team</Label>
                                  <Select
                                    value={entry.project_team_id || 'none'}
                                    onValueChange={(value) => {
                                      const updated = [...weeklyEntries];
                                      updated[index].project_team_id = value === 'none' ? '' : value;
                                      setWeeklyEntries(updated);
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">General</SelectItem>
                                      {isAdvisory ? (
                                        projects.map(p => (
                                          <SelectItem key={`proj-${p.id}`} value={`proj-${p.id}`}>
                                            {p.name}
                                          </SelectItem>
                                        ))
                                      ) : (
                                        teams.map(t => (
                                          <SelectItem key={`team-${t.id}`} value={`team-${t.id}`}>
                                            {t.name}
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="col-span-6">
                                  <Label className="text-xs">What did you work on?</Label>
                                  <Textarea
                                    value={entry.task_description}
                                    onChange={(e) => {
                                      const updated = [...weeklyEntries];
                                      updated[index].task_description = e.target.value;
                                      setWeeklyEntries(updated);
                                    }}
                                    placeholder="e.g., Board meeting prep, student project reviews, financial close..."
                                    className="text-sm resize-none"
                                    rows={1}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1 flex items-center">
                                <p className="text-sm text-muted-foreground italic">
                                  {isWeekend ? '(Weekend)' : '(Day Off)'}
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                    
                    {/* Total Summary */}
                    <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border-2 border-primary/30">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Hours This Week</p>
                        <p className="text-3xl font-bold">
                          {weeklyEntries.reduce((sum, e) => sum + (e.worked ? e.hours : 0), 0).toFixed(1)}h
                        </p>
                        {weeklyEntries.reduce((sum, e) => sum + (e.worked ? e.hours : 0), 0) > 40 && (
                          <p className="text-xs text-orange-600 font-medium mt-1">
                            ⚠ {(weeklyEntries.reduce((sum, e) => sum + (e.worked ? e.hours : 0), 0) - 40).toFixed(1)}h overtime
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="lg">
                          <FileText className="h-4 w-4 mr-2" />
                          Save Draft
                        </Button>
                        <Button size="lg">
                          Submit for Approval →
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Past Timesheets */}
                <Card>
                  <CardHeader>
                    <CardTitle>My Timesheet History</CardTitle>
                    <CardDescription>Your submitted and approved timesheets</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {timesheets.filter(t => t.employee_id === currentEmployee.id).length === 0 ? (
                      <div className="text-center p-8 text-muted-foreground">
                        <p>No past timesheets yet</p>
                        <p className="text-sm">Fill out your first week above!</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {timesheets
                          .filter(t => t.employee_id === currentEmployee.id)
                          .slice(0, 5)
                          .map(ts => (
                            <div
                              key={ts.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                            >
                              <div>
                                <p className="font-medium">
                                  Week of {new Date(ts.pay_period_start).toLocaleDateString()}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {ts.total_hours.toFixed(1)} hours • {ts.status}
                                </p>
                              </div>
                              {getStatusBadge(ts.status)}
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </motion.div>
        </TabsContent>

        {/* ==================== APPROVE TIMESHEETS TAB (Review Others) ==================== */}
        <TabsContent value="approvals" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Approve Team Member Timesheets</h2>
                <p className="text-muted-foreground">
                  Review and approve timesheets submitted by other employees
                </p>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {timesheets.filter(t => t.status === 'submitted' && t.employee_id !== currentEmployee?.id).length} Pending
              </Badge>
            </div>

            {timesheets.filter(t => t.status === 'submitted' && t.employee_id !== currentEmployee?.id).length === 0 ? (
              <Card>
                <CardContent className="text-center p-12">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Timesheets Pending</h3>
                  <p className="text-muted-foreground">
                    All team member timesheets have been reviewed!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {timesheets
                  .filter(t => t.status === 'submitted' && t.employee_id !== currentEmployee?.id)
                  .map((ts, idx) => (
                    <motion.div
                      key={ts.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card className="border-2 border-yellow-200 dark:border-yellow-800">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                {ts.employee_name}
                                <Badge variant="outline" className="text-lg">
                                  {ts.total_hours.toFixed(1)}h
                                </Badge>
                                {ts.total_hours > 40 && (
                                  <Badge variant="destructive" className="text-sm">
                                    {(ts.total_hours - 40).toFixed(1)}h overtime
                                  </Badge>
                                )}
                              </CardTitle>
                              <CardDescription>
                                Week of {new Date(ts.pay_period_start).toLocaleDateString()} - {new Date(ts.pay_period_end).toLocaleDateString()}
                              </CardDescription>
                              <p className="text-xs text-muted-foreground mt-1">
                                Submitted {new Date(ts.submitted_date!).toLocaleDateString()} • {ts.entries_count} days logged
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={async () => {
                                  const timesheet = await (await fetch(`/api/timesheets/${ts.id}`)).json();
                                  setSelectedTimesheet(timesheet);
                                  setTimesheetEntries(timesheet.entries || []);
                                  setTimesheetDetailModal(true);
                                }}
                                variant="outline"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                              <Button
                                onClick={() => handleApproveTimesheet(ts.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                onClick={() => handleRejectTimesheet(ts.id)}
                                variant="destructive"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    </motion.div>
                  ))}
              </div>
            )}

            {/* Policy Reminders for Approvers */}
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
              <CardHeader>
                <CardTitle className="text-blue-900 dark:text-blue-100">
                  Approval Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Review timesheets within 2 business days</li>
                  <li>• Verify hours are reasonable and match project timelines</li>
                  <li>• Check for overtime authorization (over 40h/week)</li>
                  <li>• Provide clear reasons if rejecting</li>
                  <li>• Cannot approve your own timesheet</li>
                  <li>• Approved timesheets go to Finance for payroll processing</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ==================== REPORTS TAB ==================== */}
        <TabsContent value="reports" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold">Employee Reports</h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Headcount Report</CardTitle>
                  <CardDescription>Employee counts by type, team, and status</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Headcount
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Timesheet Summary</CardTitle>
                  <CardDescription>Hours by employee, project, and pay period</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Summary
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payroll Export</CardTitle>
                  <CardDescription>Approved timesheets ready for payroll processing</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export to Payroll
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Turnover Analysis</CardTitle>
                  <CardDescription>Hiring and separation trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Analysis
                  </Button>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* ==================== TIMESHEET DETAIL MODAL ==================== */}
      <Dialog open={timesheetDetailModal} onOpenChange={setTimesheetDetailModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Timesheet - {selectedTimesheet?.employee_name}
            </DialogTitle>
            <DialogDescription>
              Pay Period: {selectedTimesheet?.pay_period_start} to {selectedTimesheet?.pay_period_end}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTimesheet && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                  <p className="text-2xl font-bold">
                    {timesheetEntries.reduce((sum, e) => sum + (e.hours || 0), 0).toFixed(1)}h
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedTimesheet.status)}
                </div>
              </div>

              {/* Weekly Entry Grid */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Date</TableHead>
                      <TableHead className="w-32">Day</TableHead>
                      <TableHead>Hours</TableHead>
                      {isAdvisory && <TableHead>Project</TableHead>}
                      {!isAdvisory && <TableHead>Team</TableHead>}
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timesheetEntries.map((entry, index) => {
                      const date = new Date(entry.entry_date);
                      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                      const isWeekend = dayName === 'Sat' || dayName === 'Sun';
                      
  return (
                        <TableRow key={index} className={isWeekend ? 'bg-muted/30' : ''}>
                          <TableCell className="font-mono text-sm">
                            {new Date(entry.entry_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={isWeekend ? 'secondary' : 'outline'}>{dayName}</Badge>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.5"
                              min="0"
                              max="24"
                              value={entry.hours || ''}
                              onChange={(e) => {
                                const newEntries = [...timesheetEntries];
                                newEntries[index].hours = parseFloat(e.target.value) || 0;
                                setTimesheetEntries(newEntries);
                              }}
                              className="w-24"
                              disabled={selectedTimesheet.status !== 'draft'}
                            />
                          </TableCell>
                          {isAdvisory && (
                            <TableCell>
                              <Select
                                value={entry.project_id?.toString() || ''}
                                onValueChange={(value) => {
                                  const newEntries = [...timesheetEntries];
                                  newEntries[index].project_id = value ? parseInt(value) : undefined;
                                  setTimesheetEntries(newEntries);
                                }}
                                disabled={selectedTimesheet.status !== 'draft'}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select project" />
                                </SelectTrigger>
                                <SelectContent>
                                  {projects.map(p => (
                                    <SelectItem key={p.id} value={p.id.toString()}>
                                      {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          )}
                          {!isAdvisory && (
                            <TableCell>
                              <Select
                                value={entry.team_id?.toString() || ''}
                                onValueChange={(value) => {
                                  const newEntries = [...timesheetEntries];
                                  newEntries[index].team_id = value ? parseInt(value) : undefined;
                                  setTimesheetEntries(newEntries);
                                }}
                                disabled={selectedTimesheet.status !== 'draft'}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select team" />
                                </SelectTrigger>
                                <SelectContent>
                                  {teams.map(t => (
                                    <SelectItem key={t.id} value={t.id.toString()}>
                                      {t.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          )}
                          <TableCell>
                            <Input
                              value={entry.notes || ''}
                              onChange={(e) => {
                                const newEntries = [...timesheetEntries];
                                newEntries[index].notes = e.target.value;
                                setTimesheetEntries(newEntries);
                              }}
                              placeholder="Optional notes..."
                              disabled={selectedTimesheet.status !== 'draft'}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
    </div>

              {selectedTimesheet.status === 'draft' && (
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={handleSaveTimesheetEntries} className="flex-1">
                    Save Draft
                  </Button>
                  <Button onClick={handleSubmitTimesheet} className="flex-1">
                    Submit for Approval
                  </Button>
                </div>
              )}

              {selectedTimesheet.status === 'rejected' && selectedTimesheet.rejection_reason && (
                <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 rounded-lg">
                  <p className="font-semibold text-red-900 dark:text-red-100 mb-1">
                    Rejection Reason:
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedTimesheet.rejection_reason}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* System Info Card */}
      {isAdvisory && (
        <Card className="border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950">
          <CardHeader>
            <CardTitle className="text-purple-900 dark:text-purple-100 flex items-center gap-2">
              <Target className="h-5 w-5" />
              NGI Capital Advisory - Special Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold mb-1">Project-Based Structure:</p>
                <p className="text-muted-foreground">
                  Unlike other entities that use teams, Advisory uses PROJECTS with project leads and student employees.
                </p>
              </div>
              <div>
                <p className="font-semibold mb-1">Auto-Employee Creation:</p>
                <p className="text-muted-foreground">
                  When students are onboarded to projects, they are automatically created as employees 
                  and linked to their student records. No manual entry needed!
                </p>
              </div>
              <div>
                <p className="font-semibold mb-1">Timesheet Integration:</p>
                <p className="text-muted-foreground">
                  Student employees submit timesheets per project. Project leads approve. 
                  Finance exports to payroll for payment processing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
        </motion.div>
      </div>
    </div>
  );
}
