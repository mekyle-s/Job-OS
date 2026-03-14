import { requireUser } from '@/lib/auth/session';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { getEvidenceItemsByUser } from '@/lib/db/queries/evidence';
import { getUserCriteria } from '@/lib/db/queries/user-criteria';
import Link from 'next/link';

export default async function DashboardPage() {
  // Security boundary: server-side auth check with requireUser()
  // Middleware provides UX redirects, but this is the actual authorization check
  const user = await requireUser();
  const evidenceItems = await getEvidenceItemsByUser(user.id);
  const criteria = await getUserCriteria(user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900">Internship OS</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2">
          {/* User Info Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Welcome, {user.name || 'User'}</h2>
            <p className="text-gray-600 mb-4">Your dashboard is ready.</p>
            <div className="p-4 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-500">User ID: {user.id}</p>
              <p className="text-sm text-gray-500">Email: {user.email}</p>
            </div>
          </div>

          {/* Evidence Bank Card */}
          <Link href="/dashboard/evidence" className="block">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition h-full">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Evidence Bank</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {evidenceItems.length === 0
                      ? 'No evidence items yet'
                      : `${evidenceItems.length} evidence item${evidenceItems.length === 1 ? '' : 's'}`}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="text-sm font-medium text-blue-600 hover:text-blue-700">
                  Manage Evidence →
                </span>
              </div>
            </div>
          </Link>

          {/* Jobs Card */}
          <Link href="/dashboard/jobs" className="block">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition h-full">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Jobs</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {criteria
                      ? `Monitoring ${criteria.targetCompanies.length} ${criteria.targetCompanies.length === 1 ? 'company' : 'companies'}`
                      : 'No criteria set up yet'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <Link
                  href="/dashboard/criteria"
                  className="block text-sm font-medium text-green-600 hover:text-green-700"
                >
                  {criteria ? 'Edit job criteria' : 'Set up job criteria'} →
                </Link>
                {criteria && (
                  <Link
                    href="/dashboard/jobs"
                    className="block text-sm font-medium text-green-600 hover:text-green-700"
                  >
                    Browse jobs →
                  </Link>
                )}
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
