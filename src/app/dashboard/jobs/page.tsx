'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  firstSeenAt: string;
  sourceUpdatedAt: string;
  parseStatus: 'pending' | 'processing' | 'completed' | 'failed';
  _count: { requirements: number };
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [hasCriteria, setHasCriteria] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [pollMessage, setPollMessage] = useState<string | null>(null);
  const limit = 20;

  useEffect(() => {
    async function loadJobs() {
      try {
        // Check if user has criteria
        const criteriaResponse = await fetch('/api/criteria');
        if (criteriaResponse.ok) {
          const criteriaData = await criteriaResponse.json();
          setHasCriteria(!!criteriaData.criteria);

          if (!criteriaData.criteria) {
            setIsLoading(false);
            return;
          }
        }

        // Load jobs
        const jobsResponse = await fetch(`/api/jobs?limit=${limit}&offset=${offset}`);
        if (jobsResponse.ok) {
          const jobsData = await jobsResponse.json();
          setJobs((prev) => [...prev, ...jobsData.jobs]);
          setHasMore(jobsData.jobs.length === limit);
        } else {
          const errorData = await jobsResponse.json();
          setError(errorData.error || 'Failed to load jobs');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load jobs');
      } finally {
        setIsLoading(false);
      }
    }

    loadJobs();
  }, [offset]);

  const loadMore = () => {
    setOffset((prev) => prev + limit);
  };

  const triggerPoll = async () => {
    setIsPolling(true);
    setPollMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/jobs/poll', { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        setPollMessage(
          `Poll queued! Fetching jobs from ${data.targetCompanies.length} companies. Refresh in 10-30 seconds to see results.`
        );
        // Auto-reload after 15 seconds
        setTimeout(() => {
          window.location.reload();
        }, 15000);
      } else {
        setError(data.error || 'Failed to trigger poll');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger poll');
    } finally {
      setIsPolling(false);
    }
  };

  // Freshness indicator helper
  const getFreshnessIndicator = (job: Job) => {
    const firstSeenDate = new Date(job.firstSeenAt);
    const updatedDate = new Date(job.sourceUpdatedAt);
    const now = new Date();
    const dayInMs = 24 * 60 * 60 * 1000;

    if (now.getTime() - firstSeenDate.getTime() < dayInMs) {
      return { type: 'new', label: 'New', className: 'bg-green-100 text-green-700' };
    }

    if (now.getTime() - updatedDate.getTime() < dayInMs) {
      return { type: 'updated', label: 'Updated', className: 'bg-blue-100 text-blue-700' };
    }

    return {
      type: 'old',
      label: formatDistanceToNow(updatedDate, { addSuffix: true }),
      className: 'text-gray-500',
    };
  };

  // Parse status indicator helper
  const getParseStatusIndicator = (status: Job['parseStatus']) => {
    switch (status) {
      case 'completed':
        return { icon: '✓', label: 'Parsed', className: 'text-green-600' };
      case 'processing':
        return { icon: '⟳', label: 'Processing', className: 'text-blue-600 animate-spin' };
      case 'pending':
        return { icon: '○', label: 'Pending', className: 'text-gray-400' };
      case 'failed':
        return { icon: '✗', label: 'Parse failed', className: 'text-red-600' };
    }
  };

  if (isLoading && jobs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (hasCriteria === false) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <Link
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900 mb-1 inline-block"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-lg font-medium text-gray-900 mb-2">No criteria set</h2>
            <p className="text-gray-600 mb-4">
              Set up your criteria to start monitoring jobs from your target companies.
            </p>
            <Link
              href="/dashboard/criteria"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Set up criteria
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-gray-900 mb-1 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
            <button
              onClick={triggerPoll}
              disabled={isPolling}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
            >
              {isPolling ? 'Polling...' : 'Trigger Poll'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {pollMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-700">{pollMessage}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {jobs.length === 0 && !isLoading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-lg font-medium text-gray-900 mb-2">No jobs found yet</h2>
            <p className="text-gray-600 mb-4">
              Jobs are polled hourly — check back soon or trigger a manual poll.
            </p>
            <button
              onClick={triggerPoll}
              disabled={isPolling}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isPolling ? 'Polling...' : 'Trigger Poll Now'}
            </button>
          </div>
        )}

        {jobs.length > 0 && (
          <div className="space-y-4">
            {jobs.map((job) => {
              const freshness = getFreshnessIndicator(job);
              const parseStatus = getParseStatusIndicator(job.parseStatus);

              return (
                <Link key={job.id} href={`/dashboard/jobs/${job.id}`}>
                  <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 hover:text-blue-600">
                          {job.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {job.company} • {job.location}
                        </p>
                        <div className="flex items-center gap-3 mt-3">
                          {/* Freshness indicator */}
                          {freshness.type === 'new' || freshness.type === 'updated' ? (
                            <span
                              className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${freshness.className}`}
                            >
                              {freshness.label}
                            </span>
                          ) : (
                            <span className={`text-xs ${freshness.className}`}>
                              {freshness.label}
                            </span>
                          )}

                          {/* Parse status */}
                          <div className="flex items-center gap-1">
                            <span className={parseStatus.className}>{parseStatus.icon}</span>
                            <span className="text-xs text-gray-500">{parseStatus.label}</span>
                          </div>

                          {/* Requirement count */}
                          {job.parseStatus === 'completed' && job._count.requirements > 0 && (
                            <span className="text-xs text-gray-500">
                              {job._count.requirements} requirement
                              {job._count.requirements !== 1 ? 's' : ''} extracted
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}

            {hasMore && (
              <div className="text-center pt-4">
                <button
                  onClick={loadMore}
                  className="px-6 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Load more
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
