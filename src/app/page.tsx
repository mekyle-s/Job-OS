import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-gray-900">Internship OS</h1>
        <p className="text-lg text-gray-600 max-w-md">
          Know which internships are worth your time and exactly how to prove you fit.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/sign-up"
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Get Started
          </Link>
          <Link
            href="/sign-in"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
