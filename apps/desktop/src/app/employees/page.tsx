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
  Edit,
  Trash2,
  UserPlus,
  Target,
  Award,
  Loader2,
  Save,
  ChevronDown,
  Send,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useEntity } from '@/lib/context/UnifiedEntityContext';
import { EntitySelector } from '@/components/common/EntitySelector';
import { useUser } from '@clerk/nextjs';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { MultiSelect } from '@/components/ui/multi-select';
import { ModuleHeader } from '@ngi/ui/components/layout';
import { toast } from 'sonner';

// Interfaces
interface Employee {
  id: number;
  name: string;
  email: string;
  title?: string;
  role?: string;
  classification?: string;
  status?: string;
  employment_type?: string;
  start_date?: string;
  end_date?: string;
  team_id?: number;
  team_name?: string;
  team_ids?: number[];
  team_names?: string[];
  projects?: Array<{ id: number; name: string }>;
  compensation_type?: string;
  hourly_rate?: number;
  annual_salary?: number;
}

interface Team {
  id: number;
  name: string;
  description: string;
  employee_count: number;
  lead_name?: string;
  is_active?: boolean;
  type?: string;
  lead_employee_id?: number;
}

interface Project {
  id: number;
  name?: string; // For regular projects
  project_name?: string; // For advisory projects
  description: string;
  status: string;
  student_count: number;
  leads?: Array<{ id: number; employee_name: string; role: string }>;
  // Advisory project properties
  summary?: string;
  client_name?: string;
  team_size?: number;
  assigned_count?: number;
  default_hourly_rate?: number;
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
  const [activeTab, setActiveTab] = useState('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Entity detection
  const isAdvisory = selectedEntity?.entity_name?.toLowerCase().includes('advisory') || false;
  
  // Modals
  const [createEmployeeModal, setCreateEmployeeModal] = useState(false);
  const [editEmployeeModal, setEditEmployeeModal] = useState(false);
  const [createTimesheetModal, setCreateTimesheetModal] = useState(false);
  const [timesheetDetailModal, setTimesheetDetailModal] = useState(false);
  const [createTeamModal, setCreateTeamModal] = useState(false);
  const [editTeamModal, setEditTeamModal] = useState(false);
  const [teamsDropdownOpen, setTeamsDropdownOpen] = useState(false);
  
  // Selected items
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>([]);
  
  // Time block selection states
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [selectedTimeBlock, setSelectedTimeBlock] = useState<any>(null);
  const [timeBlockEditModal, setTimeBlockEditModal] = useState(false);
  const [dayModal, setDayModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [resizingBlock, setResizingBlock] = useState<any>(null);
  const [resizeType, setResizeType] = useState<'top' | 'bottom' | null>(null);
  const [editingTimeBlock, setEditingTimeBlock] = useState<any>(null);
  const [currentTeamId, setCurrentTeamId] = useState<string>('');
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [currentDescription, setCurrentDescription] = useState<string>('');
  
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
    team_ids: [] as string[],
    compensation_type: 'salary',
    hourly_rate: '',
    annual_salary: ''
  });
  
  // Timesheet creation form
  const [newTimesheet, setNewTimesheet] = useState({
    employee_id: '',
    pay_period_start: '',
    pay_period_end: ''
  });

