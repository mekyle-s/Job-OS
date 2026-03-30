'use client';

import { MappingControls } from './mapping-controls';
import type { RequirementWithEvidence } from '@/lib/matching/gap-analyzer';

interface RequirementRowProps {
  requirement: RequirementWithEvidence;
  jobId: string;
}

export function RequirementRow({ requirement, jobId }: RequirementRowProps) {
  // Styling for decision badges
  const getDecisionStyle = (decision: string) => {
    switch (decision) {
      case 'match':
        return 'bg-green-100 text-green-800';
      case 'weak_match':
        return 'bg-yellow-100 text-yellow-800';
      case 'no_match':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Styling for confidence band badges
  const getConfidenceBandStyle = (band: string) => {
    switch (band) {
      case 'high':
        return 'bg-blue-100 text-blue-800';
      case 'medium':
        return 'bg-gray-100 text-gray-700';
      case 'low':
        return 'bg-gray-100 text-gray-500';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      {/* Requirement text */}
      <div className="mb-3">
        <p className="text-sm font-medium text-gray-900">{requirement.normalizedText}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
            {requirement.category.replace(/_/g, ' ')}
          </span>
          <span
            className={`inline-block px-2 py-1 rounded text-xs font-medium ${
              requirement.priority === 'required'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {requirement.priority}
          </span>
        </div>
      </div>

      {/* Evidence mappings */}
      {requirement.evidenceMappings && requirement.evidenceMappings.length > 0 ? (
        <div className="space-y-3">
          {requirement.evidenceMappings.map((mapping) => (
            <div key={mapping.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {mapping.evidenceTitle}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${getDecisionStyle(mapping.decision)}`}
                  >
                    {mapping.decision.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${getConfidenceBandStyle(mapping.confidenceBand)}`}
                  >
                    {mapping.confidenceBand} confidence
                  </span>
                  {mapping.needsReview && (
                    <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                      needs review
                    </span>
                  )}
                </div>
              </div>

              {/* Mapping controls */}
              <MappingControls mappingId={mapping.id} jobId={jobId} />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          <p className="text-sm text-gray-500 italic">No evidence mapped</p>
        </div>
      )}
    </div>
  );
}
