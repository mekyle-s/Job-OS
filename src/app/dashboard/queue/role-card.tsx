'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { RankedJob } from '@/lib/matching/ranker';

interface RoleCardProps {
  job: RankedJob;
}

export function RoleCard({ job }: RoleCardProps) {
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

  // Calculate freshness indicator
  const freshnessText = formatDistanceToNow(new Date(job.sourceUpdatedAt), {
    addSuffix: true,
  });

  // Determine next action based on mapping coverage
  const nextAction = job.mappedRequirements === 0
    ? 'Run matching to see fit'
    : job.mappedRequirements < job.totalRequirements
    ? 'Review gaps'
    : 'Review proof';

  return (
    <Link href={`/dashboard/roles/${job.jobId}/brief`}>
      <div className="bg-white border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 hover:text-blue-600">
              {job.title}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {job.company} • {job.location}
            </p>
          </div>
          <div className="ml-4">
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getFitBandStyle(job.fitBand)}`}
            >
              {job.fitBand} Fit
            </span>
          </div>
        </div>

        {/* Top fit reasons */}
        {job.fitReasons.length > 0 && (
          <div className="mb-3 space-y-1">
            {job.fitReasons.slice(0, 3).map((reason, idx) => (
              <p key={idx} className="text-sm text-gray-600">
                • {reason}
              </p>
            ))}
          </div>
        )}

        {/* Footer: coverage, freshness, next action */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>
              {job.mappedRequirements} of {job.totalRequirements} requirements covered
            </span>
            <span>Posted {freshnessText}</span>
          </div>
          <div>
            <span className="text-blue-600 font-medium text-sm">{nextAction} →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
