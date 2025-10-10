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
}

interface StudentDetail {
  student: StudentLearningData;
  artifacts: Artifact[];
  progress_by_module: Record<string, {
    completion: number;
    time_invested: number;
    last_activity: string;
  }>;
  recent_feedback: Array<{
    id: number;
    feedback_text: string;
    rubric_score: number;
    created_at: string;
  }>;
}

export default function LearningAdminPage() {
  const { getToken } = useAuth();
  const [students, setStudents] = useState<StudentLearningData[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'talent_signal' | 'completion' | 'quality' | 'activity'>('talent_signal');
  const [filterBy, setFilterBy] = useState<'all' | 'elite' | 'strong' | 'promising' | 'developing'>('all');
  const [showStudentDetail, setShowStudentDetail] = useState(false);

  useEffect(() => {
    loadStudents();
  }, [sortBy, filterBy]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/learning/admin/students?sort=${sortBy}&filter=${filterBy}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentDetail = async (userId: string) => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/learning/admin/students/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedStudent(data);
        setShowStudentDetail(true);
      }
    } catch (err) {
      console.error('Failed to load student detail:', err);
    }
  };

  const downloadArtifact = async (artifact: Artifact) => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/learning/admin/artifacts/${artifact.id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${artifact.file_path.split('/').pop()}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Failed to download artifact:', err);
    }
  };

  const flagFeedback = async (artifactId: number) => {
    try {
      const token = await getToken();
      if (!token) return;

      const reason = prompt('Reason for flagging this feedback:');
      if (!reason) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/learning/admin/feedback/${artifactId}/flag?reason=${encodeURIComponent(reason)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        alert('Feedback flagged for review');
      }
    } catch (err) {
      console.error('Failed to flag feedback:', err);
    }
  };

  const regenerateFeedback = async (artifactId: number) => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/learning/admin/feedback/${artifactId}/regenerate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        alert('Feedback regeneration initiated');
        // Reload student detail to get updated feedback
        if (selectedStudent) {
          loadStudentDetail(selectedStudent.student.user_id);
        }
      }
    } catch (err) {
      console.error('Failed to regenerate feedback:', err);
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTalentBadge = (score: number) => {
    if (score >= 80) return { label: 'Elite', color: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' };
    if (score >= 60) return { label: 'Strong', color: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' };
    if (score >= 40) return { label: 'Promising', color: 'bg-gradient-to-r from-blue-400 to-blue-500 text-white' };
    return { label: 'Developing', color: 'bg-muted text-muted-foreground' };
  };

  const getTalentIcon = (score: number) => {
    if (score >= 80) return <Star className="h-4 w-4 text-blue-600" />;
    if (score >= 60) return <Award className="h-4 w-4 text-blue-600" />;
    if (score >= 40) return <TrendingUp className="h-4 w-4 text-blue-600" />;
    return <BookOpen className="h-4 w-4 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimeInvested = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
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
              <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
                <Star className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Elite Performers</p>
                <p className="text-2xl font-bold text-foreground">
                  {students.filter(s => s.talent_signal >= 80).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
                <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Avg Completion</p>
                <p className="text-2xl font-bold text-foreground">
                  {students.length > 0 ? Math.round(students.reduce((acc, s) => acc + s.completion_percentage, 0) / students.length) : 0}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Submissions</p>
                <p className="text-2xl font-bold text-foreground">
                  {students.reduce((acc, s) => acc + s.submissions_count, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Overview */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Learning Center Analytics Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Talent Distribution</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Elite (80+)</span>
                  <span className="text-sm font-medium text-foreground">
                    {students.filter(s => s.talent_signal >= 80).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Strong (60-79)</span>
                  <span className="text-sm font-medium text-foreground">
                    {students.filter(s => 60 <= s.talent_signal && s.talent_signal < 80).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Promising (40-59)</span>
                  <span className="text-sm font-medium text-foreground">
                    {students.filter(s => 40 <= s.talent_signal && s.talent_signal < 60).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Developing (&lt;40)</span>
                  <span className="text-sm font-medium text-foreground">
                    {students.filter(s => s.talent_signal < 40).length}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Module Progress</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Business Foundations</span>
                  <span className="text-sm font-medium text-foreground">
                    {students.filter(s => s.modules_completed.includes('Business Foundations')).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Accounting I</span>
                  <span className="text-sm font-medium text-foreground">
                    {students.filter(s => s.modules_completed.includes('Accounting I')).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Finance & Valuation</span>
                  <span className="text-sm font-medium text-foreground">
                    {students.filter(s => s.modules_completed.includes('Finance & Valuation')).length}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Activity Metrics</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Quality Score</span>
                  <span className="text-sm font-medium text-foreground">
                    {students.length > 0 ? Math.round(students.reduce((acc, s) => acc + s.artifact_quality, 0) / students.length) : 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Streak</span>
                  <span className="text-sm font-medium text-foreground">
                    {students.length > 0 ? Math.round(students.reduce((acc, s) => acc + s.current_streak, 0) / students.length) : 0} days
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Active Students</span>
                  <span className="text-sm font-medium text-foreground">
                    {students.filter(s => s.current_streak > 0).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                />
              </div>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
              >
                <option value="talent_signal">Talent Signal</option>
                <option value="completion">Completion</option>
                <option value="quality">Quality</option>
                <option value="activity">Last Activity</option>
              </select>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">Filter:</label>
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as any)}
                className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
              >
                <option value="all">All Students</option>
                <option value="elite">Elite (80+)</option>
                <option value="strong">Strong (60-79)</option>
                <option value="promising">Promising (40-59)</option>
                <option value="developing">Developing (&lt;40)</option>
              </select>
            </div>

            {/* Refresh */}
            <button
              onClick={loadStudents}
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 flex items-center gap-2 transition-all duration-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Talent Signal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Quality
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Activity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredStudents.map((student) => {
                    const talentBadge = getTalentBadge(student.talent_signal);
                    return (
                      <tr key={student.user_id} className="hover:bg-muted/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                  {student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-foreground">
                                {student.name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {student.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getTalentIcon(student.talent_signal)}
                            <span className="text-sm font-medium text-foreground">
                              {student.talent_signal}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${talentBadge.color}`}>
                              {talentBadge.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-foreground">{student.completion_percentage}%</span>
                                <span className="text-muted-foreground">{student.modules_completed.length} modules</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2 mt-1">
                                <div 
                                  className="bg-gradient-to-r from-blue-600 to-blue-700 h-2 rounded-full" 
                                  style={{ width: `${student.completion_percentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-foreground">
                            {student.artifact_quality}/100
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {student.submissions_count} submissions
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-foreground">
                            {student.current_streak} day streak
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(student.last_activity).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => loadStudentDetail(student.user_id)}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Student Detail Modal */}
        {showStudentDetail && selectedStudent && (
          <div className="fixed inset-0 bg-black/50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-card border-border">
              <div className="mt-3">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-foreground">
                      {selectedStudent.student.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedStudent.student.email}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowStudentDetail(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Student Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
                    <div className="text-2xl font-bold text-foreground">
                      {selectedStudent.student.talent_signal}
                    </div>
                    <div className="text-sm text-muted-foreground">Talent Signal</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
                    <div className="text-2xl font-bold text-foreground">
                      {selectedStudent.student.completion_percentage}%
                    </div>
                    <div className="text-sm text-muted-foreground">Completion</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
                    <div className="text-2xl font-bold text-foreground">
                      {selectedStudent.student.artifact_quality}
                    </div>
                    <div className="text-sm text-muted-foreground">Quality Score</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
                    <div className="text-2xl font-bold text-foreground">
                      {formatTimeInvested(selectedStudent.student.total_time_invested)}
                    </div>
                    <div className="text-sm text-muted-foreground">Time Invested</div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-border mb-6">
                  <nav className="-mb-px flex space-x-8">
                    <button className="border-blue-500 text-blue-600 dark:text-blue-400 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm">
                      Artifacts
                    </button>
                    <button className="border-transparent text-muted-foreground hover:text-foreground hover:border-border whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm">
                      Progress
                    </button>
                    <button className="border-transparent text-muted-foreground hover:text-foreground hover:border-border whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm">
                      Feedback
                    </button>
                    <button className="border-transparent text-muted-foreground hover:text-foreground hover:border-border whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm">
                      Moderation
                    </button>
                  </nav>
                </div>

                {/* Artifacts Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          File
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Size
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Version
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Submitted
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {selectedStudent.artifacts.map((artifact) => (
                        <tr key={artifact.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                            {artifact.file_path.split('/').pop()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {artifact.file_type.toUpperCase()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {formatFileSize(artifact.file_size_bytes)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            v{artifact.version}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              artifact.validator_status === 'passed' 
                                ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 dark:from-blue-900/20 dark:to-blue-800/20 dark:text-blue-200'
                                : artifact.validator_status === 'failed'
                                ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 dark:from-red-900/20 dark:to-red-800/20 dark:text-red-200'
                                : 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 dark:from-yellow-900/20 dark:to-yellow-800/20 dark:text-yellow-200'
                            }`}>
                              {artifact.validator_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {new Date(artifact.submitted_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => downloadArtifact(artifact)}
                                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </button>
                              {artifact.feedback_score && (
                                <>
                                  <button
                                    onClick={() => flagFeedback(artifact.id)}
                                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1"
                                    title="Flag feedback for review"
                                  >
                                    <AlertCircle className="h-4 w-4" />
                                    Flag
                                  </button>
                                  <button
                                    onClick={() => regenerateFeedback(artifact.id)}
                                    className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 flex items-center gap-1"
                                    title="Regenerate AI feedback"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                    Regenerate
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
  );
}
