"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, AlertCircle, CheckCircle2, FileText, Calendar, Upload } from 'lucide-react'
import { toast } from 'sonner'
import type { PublicProject } from '@/lib/api'

interface ApplicationModalProps {
  isOpen: boolean
  project: PublicProject | null
  onClose: () => void
  hasResumeUploaded: boolean
  resumeUrl?: string
  hasCoffeeChat?: boolean
}

export function ApplicationModal({ 
  isOpen, 
  project, 
  onClose, 
  hasResumeUploaded, 
  resumeUrl,
  hasCoffeeChat = false 
}: ApplicationModalProps) {
  const [applicationData, setApplicationData] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      setApplicationData({})
      setErrors({})
    }
  }, [isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    // Check required resume
    if (!hasResumeUploaded) {
      newErrors['resume'] = 'Please upload your resume in Settings before applying'
      return newErrors
    }

    // Check required questions
    const questions = (project as any)?.application_questions || []
    questions.forEach((q: any) => {
      if (q.is_required && !applicationData[`q_${q.id}`]?.trim()) {
        newErrors[`q_${q.id}`] = 'This field is required'
      }
    })

    setErrors(newErrors)
    return newErrors
  }

  const handleSubmit = async () => {
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      toast.error('Please fill out all required fields')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/public/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project?.id,
          responses: applicationData,
          resume_url: resumeUrl
        })
      })

      if (response.ok) {
        toast.success('Application submitted successfully!')
        onClose()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to submit application')
      }
    } catch (error) {
      console.error('Application error:', error)
      toast.error('An error occurred while submitting')
    } finally {
      setSubmitting(false)
    }
  }

  if (!project) return null

  const questions = (project as any)?.application_questions || []

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-3xl max-h-[90vh] bg-background rounded-2xl shadow-2xl overflow-hidden border border-border"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/80 hover:bg-accent text-foreground backdrop-blur-sm transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[90vh]">
              {/* Header */}
              <div className="p-8 pb-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-950/30 border-b border-border">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-blue-600">
                    <Send className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-foreground mb-1">
                      Apply to {project.project_name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Complete all required fields to submit your application
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-8 space-y-6">
                {/* Resume Status */}
                <div className={`p-4 rounded-xl border ${hasResumeUploaded ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'}`}>
                  <div className="flex items-start gap-3">
                    {hasResumeUploaded ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`font-semibold ${hasResumeUploaded ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                        {hasResumeUploaded ? 'Resume Verified' : 'Resume Required'}
                      </p>
                      <p className={`text-sm mt-1 ${hasResumeUploaded ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        {hasResumeUploaded 
                          ? 'Your resume from Settings will be included with this application' 
                          : 'Please upload your resume in Settings before applying to projects'}
                      </p>
                      {hasResumeUploaded && resumeUrl && (
                        <a 
                          href={resumeUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline mt-2 inline-flex items-center gap-1"
                        >
                          <FileText className="w-4 h-4" />
                          View Resume
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Coffee Chat Recommendation */}
                {!hasCoffeeChat && (
                  <div className="p-4 rounded-xl border bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                          Coffee Chat Recommended
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                          We recommend scheduling a coffee chat with the project leads to learn more before applying. 
                          This helps you understand the project better and make a stronger application.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Application Questions */}
                {hasResumeUploaded ? (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-foreground">Application Questions</h3>
                    
                    {questions.length > 0 ? (
                      questions.map((q: any, idx: number) => (
                        <motion.div
                          key={q.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="space-y-2"
                        >
                          <label className="block text-sm font-medium text-foreground">
                            {idx + 1}. {q.question_text}
                            {q.is_required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <textarea
                            rows={4}
                            className={`w-full px-4 py-3 rounded-xl border ${errors[`q_${q.id}`] ? 'border-red-500' : 'border-border'} bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none`}
                            placeholder="Type your answer here..."
                            value={applicationData[`q_${q.id}`] || ''}
                            onChange={e => {
                              setApplicationData({ ...applicationData, [`q_${q.id}`]: e.target.value })
                              if (errors[`q_${q.id}`]) {
                                const newErrors = { ...errors }
                                delete newErrors[`q_${q.id}`]
                                setErrors(newErrors)
                              }
                            }}
                          />
                          {errors[`q_${q.id}`] && (
                            <p className="text-sm text-red-500 flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" />
                              {errors[`q_${q.id}`]}
                            </p>
                          )}
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No application questions for this project.</p>
                        <p className="text-sm mt-1">Click submit to complete your application.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                      <Upload className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">Resume Required</h3>
                    <p className="text-muted-foreground mb-4">
                      Please upload your resume in Settings to continue with your application.
                    </p>
                    <a 
                      href="/settings" 
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Go to Settings
                    </a>
                  </div>
                )}
              </div>

              {/* Footer */}
              {hasResumeUploaded && (
                <div className="p-8 pt-6 bg-muted/30 border-t border-border">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                      <span className="text-red-500">*</span> Required field
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={onClose}
                        disabled={submitting}
                        className="px-6 py-2.5 rounded-xl border border-border bg-background text-foreground font-medium hover:bg-accent transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={submitting || !hasResumeUploaded}
                        className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {submitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Submit Application
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

