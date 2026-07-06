'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useRoleBrief } from '@/lib/hooks/use-role-brief';

export default function RoleExportPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const { data: brief, isLoading, error } = useRoleBrief(jobId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-sm text-red-700">
            {error instanceof Error ? error.message : 'Failed to load role brief'}
          </p>
        </div>
      </div>
    );
  }

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

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white;
          }
          .print-container {
            max-width: none;
            padding: 0;
            box-shadow: none;
          }
          .page-break {
            page-break-before: always;
          }
          @page {
            margin: 2cm;
          }
        }
        .print-container {
          font-family: Georgia, serif;
        }
      `}</style>

      <div className="min-h-screen bg-gray-50 py-8">
        {/* Screen-only controls */}
        <div className="no-print max-w-[210mm] mx-auto px-8 mb-6">
          <div className="flex items-center justify-between">
            <Link
              href={`/dashboard/roles/${jobId}/brief`}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to Role Brief
            </Link>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
            >
              Print / Save as PDF
            </button>
          </div>
        </div>

        {/* Printable content */}
        <div className="print-container max-w-[210mm] mx-auto bg-white shadow-lg p-12">
          {/* Header */}
          <header className="mb-8 pb-6 border-b-2 border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{brief.title}</h1>
            <p className="text-xl text-gray-700 mb-1">{brief.company}</p>
            <p className="text-sm text-gray-500">Generated on {currentDate}</p>
          </header>

          {/* Fit Summary */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Fit Summary</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex gap-8 mb-4">
                <div>
                  <span className="text-sm text-gray-600">Fit Band:</span>
                  <span className="ml-2 font-semibold text-gray-900">{brief.fitBand}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Covered:</span>
                  <span className="ml-2 font-semibold text-green-700">
                    {brief.fitSummary.covered}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Gaps:</span>
                  <span className="ml-2 font-semibold text-red-700">{brief.fitSummary.gaps}</span>
                </div>
              </div>
              {brief.fitReasons.length > 0 && (
                <div className="space-y-2 mt-4">
                  {brief.fitReasons.map((reason: string, idx: number) => (
                    <p key={idx} className="text-sm text-gray-800">
                      • {reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Recommended Emphasis */}
          {brief.recommendedEmphasis.length > 0 && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Recommended Emphasis</h2>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 mb-3">
                  Highlight these points in your application:
                </p>
                <ul className="space-y-2">
                  {brief.recommendedEmphasis.map((item: string, idx: number) => (
                    <li key={idx} className="text-sm text-gray-800">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Covered Requirements */}
          {brief.requirementMap.covered.length > 0 && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Covered Requirements</h2>
              {Object.entries(groupedCovered).map(
                ([category, requirements]: [string, CoveredRequirements]) => (
                  <div key={category} className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 uppercase tracking-wide mb-3 border-b border-gray-300 pb-1">
                      {category.replace(/_/g, ' ')}
                    </h3>
                    <div className="space-y-4">
                      {requirements.map((req: RequirementItem) => (
                        <div
                          key={req.id}
                          className="border-l-4 border-green-400 bg-green-50 p-4 rounded-r-lg"
                        >
                          <p className="text-sm font-semibold text-gray-900 mb-2">
                            {req.normalizedText}
                          </p>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-white border border-gray-300 text-gray-700">
                              {req.priority}
                            </span>
                          </div>
                          {req.evidenceMappings && req.evidenceMappings.length > 0 && (
                            <div className="space-y-3 mt-3">
                              {req.evidenceMappings.map((mapping: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="bg-white p-3 rounded border border-gray-200"
                                >
                                  <p className="text-xs font-semibold text-gray-700 mb-1">
                                    {mapping.evidenceTitle || 'Evidence'}
                                  </p>
                                  <p className="text-xs text-gray-600 italic mb-2">
                                    "{mapping.sourceEvidenceExcerpt}"
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">
                                      Confidence: {mapping.confidenceBand}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </section>
          )}

          {/* Gaps */}
          {brief.requirementMap.gaps.length > 0 && (
            <section className="mb-8 page-break">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Gaps ({brief.requirementMap.gaps.length})
              </h2>
              <div className="space-y-3">
                {brief.requirementMap.gaps.map((gap: RequirementItem) => (
                  <div
                    key={gap.id}
                    className="border-l-4 border-red-400 bg-red-50 p-4 rounded-r-lg"
                  >
                    <p className="text-sm font-semibold text-gray-900 mb-2">{gap.normalizedText}</p>
                    <div className="flex items-center gap-2">
                      <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-white border border-gray-300 text-gray-700">
                        {gap.category.replace(/_/g, ' ')}
                      </span>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          gap.priority === 'required'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                        }`}
                      >
                        {gap.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Footer */}
          <footer className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
            Generated by Job OS on {currentDate}
          </footer>
        </div>
      </div>
    </>
  );
}
