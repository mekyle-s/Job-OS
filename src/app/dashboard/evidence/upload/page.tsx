'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ResumeUpload } from '@/components/evidence/resume-upload';
import { ParseStatus } from '@/components/evidence/parse-status';

function UploadFlow() {
  const [sourceId, setSourceId] = useState<string | null>(null);

  if (sourceId) {
    return <ParseStatus sourceId={sourceId} />;
  }

  return <ResumeUpload onUploadComplete={setSourceId} />;
}

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="mb-2">
            <Link
              href="/dashboard/evidence"
              className="text-sm text-gray-600 hover:text-gray-900 inline-block"
            >
              ← Back to Evidence Bank
            </Link>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Link href="/dashboard" className="hover:text-gray-900">
              Dashboard
            </Link>
            <span>›</span>
            <Link href="/dashboard/evidence" className="hover:text-gray-900">
              Evidence Bank
            </Link>
            <span>›</span>
            <span className="text-gray-900 font-medium">Upload Resume</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Upload Resume</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            Upload your resume and we'll extract your experiences, projects, skills, and education
            automatically. You can edit or remove any extracted items afterward.
          </p>
        </div>

        <UploadFlow />
      </main>
    </div>
  );
}
