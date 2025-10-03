'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { learningAPI, type Feedback } from '@/lib/api/learning';

interface FeedbackDisplayProps {
  submissionId: number;
}

export default function FeedbackDisplay({ submissionId }: FeedbackDisplayProps) {
  const { getToken } = useAuth();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeedback();
  }, [submissionId]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) return;

      const data = await learningAPI.getFeedback(submissionId, token);
      setFeedback(data);
    } catch (err) {
      // Feedback might not exist yet
      setFeedback(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFeedback = async () => {
    try {
      setGenerating(true);
      setError(null);
      const token = await getToken();
      if (!token) return;

      await learningAPI.generateFeedback(submissionId, token);
      
      // Reload feedback after generation
      await loadFeedback();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate feedback');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">AI Feedback</h3>
        <p className="text-gray-600 mb-4">
          No feedback yet. Generate AI-powered analyst-grade feedback from our GPT-5 coach.
        </p>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        <button
          onClick={handleGenerateFeedback}
          disabled={generating}
          className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Generating Feedback...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Generate AI Feedback
            </>
          )}
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Powered by OpenAI GPT-5. Generates in 5-10 seconds.
        </p>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">AI Feedback</h3>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold px-3 py-1 rounded-lg ${getScoreColor(feedback.rubric_score)}`}>
              {feedback.rubric_score.toFixed(1)}/10
            </span>
            <span className="text-xs text-gray-500">Powered by {feedback.model_used}</span>
          </div>
        </div>

        {/* Main Feedback */}
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-700 leading-relaxed">{feedback.feedback_text}</p>
        </div>
      </div>

      {/* Strengths */}
      {feedback.strengths && feedback.strengths.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Strengths
          </h4>
          <ul className="space-y-2">
            {feedback.strengths.map((strength, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-green-600 mt-1">•</span>
                <span className="text-sm text-green-900">{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvements */}
      {feedback.improvements && feedback.improvements.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Areas for Improvement
          </h4>
          <ul className="space-y-2">
            {feedback.improvements.map((improvement, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-amber-600 mt-1">•</span>
                <span className="text-sm text-amber-900">{improvement}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Steps */}
      {feedback.next_steps && feedback.next_steps.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            Next Steps
          </h4>
          <ol className="space-y-2">
            {feedback.next_steps.map((step, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-600 font-semibold">{index + 1}.</span>
                <span className="text-sm text-blue-900">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
          <div>
            <span className="font-medium">Generated:</span> {new Date(feedback.created_at).toLocaleString()}
          </div>
          <div>
            <span className="font-medium">Tokens Used:</span> {feedback.tokens_used.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

