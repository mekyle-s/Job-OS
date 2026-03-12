import { requireUser } from '@/lib/auth/session';
import { EvidenceForm } from '@/components/evidence/evidence-form';
import { createEvidenceAction } from '@/app/dashboard/evidence/actions';
import Link from 'next/link';

export default async function NewEvidencePage() {
  await requireUser();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link
            href="/dashboard/evidence"
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
          >
            ← Back to Evidence Bank
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Add Evidence</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manually add an experience, project, skill, or education entry to your evidence bank.
          </p>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <EvidenceForm mode="create" action={createEvidenceAction} />
        </div>
      </main>
    </div>
  );
}
