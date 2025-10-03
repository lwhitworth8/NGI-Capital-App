'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { learningAPI, type Leaderboard as LeaderboardType } from '@/lib/api/learning';

interface LeaderboardProps {
  companyId: number;
}

export default function Leaderboard({ companyId }: LeaderboardProps) {
  const { getToken } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [priceTarget, setPriceTarget] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, [companyId]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) return;

      const data = await learningAPI.getLeaderboard(companyId, token);
      setLeaderboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPriceTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const target = parseFloat(priceTarget);
    if (isNaN(target) || target <= 0) {
      setError('Please enter a valid price target');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const token = await getToken();
      if (!token) return;

      await learningAPI.submitToLeaderboard(companyId, target, token);
      
      // Reload leaderboard
      await loadLeaderboard();
      setPriceTarget('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit price target');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (error && !leaderboard) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  const hasSubmissions = leaderboard && leaderboard.total_submissions > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Leaderboard</h2>
        <p className="text-gray-600">
          Anonymized price target distribution for {leaderboard?.ticker}
        </p>
      </div>

      {/* Submit Price Target */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Submit Your Price Target</h3>
        <p className="text-sm text-blue-800 mb-4">
          After completing your DCF and comp valuations, submit your 12-month price target.
        </p>
        <form onSubmit={handleSubmitPriceTarget} className="flex gap-2">
          <div className="flex-1">
            <input
              type="number"
              step="0.01"
              value={priceTarget}
              onChange={(e) => setPriceTarget(e.target.value)}
              placeholder="Enter price target (e.g., 285.50)"
              disabled={submitting}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !priceTarget}
            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>
        {error && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}
      </div>

      {/* Statistics */}
      {hasSubmissions ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">
                ${leaderboard.statistics.min.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Minimum</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                ${leaderboard.statistics.median.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Median</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">
                ${leaderboard.statistics.mean.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Average</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">
                ${leaderboard.statistics.max.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Maximum</div>
            </div>
          </div>

          {/* Distribution Visualization */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Price Target Distribution</h3>
            <div className="space-y-2">
              {/* Simple histogram */}
              <div className="relative h-48 flex items-end gap-1">
                {(() => {
                  const bucketSize = (leaderboard.statistics.max - leaderboard.statistics.min) / 10;
                  const buckets = Array(10).fill(0);
                  
                  leaderboard.price_targets.forEach(target => {
                    const bucketIndex = Math.min(
                      Math.floor((target - leaderboard.statistics.min) / bucketSize),
                      9
                    );
                    buckets[bucketIndex]++;
                  });
                  
                  const maxCount = Math.max(...buckets);
                  
                  return buckets.map((count, index) => {
                    const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    return (
                      <div
                        key={index}
                        className="flex-1 bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                        style={{ height: `${height}%` }}
                        title={`${count} submissions`}
                      />
                    );
                  });
                })()}
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>${leaderboard.statistics.min.toFixed(0)}</span>
                <span>${leaderboard.statistics.max.toFixed(0)}</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-4 text-center">
              {leaderboard.total_submissions} total submission{leaderboard.total_submissions !== 1 ? 's' : ''}
            </p>
          </div>
        </>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-600">No submissions yet. Be the first to submit a price target!</p>
        </div>
      )}
    </div>
  );
}

