'use client';

import { Suspense } from 'react';
import { useMatchQueue } from '@/lib/hooks/use-match-queue';
import { useRunMatching } from '@/lib/hooks/use-role-brief';
import Link from 'next/link';
import { RoleCard } from './role-card';
import { QueueFilters, useStatusFilter } from './filters';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import type { RankedJob } from '@/lib/matching/ranker';
import { useRoleStatus } from '@/lib/hooks/use-role-status';

function MatchQueueContent() {
  const { data, isLoading, error, refetch } = useMatchQueue();
  const runMatching = useRunMatching();
  const statusFilter = useStatusFilter();

  if (isLoading) {
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
            <h1 className="text-2xl font-bold text-gray-900">Fresh Match Queue</h1>
            <p className="text-sm text-gray-600 mt-1">Ranked by fit and freshness</p>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
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
            <h1 className="text-2xl font-bold text-gray-900">Fresh Match Queue</h1>
            <p className="text-sm text-gray-600 mt-1">Ranked by fit and freshness</p>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-sm text-red-700 mb-4">
              {error instanceof Error ? error.message : 'Failed to load match queue'}
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  const queue: RankedJob[] = data?.queue || [];

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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Fresh Match Queue</h1>
              <p className="text-sm text-gray-600 mt-1">Ranked by fit and freshness</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {queue.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-lg font-medium text-gray-900 mb-2">No matches yet</h2>
            <p className="text-gray-600 mb-6">
              Set up your criteria and upload evidence to get started.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/dashboard/criteria"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Set up criteria
              </Link>
              <Link
                href="/dashboard/evidence"
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Upload evidence
              </Link>
            </div>
          </div>
        ) : (
          <>
            <QueueFilters />
            <FilteredQueueList queue={queue} statusFilter={statusFilter} />
          </>
        )}
      </main>
    </div>
  );
}

/**
 * Component that filters queue by status.
 * Each RoleCard fetches its own status and we filter client-side.
 */
function FilteredQueueList({ queue, statusFilter }: { queue: RankedJob[]; statusFilter: string }) {
  // For V1 simplicity: render all cards and let them fetch their own status
  // The filtering happens via CSS visibility based on status
  // This avoids complex state coordination at the cost of fetching all statuses
  return (
    <div className="space-y-4">
      {queue.map((job) => (
        <RoleCardWithFilter key={job.jobId} job={job} statusFilter={statusFilter} />
      ))}
    </div>
  );
}

/**
 * Wrapper that fetches status and conditionally renders the card.
 */
function RoleCardWithFilter({ job, statusFilter }: { job: RankedJob; statusFilter: string }) {
  const { data: roleStatus, isLoading } = useRoleStatus(job.jobId);

  // Determine if this card should be visible based on filter
  const shouldShow = () => {
    if (statusFilter === 'all') return true;
    // Show card while loading to avoid flash-of-empty
    if (isLoading) return true;
    // Once loaded, compare actual status to filter
    return roleStatus?.status === statusFilter;
  };

  if (!shouldShow()) {
    return null;
  }

  return <RoleCard job={job} />;
}

export default function MatchQueuePage() {
  return (
    <NuqsAdapter>
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm">
              <div className="max-w-4xl mx-auto px-4 py-4">
                <h1 className="text-2xl font-bold text-gray-900">Fresh Match Queue</h1>
              </div>
            </header>
            <main className="max-w-4xl mx-auto px-4 py-8">
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </main>
          </div>
        }
      >
        <MatchQueueContent />
      </Suspense>
    </NuqsAdapter>
  );
}
