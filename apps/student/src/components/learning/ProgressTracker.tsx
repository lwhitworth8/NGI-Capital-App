'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { learningAPI, type Progress } from '@/lib/api/learning';

interface ProgressTrackerProps {
  companyId?: number | null;
}

export default function ProgressTracker({ companyId }: ProgressTrackerProps) {
  const { getToken } = useAuth();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadProgress();
  }, []);

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

  const handleUpdateStreak = async () => {
    try {
      setUpdating(true);
      const token = await getToken();
      if (!token) return;

      const result = await learningAPI.updateStreak(token);
      
      // Reload progress to get updated streak
      await loadProgress();

      if (result.milestone_achieved) {
        // Show milestone toast
        alert(`Milestone achieved! ${result.current_streak} day streak!`);
      }
    } catch (err) {
      console.error('Failed to update streak:', err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (!progress) {
    return null;
  }

  const streakPercentage = Math.min((progress.current_streak_days / 30) * 100, 100);
  const nextMilestone = [7, 14, 30, 60, 90, 180, 365].find(m => m > progress.current_streak_days) || 365;

  return (
    <div className="space-y-4">
      {/* Streak Card */}
      <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Learning Center Streak</h3>
            <p className="text-sm text-gray-600">Keep building momentum!</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-orange-600">{progress.current_streak_days}</div>
            <div className="text-xs text-gray-600">days</div>
          </div>
        </div>

        {/* Streak Progress Bar */}
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-orange-400 to-red-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${streakPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-2">
            {streakPercentage < 100 ? `${nextMilestone - progress.current_streak_days} days to ${nextMilestone}-day milestone` : 'Amazing! Keep going!'}
          </p>
        </div>

        {/* Update Streak Button */}
        <button
          onClick={handleUpdateStreak}
          disabled={updating}
          className="mt-4 w-full py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updating ? 'Updating...' : 'Log Today\'s Activity'}
        </button>

        {progress.longest_streak_days > progress.current_streak_days && (
          <p className="text-xs text-gray-600 mt-2 text-center">
            Your best: {progress.longest_streak_days} days
          </p>
        )}
      </div>

      {/* Activities Completed */}
      {progress.activities_completed && progress.activities_completed.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Completed Activities</h3>
          <div className="space-y-2">
            {progress.activities_completed.map((activity, index) => (
              <div key={index} className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-700">{activity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{progress.current_streak_days}</div>
          <div className="text-sm text-gray-600">Current Streak</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">{progress.longest_streak_days}</div>
          <div className="text-sm text-gray-600">Longest Streak</div>
        </div>
      </div>
    </div>
  );
}

