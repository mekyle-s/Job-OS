import { requireUser } from '@/lib/auth/session';
import { getEvidenceItemsByUser } from '@/lib/db/queries/evidence';
import { EvidenceList } from '@/components/evidence/evidence-list';
import Link from 'next/link';

export default async function EvidencePage() {
  const user = await requireUser();
  const items = await getEvidenceItemsByUser(user.id);

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
            <Link
              href="/dashboard/evidence/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
            >
              Add Manually
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <EvidenceList items={items} />
      </main>
    </div>
  );
}
