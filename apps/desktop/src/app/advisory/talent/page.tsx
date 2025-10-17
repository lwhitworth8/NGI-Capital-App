'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { motion } from 'framer-motion';

interface StudentTalent {
  user_id: string;
  name: string;
  email: string;
  completion_percentage: number;
  artifact_quality_score: number;
  improvement_velocity: number;
  talent_signal: number;
  current_streak: number;
  modules_completed: string[];
  last_activity: string;
  submissions_count: number;
}

function KpiCard({ title, value, icon }: { title: string; value: string | number, icon: React.ReactNode }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.1)' }}
      className="bg-white rounded-lg border border-gray-200 p-6 cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm text-gray-600">{title}</span>
          <span className="text-3xl font-bold text-gray-900">{value}</span>
        </div>
        <div className="w-12 h-12 flex items-center justify-center bg-blue-100 rounded-full">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

export default function TalentTrackingPage() {
  const { getToken } = useAuth();
  const [students, setStudents] = useState<StudentTalent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'talent_signal' | 'completion' | 'quality'>('talent_signal');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadStudents();
  }, [sortBy]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/learning/admin/talent?sort=${sortBy}`, {
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
      console.error('Failed to load talent data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTalentBadge = (score: number) => {
    if (score >= 80) return { label: 'Elite', color: 'bg-purple-100 text-purple-800' };
    if (score >= 60) return { label: 'Strong', color: 'bg-blue-100 text-blue-800' };
    if (score >= 40) return { label: 'Promising', color: 'bg-green-100 text-green-800' };
    return { label: 'Developing', color: 'bg-gray-100 text-gray-800' };
  };

  const activeStudents = useMemo(() => students.length, [students]);
  const completedProfiles = useMemo(() => students.filter(s => s.completion_percentage === 100).length, [students]);
  const ucSchools = useMemo(() => students.filter(s => s.email.endsWith('.edu') && (s.email.includes('berkeley') || s.email.includes('ucla'))).length, [students]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Student Database
        </h1>
        <p className="text-gray-600">
          Identify top performers and track student progress across the learning platform
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <KpiCard
          title="Active Students"
          value={activeStudents}
          icon={<svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
        />
        <KpiCard
          title="Completed Profiles"
          value={completedProfiles}
          icon={<svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KpiCard
          title="UC Schools"
          value={ucSchools}
          icon={<svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.22 10.27a2.41 2.41 0 013.43 0L12 14.59l4.35-4.32a2.41 2.41 0 113.43 3.43L12 21.41l-7.78-7.71a2.41 2.41 0 010-3.43z" /></svg>}
        />
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="talent_signal">Talent Signal</option>
              <option value="completion">Completion</option>
              <option value="quality">Quality Score</option>
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={loadStudents}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Student Table */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-lg border border-gray-200">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-lg border border-gray-200">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p className="text-gray-600">No students found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Talent Signal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completion
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quality
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Velocity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Streak
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.map((student, index) => {
                  const badge = getTalentBadge(student.talent_signal);
                  
                  return (
                    <tr key={student.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {student.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{student.name}</div>
                            <div className="text-sm text-gray-500">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-gray-900">{student.talent_signal}</span>
                          <span className={`text-xs px-2 py-1 ${badge.color} rounded-full font-medium`}>
                            {badge.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${student.completion_percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {student.completion_percentage}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{student.artifact_quality_score}/100</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{student.improvement_velocity}%</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
                          </svg>
                          <span className="text-sm font-medium text-gray-900">{student.current_streak}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{student.submissions_count}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900">View Details</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Talent Signal Legend */}
      <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Talent Signal Methodology</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Completion (30%)</div>
            <div className="text-sm text-gray-600">Modules and activities completed relative to total available</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Artifact Quality (50%)</div>
            <div className="text-sm text-gray-600">GPT-5 rubric scores on submitted models, memos, and presentations</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Improvement Velocity (20%)</div>
            <div className="text-sm text-gray-600">Rate of score improvement between submission versions</div>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200">
          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full font-medium">Elite (80+)</span>
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">Strong (60-79)</span>
          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">Promising (40-59)</span>
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full font-medium">Developing (&lt;40)</span>
        </div>
      </div>
    </div>
  );
}