  // Team creation form
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    type: '',
    lead_employee_id: ''
  });
  
  const [newTimesheetEntries, setNewTimesheetEntries] = useState<TimesheetEntry[]>([]);
  
  // Handle compensation type change
  const handleCompensationTypeChange = (type: string) => {
    setNewEmployee(prev => ({
      ...prev,
      compensation_type: type,
      // Clear the other field when switching types
      hourly_rate: type === 'hourly' ? prev.hourly_rate : '',
      annual_salary: type === 'salary' ? prev.annual_salary : ''
    }));
  };
  
  // My Timesheets personal entry
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const saturday = new Date(today);
    
    // Find the Saturday of the current week
    const dayOfWeek = today.getDay();
    const daysToSubtract = (dayOfWeek + 1) % 7;
    saturday.setDate(today.getDate() - daysToSubtract);
    
    return saturday.toISOString().split('T')[0];
  });

  // Check if current week can be submitted (Friday 3pm or later)
  const canSubmitCurrentWeek = () => {
    const now = new Date();
    const friday = new Date(currentWeekStart);
    friday.setDate(friday.getDate() + 6); // Friday is 6 days after Saturday
    friday.setHours(15, 0, 0, 0); // 3:00 PM
    
    return now >= friday;
  };
  
  const [weeklyEntries, setWeeklyEntries] = useState<Array<{
    date: string;
    dayName: string;
    worked: boolean;
    hours: number;
    project_team_id: string;
    task_description: string;
    timeBlocks?: any[];
  }>>([]);

  useEffect(() => {
    if (selectedEntityId) {
      fetchAllData();
      generateWeeklyEntries();
    }
  }, [selectedEntityId, currentWeekStart]);

  // Prevent auto-focus on name field when edit modal opens
  useEffect(() => {
    if (editEmployeeModal) {
      // Small delay to ensure the modal is fully rendered
      setTimeout(() => {
        const nameInput = document.querySelector('input[placeholder="John Doe"]') as HTMLInputElement;
        if (nameInput) {
          nameInput.blur();
        }
      }, 100);
    }
  }, [editEmployeeModal]);

  // Close teams dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (teamsDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('[data-teams-dropdown]')) {
          setTeamsDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [teamsDropdownOpen]);

  // Prevent auto-focus on team name field when edit team modal opens
  useEffect(() => {
    if (editTeamModal) {
      // Small delay to ensure the modal is fully rendered
      setTimeout(() => {
        const nameInput = document.querySelector('input[placeholder="Engineering Team"]') as HTMLInputElement;
        if (nameInput) {
          nameInput.blur();
        }
      }, 100);
    }
  }, [editTeamModal]);

  // Keyboard event handler for delete key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Check if user is typing in the description field
        const activeElement = document.activeElement;
        const isTypingInDescription = activeElement && (
          activeElement.tagName === 'TEXTAREA' || 
          activeElement.getAttribute('role') === 'textbox' ||
          (activeElement as HTMLElement).contentEditable === 'true'
        );
        
        // Only delete time block if not typing in description field
        if (editingTimeBlock && selectedDay && !isTypingInDescription) {
          // Remove the time block
          const updatedDay = {
            ...selectedDay,
            timeBlocks: selectedDay.timeBlocks.filter((block: any) => block.id !== editingTimeBlock.id),
            hours: selectedDay.timeBlocks
              .filter((block: any) => block.id !== editingTimeBlock.id)
              .reduce((sum: number, block: any) => sum + (block.hours || 0), 0)
          };
          setSelectedDay(updatedDay);
          
          // Update weekly entries
          const updatedEntries = weeklyEntries.map(entry => 
            entry.date === selectedDay.date ? updatedDay : entry
          );
          setWeeklyEntries(updatedEntries);
          
          // Clear editing state
          setEditingTimeBlock(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingTimeBlock, selectedDay, weeklyEntries]);

  // ChatKit event listeners
  useEffect(() => {
    const handleCreateEmployee = (e: Event) => {
      const customEvent = e as CustomEvent;
      setCreateEmployeeModal(true);
      // Pre-fill form with e.detail data if available
      if (customEvent.detail) {
        console.log('Pre-filling employee form with:', customEvent.detail);
        // You can pre-fill form fields here
      }
    };


    const handleCreateTimesheet = (e: Event) => {
      const customEvent = e as CustomEvent;
      setCreateTimesheetModal(true);
      if (customEvent.detail) {
        console.log('Pre-filling timesheet form with:', customEvent.detail);
      }
    };

    const handleSubmitTimesheet = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.timesheet_id) {
        // Handle timesheet submission
        console.log('Submitting timesheet:', customEvent.detail.timesheet_id);
      }
    };
    
    window.addEventListener('nex:create_employee', handleCreateEmployee);
    window.addEventListener('nex:create_timesheet', handleCreateTimesheet);
    window.addEventListener('nex:submit_timesheet', handleSubmitTimesheet);
    
    return () => {
      window.removeEventListener('nex:create_employee', handleCreateEmployee);
      window.removeEventListener('nex:create_timesheet', handleCreateTimesheet);
      window.removeEventListener('nex:submit_timesheet', handleSubmitTimesheet);
    };
  }, []);
  
  const generateWeeklyEntries = () => {
    const start = new Date(currentWeekStart);
    const entries = [];
    
    // Hardcoded week structure: Saturday through Friday
    const dayNames = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      
      entries.push({
        date: date.toISOString().split('T')[0],
        dayName: dayNames[i], // Use hardcoded day names
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

  // Time block utility functions
  const timeToPercent = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return ((hours + minutes / 60) / 24) * 100;
  };

  const percentToTime = (percent: number) => {
    const totalMinutes = Math.round((percent / 100) * 24 * 60);
    // Cap at 23:59 (11:59 PM)
    const cappedMinutes = Math.min(totalMinutes, 23 * 60 + 59);
    const hours = Math.floor(cappedMinutes / 60);
    const minutes = cappedMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatTimeWithAmPm = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const snapToGrid = (percent: number) => {
    // Snap to 15-minute intervals
    const totalMinutes = Math.round((percent / 100) * 24 * 60);
    const snappedMinutes = Math.round(totalMinutes / 15) * 15;
    return (snappedMinutes / (24 * 60)) * 100;
  };

  const checkOverlap = (startTime: string, endTime: string, excludeId?: string) => {
    const startPercent = timeToPercent(startTime);
    const endPercent = timeToPercent(endTime);
    
    return weeklyEntries.some(entry => {
      if (!entry.timeBlocks) return false;
      return entry.timeBlocks.some((block: any) => {
        if (excludeId && block.id === excludeId) return false;
        const blockStart = timeToPercent(block.startTime);
        const blockEnd = timeToPercent(block.endTime);
        return !(endPercent <= blockStart || startPercent >= blockEnd);
      });
    });
  };

  const handleTimelineMouseDown = (e: React.MouseEvent, entry: any, entryIndex: number) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    // Account for padding (1.5rem = 24px) - subtract padding from y and adjust calculation
    const paddingPx = 24; // 1.5rem in pixels
    const adjustedY = Math.max(0, y - paddingPx);
    const timelineHeight = rect.height - (paddingPx * 2); // Subtract top and bottom padding
    const percent = snapToGrid((adjustedY / timelineHeight) * 100);
    
    setIsSelecting(true);
    setSelectionStart(percent);
    setSelectionEnd(percent);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent) => {
    if (resizingBlock && resizeType) {
      // Handle resize
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      
      // Account for padding (1.5rem = 24px)
      const paddingPx = 24;
      const adjustedY = Math.max(0, y - paddingPx);
      const timelineHeight = rect.height - (paddingPx * 2);
      const percent = snapToGrid((adjustedY / timelineHeight) * 100);
      
      const updatedDay = {
        ...selectedDay,
        timeBlocks: selectedDay.timeBlocks.map((block: any) => {
          if (block.id === resizingBlock.id) {
            if (resizeType === 'top') {
              const newStartTime = percentToTime(percent);
              const newHours = (timeToPercent(block.endTime) - percent) / 100 * 24;
              return {
                ...block,
                startTime: newStartTime,
                hours: newHours
              };
            } else {
              const newEndTime = percentToTime(percent);
              const newHours = (percent - timeToPercent(block.startTime)) / 100 * 24;
              return {
                ...block,
                endTime: newEndTime,
                hours: newHours
              };
            }
          }
          return block;
        })
      };
      
      // Recalculate total hours
      updatedDay.hours = updatedDay.timeBlocks.reduce((sum: number, block: any) => sum + block.hours, 0);
      setSelectedDay(updatedDay);
      
      // Update weekly entries
      const updatedEntries = weeklyEntries.map(entry => 
        entry.date === selectedDay.date ? updatedDay : entry
      );
      setWeeklyEntries(updatedEntries);
      
      return;
    }
    
    if (!isSelecting || selectionStart === null) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    // Account for padding (1.5rem = 24px)
    const paddingPx = 24;
    const adjustedY = Math.max(0, y - paddingPx);
    const timelineHeight = rect.height - (paddingPx * 2);
    const percent = snapToGrid((adjustedY / timelineHeight) * 100);
    
    setSelectionEnd(percent);
  };

  const handleTimelineMouseUp = (entry: any, entryIndex: number) => {
    if (!isSelecting || selectionStart === null || selectionEnd === null) {
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }

    const startPercent = Math.min(selectionStart, selectionEnd);
    const endPercent = Math.max(selectionStart, selectionEnd);
    
    if (endPercent - startPercent < 1) { // Minimum 15 minutes
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }

    const startTime = percentToTime(startPercent);
    const endTime = percentToTime(endPercent);
    
    if (checkOverlap(startTime, endTime)) {
      alert('Time blocks cannot overlap!');
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }

    // Get current team/project info
    const isProject = currentProjectId.startsWith('project_');
    const team = teams.find(t => t.id.toString() === currentTeamId);
    const project = projects.find(p => p.id.toString() === (isProject ? currentProjectId.replace('project_', '') : ''));
    
    const newBlock = {
      id: Date.now(),
      startTime,
      endTime,
      hours: (endPercent - startPercent) / 100 * 24,
      teamId: isProject ? '' : currentTeamId,
      teamName: isProject ? '' : (team?.name || ''),
      projectId: isProject ? currentProjectId.replace('project_', '') : '',
      projectName: isProject ? (project?.name || '') : '',
      description: currentDescription
    };

    // Add time block to entry
    const updated = [...weeklyEntries];
    if (!updated[entryIndex].timeBlocks) {
      updated[entryIndex].timeBlocks = [];
    }
    updated[entryIndex].timeBlocks.push(newBlock);
    updated[entryIndex].hours = updated[entryIndex].timeBlocks.reduce((sum: number, block: any) => sum + block.hours, 0);
    updated[entryIndex].worked = updated[entryIndex].hours > 0;
    setWeeklyEntries(updated);

    // Set the new block as the editing block so the dropdown aligns
    setEditingTimeBlock(newBlock);
    
    // Update selectedDay to include the new block
    const updatedDay = {
      ...selectedDay,
      timeBlocks: updated[entryIndex].timeBlocks
    };
    setSelectedDay(updatedDay);

    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const handleDayModalMouseUp = () => {
    if (resizingBlock && resizeType) {
      // Handle resize completion
      setResizingBlock(null);
      setResizeType(null);
      return;
    }

    if (!isSelecting || selectionStart === null || selectionEnd === null || !selectedDay) {
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }

    const startPercent = Math.min(selectionStart, selectionEnd);
    const endPercent = Math.max(selectionStart, selectionEnd);
    
    if (endPercent - startPercent < 1) { // Minimum 15 minutes
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }

    const startTime = percentToTime(startPercent);
    const endTime = percentToTime(endPercent);
    
    // Get current team/project info
    const isProject = currentProjectId.startsWith('project_');
    const team = teams.find(t => t.id.toString() === currentTeamId);
    const project = projects.find(p => p.id.toString() === (isProject ? currentProjectId.replace('project_', '') : ''));
    
    const newBlock = {
      id: Date.now(),
      startTime,
      endTime,
      hours: (endPercent - startPercent) / 100 * 24,
      teamId: isProject ? '' : currentTeamId,
      teamName: isProject ? '' : (team?.name || ''),
      projectId: isProject ? currentProjectId.replace('project_', '') : '',
      projectName: isProject ? (project?.name || '') : '',
      description: currentDescription
    };
    
    console.log('Creating new time block:', newBlock);

    // Add time block to selected day
    const updatedDay = {
      ...selectedDay,
      timeBlocks: [...(selectedDay.timeBlocks || []), newBlock],
      hours: (selectedDay.hours || 0) + newBlock.hours,
      worked: true
    };
    setSelectedDay(updatedDay);

    // Update weekly entries
    const updatedEntries = weeklyEntries.map(entry => 
      entry.date === selectedDay.date ? updatedDay : entry
    );
    setWeeklyEntries(updatedEntries);

    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const handleTimelineMouseLeave = () => {
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
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
      let response;
      if (isAdvisory) {
        // Fetch students from advisory API for advisory entities
        response = await fetch('/api/advisory/students');
      } else {
        // Fetch employees from regular API for non-advisory entities
        response = await fetch(`/api/employees?entity_id=${selectedEntityId}`);
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch employees:', response.status, errorText);
        toast.error(`Failed to fetch ${isAdvisory ? 'students' : 'employees'}: ${response.status} ${errorText}`);
        setEmployees([]);
        return;
      }
      
      const data = await response.json();
      
      if (isAdvisory) {
        // Transform students data to match employee interface
        const transformedStudents = data.map((student: any) => ({
          id: student.id,
          name: `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown',
          email: student.email,
          title: student.program || 'Student',
          role: student.school || 'University',
          classification: 'student',
          status: student.status === 'alumni' ? 'active' : student.status,
          employment_type: 'student',
          start_date: null,
          team_id: null,
          team_name: null,
          team_ids: [],
          team_names: [],
          projects: [],
          compensation_type: 'hourly',
          hourly_rate: 0,
          annual_salary: 0
        }));
        setEmployees(transformedStudents);
      } else {
        setEmployees(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      toast.error(`Failed to fetch ${isAdvisory ? 'students' : 'employees'}. Please check your connection.`);
      setEmployees([]);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch(`/api/teams?entity_id=${selectedEntityId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch teams:', response.status, errorText);
        toast.error(`Failed to fetch teams: ${response.status} ${errorText}`);
        setTeams([]);
        return;
      }
      
      const data = await response.json();
      setTeams(data || []);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      toast.error('Failed to fetch teams. Please check your connection.');
      setTeams([]);
    }
  };

  const fetchProjects = async () => {
    try {
      let response;
      if (isAdvisory) {
        // Fetch projects from advisory API for advisory entities
        response = await fetch('/api/advisory/projects');
      } else {
        // Fetch projects from regular API for non-advisory entities
        response = await fetch(`/api/projects?entity_id=${selectedEntityId}`);
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch projects:', response.status, errorText);
        toast.error(`Failed to fetch projects: ${response.status} ${errorText}`);
        setProjects([]);
        return;
      }
      
      const data = await response.json();
      setProjects(data || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      toast.error('Failed to fetch projects. Please check your connection.');
      setProjects([]);
    }
  };

  const fetchTimesheets = async () => {
    try {
      const response = await fetch(`/api/timesheets?entity_id=${selectedEntityId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch timesheets:', response.status, errorText);
        toast.error(`Failed to fetch timesheets: ${response.status} ${errorText}`);
        setTimesheets([]);
        return;
      }
      
      const data = await response.json();
      setTimesheets(data.timesheets || []);
    } catch (error) {
      console.error('Failed to fetch timesheets:', error);
      toast.error('Failed to fetch timesheets. Please check your connection.');
      setTimesheets([]);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validation
    if (!newEmployee.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!newEmployee.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmployee.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setSubmitting(true);
    try {
    const payload: any = {
        entity_id: selectedEntityId,
        name: newEmployee.name.trim(),
        email: newEmployee.email.trim()
      };
      
      // Add optional fields only if they have values
      if (newEmployee.title) payload.title = newEmployee.title;
      if (newEmployee.role) payload.role = newEmployee.role;
      if (newEmployee.classification) payload.classification = newEmployee.classification;
      if (newEmployee.employment_type) payload.employment_type = newEmployee.employment_type;
      if (newEmployee.start_date) payload.start_date = newEmployee.start_date;
      if (newEmployee.team_id) payload.team_id = parseInt(newEmployee.team_id);
      
      // Multi-team support
      if (newEmployee.team_ids && newEmployee.team_ids.length > 0) {
        payload.team_ids = newEmployee.team_ids.map(id => parseInt(id));
      }
      
      // Compensation - always save both fields, even if 0
      payload.compensation_type = newEmployee.compensation_type;
      payload.hourly_rate = parseFloat(newEmployee.hourly_rate) || 0;
      payload.annual_salary = parseFloat(newEmployee.annual_salary) || 0;
      
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success('Employee created successfully!');
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
          team_ids: [],
          compensation_type: 'salary',
          hourly_rate: '',
          annual_salary: ''
        });
      } else {
        const errorText = await response.text();
        console.error('Failed to create employee:', errorText);
        toast.error(`Failed to create employee: ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to create employee:', error);
      toast.error('Failed to create employee. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validation
    if (!newTeam.name.trim()) {
      toast.error('Team name is required');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        entity_id: selectedEntityId,
        name: newTeam.name.trim(),
        description: newTeam.description.trim(),
        type: newTeam.type || null,
        lead_employee_id: newTeam.lead_employee_id ? parseInt(newTeam.lead_employee_id) : null
      };
      
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success('Team created successfully!');
        setCreateTeamModal(false);
        setNewTeam({
          name: '',
          description: '',
          type: '',
          lead_employee_id: ''
        });
        // Refresh teams list
        if (selectedEntityId) {
          fetchTeams();
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to create team:', errorText);
        toast.error(`Failed to create team: ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to create team:', error);
      toast.error('Failed to create team. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    setNewTeam({
      name: team.name,
      description: team.description || '',
      type: team.type || '',
      lead_employee_id: team.lead_employee_id?.toString() || ''
    });
    setEditTeamModal(true);
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTeam) return;
    
    // Form validation
    if (!newTeam.name.trim()) {
      toast.error('Team name is required');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        name: newTeam.name.trim(),
        description: newTeam.description.trim(),
        type: newTeam.type || null,
        lead_employee_id: newTeam.lead_employee_id ? parseInt(newTeam.lead_employee_id) : null
      };
      
      const response = await fetch(`/api/teams/${selectedTeam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success('Team updated successfully!');
        setEditTeamModal(false);
        setSelectedTeam(null);
        setNewTeam({
          name: '',
          description: '',
          type: '',
          lead_employee_id: ''
        });
        // Refresh teams list
        if (selectedEntityId) {
          fetchTeams();
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to update team:', errorText);
        toast.error(`Failed to update team: ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to update team:', error);
      toast.error('Failed to update team. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeam = async (team: Team) => {
    if (!confirm(`Are you sure you want to delete "${team.name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/teams/${team.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        toast.success('Team deleted successfully!');
        // Refresh teams list
        if (selectedEntityId) {
          fetchTeams();
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to delete team:', errorText);
        toast.error(`Failed to delete team: ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to delete team:', error);
      toast.error('Failed to delete team. Please try again.');
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    
    // Determine compensation type based on which field has a value
    let compensationType = 'salary'; // default
    
    // Check if employee has a saved compensation_type first
    if (employee.compensation_type) {
      compensationType = employee.compensation_type;
    } else if (employee.hourly_rate !== undefined && employee.hourly_rate !== null && employee.hourly_rate > 0) {
      compensationType = 'hourly';
    } else if (employee.annual_salary !== undefined && employee.annual_salary !== null && employee.annual_salary > 0) {
      compensationType = 'salary';
    }
    
    setNewEmployee({
      name: employee.name,
      email: employee.email,
      title: employee.title || '',
      role: employee.role || '',
      classification: employee.classification || '',
      employment_type: employee.employment_type || 'full_time',
      start_date: employee.start_date || new Date().toISOString().split('T')[0],
      team_id: employee.team_id?.toString() || '',
      team_ids: employee.team_ids?.map(id => id.toString()) || [],
      compensation_type: compensationType,
      hourly_rate: employee.hourly_rate?.toString() || '',
      annual_salary: employee.annual_salary?.toString() || ''
    });
    setEditEmployeeModal(true);
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployee) return;
    
    // Form validation
    if (!newEmployee.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!newEmployee.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmployee.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload: any = {
        name: newEmployee.name.trim(),
        email: newEmployee.email.trim()
      };
      
      // Add optional fields only if they have values
      if (newEmployee.title) payload.title = newEmployee.title;
      if (newEmployee.role) payload.role = newEmployee.role;
      if (newEmployee.classification) payload.classification = newEmployee.classification;
      if (newEmployee.employment_type) payload.employment_type = newEmployee.employment_type;
      if (newEmployee.start_date) payload.start_date = newEmployee.start_date;
      if (newEmployee.team_id) payload.team_id = parseInt(newEmployee.team_id);
      
      // Multi-team support
      if (newEmployee.team_ids && newEmployee.team_ids.length > 0) {
        payload.team_ids = newEmployee.team_ids.map(id => parseInt(id));
      }
      
      // Compensation - always save both fields, even if 0
      payload.compensation_type = newEmployee.compensation_type;
      payload.hourly_rate = parseFloat(newEmployee.hourly_rate) || 0;
      payload.annual_salary = parseFloat(newEmployee.annual_salary) || 0;
      
      const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success('Employee updated successfully!');
        setEditEmployeeModal(false);
        setSelectedEmployee(null);
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
          team_ids: [],
          compensation_type: 'salary',
          hourly_rate: '',
          annual_salary: ''
        });
      } else {
        const errorText = await response.text();
        console.error('Failed to update employee:', errorText);
        toast.error(`Failed to update employee: ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to update employee:', error);
      toast.error('Failed to update employee. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTimesheet = async () => {
    // Validate
    if (!newTimesheet.employee_id || !newTimesheet.pay_period_start || !newTimesheet.pay_period_end) {
      toast.error('Please select employee and date range');
      return;
    }
    
    if (!selectedEntityId) {
      toast.error('No entity selected');
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to create timesheet:', response.status, errorText);
        toast.error(`Failed to create timesheet: ${response.status} ${errorText}`);
        return;
      }

      const data = await response.json();
      const timesheetId = data.id;
      
      // Save entries if any hours entered
      const entriesWithHours = newTimesheetEntries.filter(e => e.hours > 0);
      if (entriesWithHours.length > 0) {
        const entriesResponse = await fetch(`/api/timesheets/${timesheetId}/entries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries: entriesWithHours })
        });
        
        if (!entriesResponse.ok) {
          const errorText = await entriesResponse.text();
          console.error('Failed to save timesheet entries:', entriesResponse.status, errorText);
          toast.error(`Timesheet created but failed to save entries: ${errorText}`);
        }
      }
      
      toast.success('Timesheet created successfully!');
      setCreateTimesheetModal(false);
      fetchTimesheets();
      setNewTimesheet({ employee_id: '', pay_period_start: '', pay_period_end: '' });
      setNewTimesheetEntries([]);
    } catch (error) {
      console.error('Failed to create timesheet:', error);
      toast.error('Failed to create timesheet. Please check your connection.');
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to save timesheet entries:', response.status, errorText);
        toast.error(`Failed to save timesheet: ${response.status} ${errorText}`);
        return;
      }

      toast.success('Timesheet saved!');
      setTimesheetDetailModal(false);
      fetchTimesheets();
    } catch (error) {
      console.error('Failed to save entries:', error);
      toast.error('Failed to save timesheet. Please check your connection.');
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to submit timesheet:', response.status, errorText);
        toast.error(`Failed to submit timesheet: ${response.status} ${errorText}`);
        return;
      }

      toast.success('Timesheet submitted for approval!');
      setTimesheetDetailModal(false);
      fetchTimesheets();
    } catch (error) {
      console.error('Failed to submit timesheet:', error);
      toast.error('Failed to submit timesheet. Please check your connection.');
    }
  };

  const handleApproveTimesheet = async (timesheetId: number) => {
    try {
      const response = await fetch(`/api/timesheets/${timesheetId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to approve timesheet:', response.status, errorText);
        toast.error(`Failed to approve timesheet: ${response.status} ${errorText}`);
        return;
      }

      toast.success('Timesheet approved!');
      fetchTimesheets();
    } catch (error) {
      console.error('Failed to approve timesheet:', error);
      toast.error('Failed to approve timesheet. Please check your connection.');
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to reject timesheet:', response.status, errorText);
        toast.error(`Failed to reject timesheet: ${response.status} ${errorText}`);
        return;
      }

      toast.success('Timesheet rejected');
      fetchTimesheets();
    } catch (error) {
      console.error('Failed to reject timesheet:', error);
      toast.error('Failed to reject timesheet. Please check your connection.');
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
    const searchLower = searchQuery.toLowerCase().trim();
    const matchesSearch = searchLower === '' || 
                          emp.name.toLowerCase().includes(searchLower) ||
                          emp.email.toLowerCase().includes(searchLower) ||
                          (emp.title && emp.title.toLowerCase().includes(searchLower)) ||
                          (emp.role && emp.role.toLowerCase().includes(searchLower));
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
          className="space-y-4 p-8"
        >

      {/* Main Tabs - Moved above KPIs to match Finance module design */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="mb-3 flex justify-center">
          <TabsList className="h-11 bg-muted/50">
            <TabsTrigger value="employees" className="data-[state=active]:bg-background px-6">
              {isAdvisory ? 'Students' : 'Employees'}
            </TabsTrigger>
            <TabsTrigger value="teams" className="data-[state=active]:bg-background px-6">
              {isAdvisory ? 'Projects' : 'Teams'}
            </TabsTrigger>
            <TabsTrigger value="timesheets" className="data-[state=active]:bg-background px-6">
              Timesheets
            </TabsTrigger>
          </TabsList>
        </div>

        {/* KPI Cards - Now below tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {isAdvisory ? 'Students' : 'Employees'}
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeEmployees}</div>
                <p className="text-xs text-muted-foreground">
                  {isAdvisory ? 'Active Students' : 'Active Employees'}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer">
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
                  Organizational Units
                </p>
              </CardContent>
            </Card>

            <Card className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingTimesheets}</div>
                <p className="text-xs text-muted-foreground">
                  Timesheets Awaiting Approval
                </p>
              </CardContent>
            </Card>

            <Card className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Payroll</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{approvedTimesheets}</div>
                <p className="text-xs text-muted-foreground">
                  Hours Ready For Payroll
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>


        {/* ==================== EMPLOYEES TAB ==================== */}
        <TabsContent value="employees" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <CardTitle>{isAdvisory ? 'Student Directory' : 'Employee Directory'}</CardTitle>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={isAdvisory ? "Search students by name, email, program, or school..." : "Search employees by name, email, title, or role..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-6 pr-10 w-[24rem]"
                      />
                      {searchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                          onClick={() => setSearchQuery('')}
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      )}
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
                    {!isAdvisory && (
                    <Dialog open={createEmployeeModal} onOpenChange={setCreateEmployeeModal}>
                      <DialogTrigger asChild>
                          <Button className="w-40">
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
                          <Label>Teams (Optional)</Label>
                          <div className="relative" data-teams-dropdown>
                            <div
                              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={() => setTeamsDropdownOpen(!teamsDropdownOpen)}
                            >
                              <span className={newEmployee.team_ids.length > 0 ? "text-foreground" : "text-muted-foreground"}>
                                {newEmployee.team_ids.length > 0 ? `${newEmployee.team_ids.length} team(s) selected` : "Select teams"}
                              </span>
                              <ChevronDown className="h-4 w-4 opacity-50" />
                            </div>
                            
                            {teamsDropdownOpen && (
                              <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border border-border rounded-md shadow-md">
                                <div className="p-1">
                                  {teams.map((team) => (
                                    <div
                                      key={team.id}
                                      className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${
                                        newEmployee.team_ids.includes(team.id.toString()) ? 'bg-accent text-accent-foreground' : ''
                                      }`}
                                      onClick={() => {
                                        const teamId = team.id.toString();
                                        if (newEmployee.team_ids.includes(teamId)) {
                                          setNewEmployee({
                                            ...newEmployee,
                                            team_ids: newEmployee.team_ids.filter(id => id !== teamId)
                                          });
                                        } else {
                                          setNewEmployee({
                                            ...newEmployee,
                                            team_ids: [...newEmployee.team_ids, teamId]
                                          });
                                        }
                                      }}
                                    >
                                      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                        {newEmployee.team_ids.includes(team.id.toString()) && (
                                          <CheckCircle className="h-4 w-4" />
                                        )}
                                      </span>
                                      {team.name}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
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
                            onValueChange={handleCompensationTypeChange}
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
                    )}

              {/* Edit Employee Modal */}
              <Dialog open={editEmployeeModal} onOpenChange={setEditEmployeeModal}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Edit Employee</DialogTitle>
                    <DialogDescription>Update employee information</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUpdateEmployee} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name *</Label>
                        <Input
                          required
                          value={newEmployee.name}
                          onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                          placeholder="John Doe"
                          autoFocus={false}
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
                          placeholder="Senior Developer"
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
                            <SelectItem value="individual_contributor">Individual Contributor</SelectItem>
                            <SelectItem value="contractor">Contractor</SelectItem>
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
                            <SelectValue placeholder="Select type" />
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
                      <div className="space-y-2">
                        <Label>Teams</Label>
                        <div className="relative" data-teams-dropdown>
                          <div
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => setTeamsDropdownOpen(!teamsDropdownOpen)}
                          >
                            <span className={newEmployee.team_ids.length > 0 ? "text-foreground" : "text-muted-foreground"}>
                              {newEmployee.team_ids.length > 0 ? `${newEmployee.team_ids.length} team(s) selected` : "Select teams"}
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </div>
                          
                          {teamsDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border border-border rounded-md shadow-md">
                              <div className="p-1">
                            {teams.map((team) => (
                                  <div
                                    key={team.id}
                                    className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${
                                      newEmployee.team_ids.includes(team.id.toString()) ? 'bg-accent text-accent-foreground' : ''
                                    }`}
                                    onClick={() => {
                                      const teamId = team.id.toString();
                                      if (newEmployee.team_ids.includes(teamId)) {
                                        setNewEmployee({
                                          ...newEmployee,
                                          team_ids: newEmployee.team_ids.filter(id => id !== teamId)
                                        });
                                      } else {
                                        setNewEmployee({
                                          ...newEmployee,
                                          team_ids: [...newEmployee.team_ids, teamId]
                                        });
                                      }
                                    }}
                                  >
                                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                      {newEmployee.team_ids.includes(team.id.toString()) && (
                                        <CheckCircle className="h-4 w-4" />
                                      )}
                                    </span>
                                  {team.name}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label>Compensation</Label>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="salary"
                            name="compensation_type"
                            value="salary"
                            checked={newEmployee.compensation_type === 'salary'}
                            onChange={(e) => handleCompensationTypeChange(e.target.value)}
                          />
                          <Label htmlFor="salary">Annual Salary</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="hourly"
                            name="compensation_type"
                            value="hourly"
                            checked={newEmployee.compensation_type === 'hourly'}
                            onChange={(e) => handleCompensationTypeChange(e.target.value)}
                          />
                          <Label htmlFor="hourly">Hourly Rate</Label>
                        </div>
                      </div>

                      {newEmployee.compensation_type === 'salary' && (
                        <div className="space-y-2">
                          <Label>Annual Salary</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newEmployee.annual_salary}
                            onChange={(e) => setNewEmployee({ ...newEmployee, annual_salary: e.target.value })}
                            placeholder="75000"
                          />
                        </div>
                      )}

                      {newEmployee.compensation_type === 'hourly' && (
                        <div className="space-y-2">
                          <Label>Hourly Rate</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newEmployee.hourly_rate}
                            onChange={(e) => setNewEmployee({ ...newEmployee, hourly_rate: e.target.value })}
                            placeholder="25.00"
                          />
                        </div>
                      )}
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setEditEmployeeModal(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitting}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Update Employee
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
                  </div>
                </div>
              </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-4">
                    {searchQuery ? (
                      <>
                        {filteredEmployees.length} of {employees.length} {filteredEmployees.length === 1 ? (isAdvisory ? 'student' : 'employee') : (isAdvisory ? 'students' : 'employees')} match your search
                      </>
                    ) : (
                      <>
                        {filteredEmployees.length} {filteredEmployees.length === 1 ? (isAdvisory ? 'student' : 'employee') : (isAdvisory ? 'students' : 'employees')}
                      </>
                    )}
                  </div>
                {loading ? (
                  <div className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="text-center p-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">
                      {isAdvisory ? 'No Students Found' : 'No Employees Found'}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {employees.length === 0
                        ? (isAdvisory ? 'No students are currently enrolled in projects' : 'Add your first employee to get started')
                        : (isAdvisory ? 'No students match your search criteria' : 'No employees match your search criteria')}
                    </p>
                    {employees.length === 0 && !isAdvisory && (
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
                            className="hover:bg-muted/50 cursor-pointer"
                            onClick={() => handleEditEmployee(emp)}
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
                              <TableCell>
                                {emp.team_names && emp.team_names.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {emp.team_names.map((teamName, idx) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        {teamName}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">No teams</span>
                                )}
                              </TableCell>
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
                            <TableCell>{getStatusBadge(emp.status || 'inactive')}</TableCell>
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

        {/* ==================== TEAMS TAB ==================== */}
        <TabsContent value="teams" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <CardTitle>{isAdvisory ? 'Project Directory' : 'Team Directory'}</CardTitle>
                  <div className="flex items-center gap-3 mt-1">
                    {!isAdvisory && (
                    <Dialog open={createTeamModal} onOpenChange={setCreateTeamModal}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Team
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Add New Team</DialogTitle>
                          <DialogDescription>Create a new team for your organization</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateTeam} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Team Name *</Label>
                              <Input
                                required
                                value={newTeam.name}
                                onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                                placeholder="Engineering Team"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Team Type</Label>
                              <Input
                                value={newTeam.type}
                                onChange={(e) => setNewTeam({ ...newTeam, type: e.target.value })}
                                placeholder="Engineering, Sales, Marketing"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              value={newTeam.description}
                              onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                              placeholder="Team description and responsibilities"
                              rows={3}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Team Lead</Label>
                            <Select
                              value={newTeam.lead_employee_id}
                              onValueChange={(value) => setNewTeam({ ...newTeam, lead_employee_id: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select team lead (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                {employees.map((employee) => (
                                  <SelectItem key={employee.id} value={employee.id.toString()}>
                                    {employee.name} {employee.title ? `- ${employee.title}` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCreateTeamModal(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                              {submitting ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                'Create Team'
                              )}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                    )}

                    {/* Edit Team Modal */}
                    <Dialog open={editTeamModal} onOpenChange={setEditTeamModal}>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Edit Team</DialogTitle>
                          <DialogDescription>Update team information</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleUpdateTeam} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Team Name *</Label>
                              <Input
                                required
                                value={newTeam.name}
                                onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                                placeholder="Engineering Team"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Team Type</Label>
                              <Input
                                value={newTeam.type}
                                onChange={(e) => setNewTeam({ ...newTeam, type: e.target.value })}
                                placeholder="Engineering, Sales, Marketing"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              value={newTeam.description}
                              onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                              placeholder="Team description and responsibilities"
                              rows={3}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Team Lead</Label>
                            <Select
                              value={newTeam.lead_employee_id}
                              onValueChange={(value) => setNewTeam({ ...newTeam, lead_employee_id: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select team lead (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                {employees.map((employee) => (
                                  <SelectItem key={employee.id} value={employee.id.toString()}>
                                    {employee.name} {employee.title ? `- ${employee.title}` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <DialogFooter className="flex justify-between">
                            <Button 
                              type="button" 
                              variant="destructive" 
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete "${selectedTeam?.name}"? This action cannot be undone and will remove all team memberships.`)) {
                                  if (selectedTeam) {
                                    handleDeleteTeam(selectedTeam);
                                    setEditTeamModal(false);
                                  }
                                }
                              }}
                              disabled={submitting}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Team
                            </Button>
                            <div className="flex gap-2">
                              <Button type="button" variant="outline" onClick={() => setEditTeamModal(false)}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={submitting}>
                                {submitting ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Updating...
                                  </>
                                ) : (
                                  'Update Team'
                                )}
                              </Button>
                            </div>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">{isAdvisory ? 'Loading projects...' : 'Loading teams...'}</span>
                  </div>
                ) : isAdvisory ? (
                  projects.length === 0 ? (
                      <div className="text-center py-8">
                        <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No projects found</h3>
                        <p className="text-muted-foreground mb-4">
                          No active projects available at this time.
                        </p>
                      </div>
                    ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {projects.map((project) => (
                          <Card 
                            key={project.id} 
                            className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200"
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-lg">{project.name || project.project_name}</CardTitle>
                                  {project.client_name && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {project.client_name}
                                    </p>
                                  )}
                                  {project.summary && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                      {project.summary}
                                    </p>
                                  )}
                                </div>
                                <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                                  {project.status}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {project.team_size && (
                                  <div className="text-sm text-muted-foreground">
                                    Team Size: {project.team_size} members
                                  </div>
                                )}
                                {project.assigned_count !== undefined && (
                                  <div className="text-sm text-muted-foreground">
                                    Assigned: {project.assigned_count} students
                                  </div>
                                )}
                                {project.default_hourly_rate && (
                                  <div className="text-sm text-muted-foreground">
                                    Rate: ${project.default_hourly_rate}/hour
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  )
                ) : teams.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No teams found</h3>
                    <p className="text-muted-foreground mb-4">
                      Get started by creating your first team.
                    </p>
                    <Button onClick={() => setCreateTeamModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Team
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {teams.map((team) => (
                        <Card 
                          key={team.id} 
                          className="hover:scale-105 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer"
                          onClick={() => handleEditTeam(team)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg">{team.name}</CardTitle>
                            {team.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                {team.description}
                              </p>
                            )}
                              </div>
                              </div>
                          </CardHeader>
                          <CardContent>
                            <div className="text-sm text-muted-foreground">
                              {employees.filter(emp => 
                                emp.team_ids?.includes(team.id) || emp.team_id === team.id
                              ).length} Active Members
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ==================== TIMESHEETS TAB (Personal Entry + Approvals) ==================== */}
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
              <Tabs defaultValue="my-timesheets" className="w-full">
                <div className="mb-6 flex justify-center">
                  <TabsList className="h-11 bg-muted/50">
                    <TabsTrigger value="my-timesheets" className="data-[state=active]:bg-background px-6">
                      My Timesheets
                    </TabsTrigger>
                    <TabsTrigger value="approvals" className="data-[state=active]:bg-background px-6">
                      Approvals
                    </TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:bg-background px-6">
                      History
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                {/* My Timesheets Tab */}
                <TabsContent value="my-timesheets" className="mt-0">
                  {/* Consolidated My Timesheet Section */}
                  <Card className="border-0 shadow-lg bg-gradient-to-r from-primary/5 to-primary/10 rounded-b-none">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-2xl font-bold">
                            My Timesheet - {currentEmployee.name}
                          </CardTitle>
                          <CardDescription className="text-base mt-2">
                            Week of {new Date(currentWeekStart).toLocaleDateString('en-US', { 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })} - {new Date(new Date(currentWeekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                              {weeklyEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0).toFixed(1)}h
                            </div>
                            <div className="text-xs text-muted-foreground">Total Hours</div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => navigateWeek('prev')}
                              className="hover:bg-primary/10 hover:border-primary/30 transition-all duration-200"
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              Previous
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => navigateWeek('next')}
                              className="hover:bg-primary/10 hover:border-primary/30 transition-all duration-200"
                            >
                              Next
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Compact Day Grid */}
                  <Card className="border-0 shadow-lg -mt-2 rounded-none">
                    <CardContent className="p-6">
                      <div className="grid grid-cols-7 gap-2">
                        {weeklyEntries.map((entry, index) => {
                          const hasTimeBlocks = entry.timeBlocks && entry.timeBlocks.length > 0;
                          
                          return (
                            <motion.div
                              key={entry.date}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              transition={{ 
                                delay: index * 0.05,
                                hover: { duration: 0.2 },
                                tap: { duration: 0.1 }
                              }}
                              className={`relative rounded-lg border-2 p-3 transition-all duration-300 cursor-pointer bg-gradient-to-br from-background to-primary/5 border-primary/20 hover:border-primary/40 hover:shadow-lg ${hasTimeBlocks ? 'ring-2 ring-primary/20 shadow-lg' : ''}`}
                              onClick={() => {
                                setSelectedDay(entry);
                                setDayModal(true);
                              }}
                            >
                              {/* Day Header */}
                              <div className="text-center">
                                <div className="text-lg font-bold text-primary">
                                  {new Date(entry.date).getDate()}
                                </div>
                                <div className="text-xs font-medium text-muted-foreground">
                                  {entry.dayName.substring(0, 3)}
                                </div>
                              </div>

                              {/* Time Block Summary */}
                              {hasTimeBlocks && (
                                <div className="mt-2 space-y-1">
                                  <div className="text-xs font-medium text-primary">
                                    {entry.hours.toFixed(1)}h
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {entry.timeBlocks?.length} block{entry.timeBlocks?.length !== 1 ? 's' : ''}
                                  </div>
                                </div>
                              )}

                              {/* Empty State */}
                              {!hasTimeBlocks && (
                                <div className="mt-2 text-center">
                                  <div className="text-xs text-muted-foreground">
                                    Click to add time
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* Submit Button with Friday 3pm restriction */}
                      <div className="mt-6 flex flex-col items-center justify-center">
                        <Button 
                          size="sm"
                          disabled={!canSubmitCurrentWeek() || weeklyEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0) === 0}
                          className="px-6"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Submit Timesheet
                        </Button>
                        {!canSubmitCurrentWeek() && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Timesheet can only be submitted after Friday 3:00 PM
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                      </TabsContent>

                {/* Timesheet Approval Tab */}
                <TabsContent value="approvals" className="space-y-4 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Timesheet Approvals</CardTitle>
                      <CardDescription>Review and approve pending timesheets</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {timesheets.filter(t => t.status === 'submitted').length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                          <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <h3 className="text-lg font-semibold mb-2">No Pending Approvals</h3>
                          <p>All timesheets are up to date.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {timesheets
                            .filter(t => t.status === 'submitted')
                            .sort((a, b) => new Date(b.submitted_date || b.pay_period_start).getTime() - new Date(a.submitted_date || a.pay_period_start).getTime())
                            .map((timesheet, idx) => (
                              <motion.div
                                key={timesheet.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                              >
                                <Card className="hover:shadow-md transition-shadow">
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-4">
                                        <div className="text-center">
                                          <div className="text-2xl font-bold text-primary">
                                            {timesheet.total_hours.toFixed(1)}h
                                          </div>
                                          <div className="text-xs text-muted-foreground">Total Hours</div>
                                        </div>
                                        <div>
                                          <div className="font-semibold">{timesheet.employee_name}</div>
                                          <div className="text-sm text-muted-foreground">
                                            {new Date(timesheet.pay_period_start).toLocaleDateString()} - {new Date(timesheet.pay_period_end).toLocaleDateString()}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            Submitted: {timesheet.submitted_date ? new Date(timesheet.submitted_date).toLocaleDateString() : 'N/A'}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        {getStatusBadge(timesheet.status)}
                                        <div className="flex gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setSelectedTimesheet(timesheet);
                                              fetch(`/api/timesheets/${timesheet.id}`)
                                                .then(res => res.json())
                                                .then(data => {
                                                  setTimesheetEntries(data.entries || []);
                                                  setTimesheetDetailModal(true);
                                                })
                                                .catch(err => console.error('Error loading timesheet entries:', err));
                                            }}
                                          >
                                            <FileText className="h-4 w-4 mr-2" />
                                            Review
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={() => handleApproveTimesheet(timesheet.id)}
                                            className="bg-green-600 hover:bg-green-700"
                                          >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Approve
                                          </Button>
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleRejectTimesheet(timesheet.id)}
                                          >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Reject
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                      
                {/* History Tab */}
                <TabsContent value="history" className="space-y-4 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>My Timesheet History</CardTitle>
                      <CardDescription>Your submitted and approved timesheets</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {timesheets.filter(t => t.employee_id === currentEmployee?.id).length === 0 ? (
                          <div className="text-center p-8 text-muted-foreground">
                          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <h3 className="text-lg font-semibold mb-2">No Timesheets Yet</h3>
                          <p>You haven't submitted any timesheets yet.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {timesheets
                              .filter(t => t.employee_id === currentEmployee?.id)
                              .sort((a, b) => new Date(b.pay_period_start).getTime() - new Date(a.pay_period_start).getTime())
                            .map((timesheet, idx) => (
                                <motion.div
                                key={timesheet.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                >
                                <Card className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                      <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-4">
                                        <div className="text-center">
                                          <div className="text-2xl font-bold text-primary">
                                            {timesheet.total_hours.toFixed(1)}h
                                          </div>
                                          <div className="text-xs text-muted-foreground">Total Hours</div>
                                        </div>
                                        <div>
                                          <div className="font-semibold">
                                            {new Date(timesheet.pay_period_start).toLocaleDateString()} - {new Date(timesheet.pay_period_end).toLocaleDateString()}
                                          </div>
                                          <div className="text-sm text-muted-foreground">
                                            {timesheet.entries_count} days worked
                                          </div>
                                        </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                        {getStatusBadge(timesheet.status)}
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedTimesheet(timesheet);
                                            // Load timesheet entries for this timesheet
                                            fetch(`/api/timesheets/${timesheet.id}`)
                                              .then(res => res.json())
                                              .then(data => {
                                                setTimesheetEntries(data.entries || []);
                                                setTimesheetDetailModal(true);
                                              })
                                              .catch(err => console.error('Error loading timesheet entries:', err));
                                          }}
                                        >
                                          <FileText className="h-4 w-4 mr-2" />
                                          View Details
                                          </Button>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </motion.div>
                              ))}
                          </div>
                        )}
                    </CardContent>
                  </Card>
                      </TabsContent>
                      </Tabs>
                    )}
          </motion.div>
        </TabsContent>

      </Tabs>
    </motion.div>
  </div>

  {/* Day Modal for Time Block Selection */}
  <Dialog open={dayModal} onOpenChange={setDayModal}>
    <DialogContent className="max-w-5xl">
      <DialogHeader>
        <DialogTitle>
          {selectedDay ? `${selectedDay.dayName}, ${new Date(selectedDay.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}` : 'Add Time Blocks'}
        </DialogTitle>
        <DialogDescription>
          Select time blocks and add team and description for this day
        </DialogDescription>
      </DialogHeader>
      
      {selectedDay && (
        <div className="flex gap-6">
          {/* Left Side - Time Block Selection */}
          <div className="flex-1">
            <div 
              className="relative h-[36rem] bg-gradient-to-b from-background to-muted/20 rounded-lg border-2 border-solid border-muted/60 cursor-pointer hover:border-primary/60 transition-colors duration-200 py-6"
              onMouseDown={(e) => handleTimelineMouseDown(e, selectedDay, weeklyEntries.findIndex(entry => entry.date === selectedDay.date))}
              onMouseMove={(e) => handleTimelineMouseMove(e)}
              onMouseUp={() => handleDayModalMouseUp()}
              onMouseLeave={() => handleTimelineMouseLeave()}
            >
              {/* Hour Markers with actual times positioned inside the timeline */}
              {Array.from({ length: 24 }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-full h-px bg-muted/30 pointer-events-none border-t border-muted/20"
                  style={{ top: `calc(${(i / 24) * 100}% + 1.5rem)` }}
                >
                  <span className="absolute left-1 -top-1 text-[10px] text-foreground font-semibold w-12 text-right pointer-events-none select-none">
                    {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                  </span>
                </div>
              ))}

              {/* Existing Time Blocks */}
              {selectedDay.timeBlocks?.map((block: any, blockIndex: number) => (
                <div
                  key={blockIndex}
                  className={`absolute rounded-lg border-2 transition-all duration-200 hover:shadow-lg cursor-pointer ${
                    editingTimeBlock?.id === block.id 
                      ? 'bg-primary border-primary shadow-md' 
                      : 'bg-primary/90 hover:bg-primary border-primary/30 hover:border-primary/50'
                  }`}
                  style={{
                    top: `calc(${timeToPercent(block.startTime)}% + 1.5rem)`,
                    height: `${timeToPercent(block.endTime) - timeToPercent(block.startTime)}%`,
                    left: '60px',
                    right: '4px',
                  }}
                  onClick={() => {
                    setEditingTimeBlock(block);
                    // Update selectedDay to ensure UI reflects the selected block
                    const updatedDay = {
                      ...selectedDay,
                      timeBlocks: selectedDay.timeBlocks.map((b: any) => 
                        b.id === block.id ? block : b
                      )
                    };
                    setSelectedDay(updatedDay);
                  }}
                >
                  {/* Resize handles */}
                  <div
                    className="absolute -top-1 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20 rounded-t-md"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setResizingBlock(block);
                      setResizeType('top');
                    }}
                  />
                  <div
                    className="absolute -bottom-1 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20 rounded-b-md"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setResizingBlock(block);
                      setResizeType('bottom');
                    }}
                  />
                  
                  {/* Time block content - times at top */}
                  <div className="p-3 text-white h-full flex flex-col">
                    <div className="font-bold mb-2 text-sm">
                      {formatTimeWithAmPm(block.startTime)} - {formatTimeWithAmPm(block.endTime)}
                    </div>
                    <div className="opacity-95 truncate text-xs font-semibold mb-2">
                      {block.teamName || block.projectName || 'No team selected'}
                    </div>
                    {block.description && (
                      <div className="opacity-85 text-xs leading-relaxed flex-1 overflow-hidden">
                        {block.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Selection Preview */}
              {isSelecting && selectionStart !== null && selectionEnd !== null && (
                <div
                  className="absolute bg-primary/30 border-2 border-primary/50 rounded-lg pointer-events-none shadow-sm"
                  style={{
                    top: `calc(${Math.min(selectionStart, selectionEnd)}% + 1.5rem)`,
                    height: `${Math.abs(selectionEnd - selectionStart)}%`,
                    left: '60px',
                    right: '4px',
                  }}
                />
              )}
            </div>
          </div>

          {/* Right Side - Input Fields and Time Block Summary */}
          <div className="w-80 space-y-3">

            {/* Team/Project Selection */}
            <div className="space-y-1">
              <Label className="text-sm">Team/Project</Label>
              <Select
                value={editingTimeBlock ? (editingTimeBlock.teamId || (editingTimeBlock.projectId ? `project_${editingTimeBlock.projectId}` : '')) : (currentTeamId || (currentProjectId ? `project_${currentProjectId}` : ''))}
                onValueChange={(value) => {
                  const isProject = value.startsWith('project_');
                  
                  if (editingTimeBlock) {
                    let updatedBlock;
                    
                    if (isProject) {
                      const projectId = value.replace('project_', '');
                      const project = projects.find(p => p.id.toString() === projectId);
                      updatedBlock = {
                        ...editingTimeBlock,
                        projectId,
                        projectName: project?.name || '',
                        teamId: '',
                        teamName: ''
                      };
                    } else {
                      const team = teams.find(t => t.id.toString() === value);
                      updatedBlock = {
                        ...editingTimeBlock,
                        teamId: value,
                        teamName: team?.name || '',
                        projectId: '',
                        projectName: ''
                      };
                    }
                    
                    setEditingTimeBlock(updatedBlock);
                    
                    // Update in selectedDay
                    const updatedDay = {
                      ...selectedDay,
                      timeBlocks: selectedDay.timeBlocks.map((block: any) => 
                        block.id === editingTimeBlock.id ? updatedBlock : block
                      )
                    };
                    setSelectedDay(updatedDay);
                    
                    // Update weekly entries
                    const updatedEntries = weeklyEntries.map(entry => 
                      entry.date === selectedDay.date ? updatedDay : entry
                    );
                    setWeeklyEntries(updatedEntries);
                    
                    // Force re-render by updating the selectedDay reference
                    setTimeout(() => {
                      setSelectedDay({...updatedDay});
                    }, 0);
                  } else {
                    // Update current form values for new time blocks
                    if (isProject) {
                      setCurrentProjectId(value);
                      setCurrentTeamId('');
                    } else {
                      setCurrentTeamId(value);
                      setCurrentProjectId('');
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team or project" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.name}
                    </SelectItem>
                  ))}
                  {projects.map(project => (
                    <SelectItem key={project.id} value={`project_${project.id}`}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label className="text-sm">Description</Label>
              <Textarea
                value={editingTimeBlock?.description || currentDescription}
                onChange={(e) => {
                  if (editingTimeBlock) {
                    const updatedBlock = { ...editingTimeBlock, description: e.target.value };
                    setEditingTimeBlock(updatedBlock);
                    
                    // Update in selectedDay
                    const updatedDay = {
                      ...selectedDay,
                      timeBlocks: selectedDay.timeBlocks.map((block: any) => 
                        block.id === editingTimeBlock.id ? updatedBlock : block
                      )
                    };
                    setSelectedDay(updatedDay);
                    
                    // Update weekly entries
                    const updatedEntries = weeklyEntries.map(entry => 
                      entry.date === selectedDay.date ? updatedDay : entry
                    );
                    setWeeklyEntries(updatedEntries);
                    
                    // Force re-render by updating the selectedDay reference
                    setTimeout(() => {
                      setSelectedDay({...updatedDay});
                    }, 0);
                  } else {
                    setCurrentDescription(e.target.value);
                  }
                }}
                placeholder="What did you work on during this time?"
                rows={3}
              />
            </div>

            {/* Time Block Summary */}
            {selectedDay.timeBlocks && selectedDay.timeBlocks.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Time Blocks</div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedDay.timeBlocks?.map((block: any, blockIndex: number) => (
                    <div
                      key={blockIndex}
                      className="flex items-center justify-between p-2 bg-primary/5 rounded-lg border border-primary/10"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-primary" />
                        <span className="text-xs font-medium">
                          {formatTimeWithAmPm(block.startTime)} - {formatTimeWithAmPm(block.endTime)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({block.hours.toFixed(1)}h)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <DialogFooter>
        <div className="flex items-center gap-4">
          <div className="text-base text-muted-foreground">
            Total Hours: <span className="font-semibold text-primary">
              {selectedDay ? selectedDay.timeBlocks?.reduce((sum: number, block: any) => sum + (block.hours || 0), 0).toFixed(1) : '0.0'}h
            </span>
          </div>
          <Button onClick={() => setDayModal(false)} size="sm" className="px-4 py-2 text-sm h-8">
            Save
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  {/* Time Block Edit Modal */}
  <Dialog open={timeBlockEditModal} onOpenChange={setTimeBlockEditModal}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Edit Time Block</DialogTitle>
        <DialogDescription>
          Configure team, project, and description for this time block
        </DialogDescription>
      </DialogHeader>
      
      {selectedTimeBlock && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={selectedTimeBlock.startTime}
                onChange={(e) => setSelectedTimeBlock({...selectedTimeBlock, startTime: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={selectedTimeBlock.endTime}
                onChange={(e) => setSelectedTimeBlock({...selectedTimeBlock, endTime: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Team/Project</Label>
            <Select
              value={selectedTimeBlock.teamId || selectedTimeBlock.projectId || ''}
              onValueChange={(value) => {
                const isProject = value.startsWith('project_');
                if (isProject) {
                  const projectId = value.replace('project_', '');
                  const project = projects.find(p => p.id.toString() === projectId);
                  setSelectedTimeBlock({
                    ...selectedTimeBlock,
                    projectId,
                    projectName: project?.name || '',
                    teamId: '',
                    teamName: ''
                  });
                } else {
                  const team = teams.find(t => t.id.toString() === value);
                  setSelectedTimeBlock({
                    ...selectedTimeBlock,
                    teamId: value,
                    teamName: team?.name || '',
                    projectId: '',
                    projectName: ''
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team or project" />
              </SelectTrigger>
              <SelectContent>
                {teams.map(team => (
                  <SelectItem key={team.id} value={team.id.toString()}>
                    Team: {team.name}
                  </SelectItem>
                ))}
                {projects.map(project => (
                  <SelectItem key={project.id} value={`project_${project.id}`}>
                    Project: {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={selectedTimeBlock.description || ''}
              onChange={(e) => setSelectedTimeBlock({...selectedTimeBlock, description: e.target.value})}
              placeholder="What did you work on during this time?"
              rows={3}
            />
          </div>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => setTimeBlockEditModal(false)}>
          Cancel
        </Button>
        <Button onClick={() => {
          // Update the time block in the weekly entries
          const updatedEntries = weeklyEntries.map(entry => {
            if (entry.date === selectedDay?.date) {
              const updatedTimeBlocks = entry.timeBlocks?.map((block: any) => 
                block.id === selectedTimeBlock.id ? selectedTimeBlock : block
              ) || [];
              return {
                ...entry,
                timeBlocks: updatedTimeBlocks,
                hours: updatedTimeBlocks.reduce((sum: number, block: any) => sum + block.hours, 0)
              };
            }
            return entry;
          });
          setWeeklyEntries(updatedEntries);
          setTimeBlockEditModal(false);
        }}>
          Save Changes
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  </div>
  );
}