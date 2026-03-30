'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useRoleBrief, useRunMatching } from '@/lib/hooks/use-role-brief';
import { RequirementRow } from './requirement-row';

export default function RoleBriefPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const { data: brief, isLoading, error } = useRoleBrief(jobId);
  const runMatching = useRunMatching();

  const handleRunMatching = async () => {
    try {
      await runMatching.mutateAsync(jobId);
    } catch (err) {
      console.error('Failed to run matching:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <Link
              href="/dashboard/queue"
              className="text-sm text-gray-600 hover:text-gray-900 mb-1 inline-block"
            >
              ← Back to Queue
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Role Brief</h1>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <Link
              href="/dashboard/queue"
              className="text-sm text-gray-600 hover:text-gray-900 mb-1 inline-block"
            >
              ← Back to Queue
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Role Brief</h1>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-sm text-red-700">
              {error instanceof Error ? error.message : 'Failed to load role brief'}
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Determine fit band styling
  const getFitBandStyle = (fitBand: string) => {
    switch (fitBand) {
      case 'High':
        return 'bg-green-100 text-green-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Determine matching state button
  const getMatchingButton = () => {
    if (runMatching.isPending) {
      return (
        <button
          disabled
          className="px-4 py-2 bg-gray-400 text-white rounded-lg font-medium text-sm cursor-not-allowed"
        >
          Running...
        </button>
      );
    }

    if (brief.matchingState === 'not_matched') {
      return (
        <button
          onClick={handleRunMatching}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
        >
          Run Matching
        </button>
      );
    }

    if (brief.matchingState === 'stale') {
      return (
        <button
          onClick={handleRunMatching}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-medium text-sm"
        >
          Re-run Matching
        </button>
      );
    }

    return null;
  };

  // Group covered requirements by category
  type CoveredRequirements = typeof brief.requirementMap.covered;
  type RequirementItem = CoveredRequirements[number];
  const groupedCovered = brief.requirementMap.covered.reduce(
    (acc: Record<string, CoveredRequirements>, req: RequirementItem) => {
      if (!acc[req.category]) {
        acc[req.category] = [];
      }
      acc[req.category].push(req);
      return acc;
    },
    {} as Record<string, CoveredRequirements>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Link
            href="/dashboard/queue"
            className="text-sm text-gray-600 hover:text-gray-900 mb-1 inline-block"
          >
            ← Back to Queue
          </Link>
          <div className="flex items-center justify-between mt-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{brief.title}</h1>
              <p className="text-sm text-gray-600 mt-1">{brief.company}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-block px-4 py-2 rounded-lg text-lg font-medium ${getFitBandStyle(brief.fitBand)}`}
              >
                {brief.fitBand} Fit
              </span>
              {getMatchingButton()}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Fit Summary Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Fit Summary</h2>
          <div className="space-y-3">
            {/* Fit reasons */}
            {brief.fitReasons.length > 0 && (
              <div className="space-y-2">
                {brief.fitReasons.map((reason: string, idx: number) => (
                  <p key={idx} className="text-sm text-gray-700">
                    • {reason}
                  </p>
                ))}
              </div>
            )}

            {/* Requirements summary */}
            <div className="flex gap-6 pt-3 border-t border-gray-100">
              <div>
                <span className="text-2xl font-bold text-green-600">
                  {brief.fitSummary.covered}
                </span>
                <span className="text-sm text-gray-600 ml-1">covered</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-red-600">
                  {brief.fitSummary.gaps}
                </span>
                <span className="text-sm text-gray-600 ml-1">gaps</span>
              </div>
              {brief.fitSummary.needsReview > 0 && (
                <div>
                  <span className="text-2xl font-bold text-yellow-600">
                    {brief.fitSummary.needsReview}
                  </span>
                  <span className="text-sm text-gray-600 ml-1">need review</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recommended Emphasis */}
        {brief.recommendedEmphasis.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-md font-semibold text-blue-900 mb-3">
              Highlight these in your application:
            </h3>
            <ul className="space-y-2">
              {brief.recommendedEmphasis.map((item: string, idx: number) => (
                <li key={idx} className="text-sm text-blue-800">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Covered Requirements Section */}
        {brief.requirementMap.covered.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Covered Requirements
            </h2>
            <div className="space-y-6">
              {Object.entries(groupedCovered).map(
                ([category, requirements]: [string, CoveredRequirements]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                      {category.replace(/_/g, ' ')}
                    </h3>
                    <div className="space-y-4">
                      {requirements.map((req: RequirementItem) => (
                        <RequirementRow key={req.id} requirement={req} jobId={jobId} />
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Gaps Section */}
        {brief.requirementMap.gaps.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-red-600">⚠</span>
              Gaps ({brief.requirementMap.gaps.length})
            </h2>
            <div className="space-y-3">
              {brief.requirementMap.gaps.map((gap: RequirementItem) => (
                <div
                  key={gap.id}
                  className="border-l-4 border-red-300 bg-red-50 p-4 rounded-r-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-medium">
                        {gap.normalizedText}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {gap.category.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            gap.priority === 'required'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {gap.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
