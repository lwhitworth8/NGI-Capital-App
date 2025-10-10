'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { LEARNING_MODULES } from '@/types/learning';
import CompanySelector from '@/components/learning/CompanySelector';
import { learningAPI, type LearningContentItem } from '@/lib/api/learning';
import { LessonContent } from '@/components/learning/LessonContent';
import { motion } from 'framer-motion';

export default function ModuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<LearningContentItem[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<LearningContentItem | null>(null);
  
  const moduleId = params.module_id as string;
  const module = LEARNING_MODULES.find(m => m.id === moduleId);

  useEffect(() => {
    if (!module || module.status !== 'available') {
      router.push('/learning');
      return;
    }
    loadProgress();
    // Load module content
    loadModuleContent();
  }, [module, router]);

  const loadProgress = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const data = await learningAPI.getProgress(token);
      setProgress(data);
    } catch (err) {
      console.error('Failed to load progress:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySelected = async (companyId: number) => {
    await loadProgress();
  };

  const loadModuleContent = async () => {
    try {
      setContentLoading(true);
      setContentError(null);
      const token = await getToken();
      if (!token || !module) return;
      const data = await learningAPI.getModuleContent(module.id, token);
      setContent(data || []);
    } catch (err) {
      setContentError(err instanceof Error ? err.message : 'Failed to load content');
      setContent([]);
    } finally {
      setContentLoading(false);
    }
  };

  if (loading || !module) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getColorClasses = (color: string) => {
    const colors: { [key: string]: any } = {
      blue: {
        bg: 'bg-blue-50 dark:bg-blue-950',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-blue-900 dark:text-blue-100',
        accent: 'text-blue-600 dark:text-blue-400',
      },
      green: {
        bg: 'bg-green-50 dark:bg-green-950',
        border: 'border-green-200 dark:border-green-800',
        text: 'text-green-900 dark:text-green-100',
        accent: 'text-green-600 dark:text-green-400',
      },
      emerald: {
        bg: 'bg-emerald-50 dark:bg-emerald-950',
        border: 'border-emerald-200 dark:border-emerald-800',
        text: 'text-emerald-900 dark:text-emerald-100',
        accent: 'text-emerald-600 dark:text-emerald-400',
      },
      teal: {
        bg: 'bg-teal-50 dark:bg-teal-950',
        border: 'border-teal-200 dark:border-teal-800',
        text: 'text-teal-900 dark:text-teal-100',
        accent: 'text-teal-600 dark:text-teal-400',
      },
      purple: {
        bg: 'bg-purple-50 dark:bg-purple-950',
        border: 'border-purple-200 dark:border-purple-800',
        text: 'text-purple-900 dark:text-purple-100',
        accent: 'text-purple-600 dark:text-purple-400',
      },
    };
    return colors[color] || colors.blue;
  };

  const colors = getColorClasses(module.color);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className={`${colors.bg} border-b ${colors.border}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.push('/learning')}
            className={`flex items-center gap-2 ${colors.accent} hover:underline mb-4`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Learning Center
          </button>
          
          <div>
            <h1 className={`text-4xl font-bold ${colors.text} mb-2`}>
              {module.title}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {module.description}
            </p>
            <div className="flex items-center gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
              <span>{module.duration}</span>
              <span>•</span>
              <span>{module.units} units</span>
              <span>•</span>
              <span>Self-paced</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Progress & Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Progress Card */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Your Progress</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Completion</span>
                      <span className="font-medium text-gray-900 dark:text-white">0%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className={`${colors.accent.replace('text-', 'bg-')} h-2 rounded-full`} style={{ width: '0%' }} />
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <div>0 of {module.units} units completed</div>
                    <div>Estimated time remaining: {module.duration}</div>
                  </div>
                </div>
              </div>

              {/* Unit Navigation */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Units</h3>
                <div className="space-y-2">
                  {Array.from(new Set(content.filter(c => c.unit_id).map(c => c.unit_id as string))).map((uid) => (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      key={uid}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                      onClick={() => {
                        // Scroll to unit section
                        const el = document.getElementById(`unit-${uid}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                          {(uid || '').replace(/_/g, ' ')}
                        </span>
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Step 1: Select Company */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-8 h-8 rounded-full ${colors.bg} flex items-center justify-center`}>
                  <span className={`font-bold ${colors.accent}`}>1</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Select Your Company
                </h2>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Choose one company from our curated list to analyze throughout this module. You'll work with real financial data to build models and insights.
              </p>

              <CompanySelector
                onCompanySelected={handleCompanySelected}
                selectedCompanyId={progress?.selected_company_id}
              />
            </div>

            {/* Step 2: Module Content (locked until company selected) */}
            {!progress?.selected_company_id ? (
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Content Locked
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Select a company above to unlock the module content and begin learning.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Module Introduction */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-8 h-8 rounded-full ${colors.bg} flex items-center justify-center`}>
                      <span className={`font-bold ${colors.accent}`}>2</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Start Learning Center
                    </h2>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Begin with Unit 1 to master the fundamentals. Each unit includes interactive lessons, exercises, and real-world applications.
                  </p>

                  <button className={`w-full py-3 px-6 ${colors.accent.replace('text-', 'bg-')} text-white font-medium rounded-lg hover:opacity-90 transition-opacity`}>
                    Start Unit 1
                  </button>
                </div>

                {/* Lessons */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Lessons</h3>
                  {contentLoading && (
                    <div className="text-sm text-gray-500">Loading lessons...</div>
                  )}
                  {contentError && (
                    <div className="text-sm text-red-600">Error: {contentError}</div>
                  )}
                  {!contentLoading && !contentError && (
                    <div className="space-y-6">
                      {Array.from(new Set(content.filter(c => c.unit_id).map(c => c.unit_id as string))).map((uid) => (
                        <div key={uid} id={`unit-${uid}`} className="space-y-2">
                          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">{(uid || '').replace(/_/g, ' ')}</div>
                          <div className="grid gap-2">
                            {content.filter(c => c.unit_id === uid && c.lesson_id).map((lesson) => (
                              <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                key={lesson.id}
                                onClick={() => setSelectedLesson(lesson)}
                                className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{lesson.title}</div>
                                    <div className="text-xs text-gray-500">
                                      {lesson.estimated_duration_minutes ? `${lesson.estimated_duration_minutes} min` : ''} {lesson.difficulty_level ? ` • ${lesson.difficulty_level}` : ''}
                                    </div>
                                  </div>
                                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Lesson Renderer */}
                {selectedLesson && (
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{selectedLesson.title}</h3>
                      <button
                        onClick={() => setSelectedLesson(null)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >Close</button>
                    </div>
                    <LessonContent
                      content={{
                        id: selectedLesson.id,
                        title: selectedLesson.title,
                        content_type: selectedLesson.content_type,
                        content_markdown: selectedLesson.content_markdown || undefined,
                        content_url: selectedLesson.content_url || undefined,
                        estimated_duration_minutes: selectedLesson.estimated_duration_minutes || undefined,
                        difficulty_level: selectedLesson.difficulty_level || undefined,
                        animation_id: selectedLesson.animation_id || undefined,
                        interactive_tool_id: selectedLesson.interactive_tool_id || undefined,
                        prerequisites: selectedLesson.prerequisites || [],
                        tags: selectedLesson.tags || [],
                      }}
                      onComplete={async () => {
                        try {
                          const token = await getToken();
                          if (!token) return;
                          await learningAPI.markLessonComplete(
                            selectedLesson.lesson_id || String(selectedLesson.id),
                            { module_id: selectedLesson.module_id, unit_id: selectedLesson.unit_id || undefined },
                            token
                          );
                        } catch (e) {
                          // non-blocking
                          console.warn('Failed to mark complete', e);
                        }
                      }}
                    />
                  </div>
                )}

                {/* Resources */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Resources</h3>
                  <div className="space-y-3">
                    <a href="#" className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                      <div className="flex items-center gap-3">
                        <svg className={`w-5 h-5 ${colors.accent}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Module Syllabus</span>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                    <a href="#" className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                      <div className="flex items-center gap-3">
                        <svg className={`w-5 h-5 ${colors.accent}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Recommended Textbooks</span>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                    <a href="#" className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                      <div className="flex items-center gap-3">
                        <svg className={`w-5 h-5 ${colors.accent}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">FAQ & Help</span>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

