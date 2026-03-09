import { requireUser } from '@/lib/auth/session';
import { SignOutButton } from '@/components/auth/sign-out-button';

export default async function DashboardPage() {
  // Security boundary: server-side auth check with requireUser()
  // Middleware provides UX redirects, but this is the actual authorization check
  const user = await requireUser();

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
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Welcome, {user.name || 'User'}</h2>
          <p className="text-gray-600">Your dashboard is ready. Evidence Bank coming in Phase 3.</p>
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-500">User ID: {user.id}</p>
            <p className="text-sm text-gray-500">Email: {user.email}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
