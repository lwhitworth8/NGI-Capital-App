'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { AnimatedText } from '@ngi/ui/components/animated';
import {
  Search, 
  Mail, 
  Calendar, 
  FileText,
  CheckCircle, 
  Clock, 
  XCircle,
  UserPlus,
  Send,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { columns } from './columns';
import { AdvisoryLayout } from '@/components/advisory/AdvisoryLayout';

// Types
interface Flow {
  id: number;
  student_name: string;
  student_email: string;
  project_name: string;
  status: 'in_progress' | 'completed' | 'canceled';
  progress: number;
  email_created: boolean;
  intern_agreement_sent: boolean;
  intern_agreement_received: boolean;
  nda_required: boolean;
  nda_received: boolean;
  ngi_email: string;
  created_at: string;
  updated_at: string;
}

interface ProjectOption {
  id: number;
  project_name: string;
}

interface StudentOption {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

type FlowStatusFilter = 'all' | 'in_progress' | 'awaiting_docs' | 'completed' | 'canceled';

export default function OnboardingPage() {
  // State
  const [flows, setFlows] = useState<Flow[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FlowStatusFilter>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Status filter options
  const statusFilterOptions = [
    { value: 'all', label: 'All' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'awaiting_docs', label: 'Awaiting Documents' },
    { value: 'completed', label: 'Completed' },
    { value: 'canceled', label: 'Canceled' }
  ];

  // Load data
  useEffect(() => {
    loadFlows();
    loadProjects();
    loadStudents();
  }, []);

  const loadFlows = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/advisory/onboarding/flows');
      if (response.ok) {
        const data = await response.json();
        setFlows(data.flows || []);
      }
    } catch (error) {
      console.error('Failed to load flows:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/advisory/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadStudents = async () => {
    try {
      const response = await fetch('/api/advisory/students');
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error('Failed to load students:', error);
    }
  };

  // Filter flows
  const filteredFlows = useMemo(() => {
    let filtered = flows;

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'awaiting_docs') {
        filtered = filtered.filter(flow => 
          flow.status === 'in_progress' && 
          (!flow.intern_agreement_received || (flow.nda_required && !flow.nda_received))
        );
      } else {
        filtered = filtered.filter(flow => flow.status === statusFilter);
      }
    }

    // Project filter
    if (projectFilter !== 'all') {
      const projectId = parseInt(projectFilter);
      filtered = filtered.filter(flow => flow.project_id === projectId);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(flow => 
        flow.student_name?.toLowerCase().includes(query) ||
        flow.student_email?.toLowerCase().includes(query) ||
        flow.project_name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [flows, statusFilter, projectFilter, searchQuery]);

  return (
    <>
      <div className="space-y-6">

      {/* Header */}
      <div className="border-b bg-card p-6" data-testid="module-header">
        <div className="flex items-center justify-between">
          <div>
            <AnimatedText 
              text="Advisory Onboarding" 
              as="h1" 
              className="text-[24px] font-bold text-foreground tracking-tight"
              delay={0.1}
            />
          </div>
            </div>
          </div>

      {/* Main Content */}
      <div className="space-y-4">
        {/* Filters and Search Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Status Tabs */}
            <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as FlowStatusFilter)}>
              <TabsList>
                {statusFilterOptions.map((option) => (
                  <TabsTrigger key={option.value} value={option.value}>
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Project Filter */}
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                      {project.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>

          {/* Search Bar */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by student name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-80"
              />
            </div>
          </div>
        </div>

        {/* DataTable */}
        <DataTable 
          columns={columns} 
          data={filteredFlows}
        />
      </div>
      </div>
    </>
  );
}