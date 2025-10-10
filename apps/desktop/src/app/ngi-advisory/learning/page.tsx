'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  TrendingUp, 
  Users, 
  BookOpen, 
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  FileText,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { AdvisoryLayout } from '@/components/advisory/AdvisoryLayout';

interface StudentLearningData {
  user_id: string;
  name: string;
  email: string;
  talent_signal: number;
  completion_percentage: number;
  artifact_quality: number;
  improvement_velocity: number;
  current_streak: number;
  longest_streak: number;
  submissions_count: number;
  modules_completed: string[];
  last_activity: string;
  selected_company: string | null;
  total_time_invested: number;
}

interface Artifact {
  id: number;
  submission_id: number;
  file_path: string;
  file_type: string;
  file_size_bytes: number;
  version: number;
  submitted_at: string;
  validator_status: string;
  feedback_score?: number;
  feedback_notes?: string;
  student_name: string;
  module_name: string;
}

export default function LearningCenterPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [students, setStudents] = useState<StudentLearningData[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('talent_signal');
  const [selectedStudent, setSelectedStudent] = useState<StudentLearningData | null>(null);
  const [showArtifacts, setShowArtifacts] = useState(false);

  // Mock data - replace with actual API calls
  useEffect(() => {
    const mockStudents: StudentLearningData[] = [
      {
        user_id: '1',
        name: 'John Doe',
        email: 'john.doe@berkeley.edu',
        talent_signal: 85,
        completion_percentage: 92,
        artifact_quality: 88,
        improvement_velocity: 12,
        current_streak: 5,
        longest_streak: 15,
        submissions_count: 24,
        modules_completed: ['Financial Modeling', 'Valuation', 'M&A Analysis'],
        last_activity: '2024-01-15T10:30:00Z',
        selected_company: 'Goldman Sachs',
        total_time_invested: 120
      },
      {
        user_id: '2',
        name: 'Jane Smith',
        email: 'jane.smith@berkeley.edu',
        talent_signal: 78,
        completion_percentage: 85,
        artifact_quality: 82,
        improvement_velocity: 8,
        current_streak: 3,
        longest_streak: 12,
        submissions_count: 18,
        modules_completed: ['Financial Modeling', 'Valuation'],
        last_activity: '2024-01-14T15:45:00Z',
        selected_company: 'Morgan Stanley',
        total_time_invested: 95
      }
    ];

    const mockArtifacts: Artifact[] = [
      {
        id: 1,
        submission_id: 101,
        file_path: '/artifacts/dcf_model.xlsx',
        file_type: 'xlsx',
        file_size_bytes: 1024000,
        version: 3,
        submitted_at: '2024-01-15T10:30:00Z',
        validator_status: 'approved',
        feedback_score: 88,
        feedback_notes: 'Excellent DCF model with detailed assumptions',
        student_name: 'John Doe',
        module_name: 'Financial Modeling'
      }
    ];

    setStudents(mockStudents);
    setArtifacts(mockArtifacts);
    setLoading(false);
  }, []);

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (filterStatus === 'high_talent') {
      matchesFilter = student.talent_signal >= 80;
    } else if (filterStatus === 'active') {
      matchesFilter = student.current_streak > 0;
    } else if (filterStatus === 'completed') {
      matchesFilter = student.completion_percentage >= 100;
    }

    return matchesSearch && matchesFilter;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    switch (sortBy) {
      case 'talent_signal':
        return b.talent_signal - a.talent_signal;
      case 'completion':
        return b.completion_percentage - a.completion_percentage;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'last_activity':
        return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime();
      default:
        return 0;
    }
  });

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please sign in to access the learning center.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Learning Center Management - NGI Capital Advisory
          </h1>
          <p className="text-muted-foreground">
            Track student progress, review artifacts, and identify top talent across the learning center platform
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold text-foreground">{students.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Award className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">High Talent (80+)</p>
                <p className="text-2xl font-bold text-foreground">
                  {students.filter(s => s.talent_signal >= 80).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <CheckCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Completed Modules</p>
                <p className="text-2xl font-bold text-foreground">
                  {students.reduce((acc, s) => acc + s.modules_completed.length, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Avg. Time Invested</p>
                <p className="text-2xl font-bold text-foreground">
                  {Math.round(students.reduce((acc, s) => acc + s.total_time_invested, 0) / students.length || 0)}h
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Students</option>
                <option value="high_talent">High Talent (80+)</option>
                <option value="active">Active Streak</option>
                <option value="completed">Completed</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="talent_signal">Sort by Talent</option>
                <option value="completion">Sort by Completion</option>
                <option value="name">Sort by Name</option>
                <option value="last_activity">Sort by Activity</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Data
              </button>
              <button 
                onClick={() => setShowArtifacts(!showArtifacts)}
                className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                {showArtifacts ? 'Hide' : 'Show'} Artifacts
              </button>
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Talent Signal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Streak</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Activity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedStudents.map((student) => (
                  <tr key={student.user_id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-foreground">{student.name}</div>
                        <div className="text-sm text-muted-foreground">{student.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-foreground">{student.talent_signal}</div>
                        <div className="ml-2 w-16 bg-muted rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${student.talent_signal}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">{student.completion_percentage}%</div>
                      <div className="text-xs text-muted-foreground">{student.modules_completed.length} modules</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm text-foreground">{student.current_streak}</div>
                        <div className="ml-1 text-xs text-muted-foreground">({student.longest_streak} max)</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(student.last_activity).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => setSelectedStudent(student)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Artifacts Section */}
        {showArtifacts && (
          <div className="mt-6 bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Recent Artifacts</h3>
            <div className="space-y-4">
              {artifacts.map((artifact) => (
                <div key={artifact.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-foreground">{artifact.student_name}</div>
                      <div className="text-sm text-muted-foreground">{artifact.module_name}</div>
                      <div className="text-xs text-muted-foreground">
                        Version {artifact.version} • {new Date(artifact.submitted_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      artifact.validator_status === 'approved' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {artifact.validator_status}
                    </span>
                    <button className="text-blue-600 hover:text-blue-900">
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );
}
