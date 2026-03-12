import { requireUser } from '@/lib/auth/session';
import { getEvidenceItemsByUser, getEvidenceSourcesByUser } from '@/lib/db/queries/evidence';
import { EvidenceList } from '@/components/evidence/evidence-list';
import Link from 'next/link';

export default async function EvidencePage() {
  const user = await requireUser();
  const items = await getEvidenceItemsByUser(user.id);
  const sources = await getEvidenceSourcesByUser(user.id);

  // Check for in-progress parses
  const inProgressSources = sources.filter(
    (source) => source.parseStatus === 'pending' || source.parseStatus === 'processing'
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-gray-900 mb-1 inline-block"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Evidence Bank</h1>
            </div>
            <div className="flex gap-2">
              <Link
                href="/dashboard/evidence/upload"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
              >
                Upload Resume
              </Link>
              <Link
                href="/dashboard/evidence/new"
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
              >
                Add Manually
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Show in-progress parse banner */}
        {inProgressSources.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mt-0.5"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Resume parsing in progress...</p>
                <p className="text-sm text-blue-700 mt-1">
                  {inProgressSources.length} resume{inProgressSources.length > 1 ? 's are' : ' is'}{' '}
                  being processed. This may take a minute.
                </p>
                <Link
                  href="/dashboard/evidence/upload"
                  className="text-sm text-blue-700 hover:text-blue-900 underline mt-2 inline-block"
                >
                  Check status
                </Link>
              </div>
            </div>
          </div>
        )}

        <EvidenceList items={items} />
      </main>
    </div>
  );
}
