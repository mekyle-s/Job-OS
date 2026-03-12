import { requireUser } from '@/lib/auth/session';
import { getEvidenceItemById } from '@/lib/db/queries/evidence';
import { EvidenceForm } from '@/components/evidence/evidence-form';
import { updateEvidenceAction } from '@/app/dashboard/evidence/actions';
import { notFound } from 'next/navigation';
import Link from 'next/link';

interface EditEvidencePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditEvidencePage({ params }: EditEvidencePageProps) {
  const user = await requireUser();
  const { id } = await params;

  // Fetch the evidence item
  const item = await getEvidenceItemById(id, user.id);

  if (!item) {
    notFound();
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Edit Evidence</h1>
          <p className="text-sm text-gray-600 mt-1">Update your evidence item details.</p>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <EvidenceForm mode="edit" initialData={item} action={updateEvidenceAction} />
        </div>
      </main>
    </div>
  );
}
