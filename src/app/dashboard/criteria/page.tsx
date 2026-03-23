'use client';

import { useState, useEffect, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type CriteriaFormData = {
  jobFunction: string;
  locations: string[];
  visaRequired: boolean;
  targetCompanies: string[];
};

export default function CriteriaPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<CriteriaFormData>({
    jobFunction: '',
    locations: [],
    visaRequired: false,
    targetCompanies: [],
  });

  const [locationInput, setLocationInput] = useState('');
  const [companyInput, setCompanyInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load existing criteria on mount
  useEffect(() => {
    async function loadCriteria() {
      try {
        const response = await fetch('/api/criteria');
        if (response.ok) {
          const data = await response.json();
          if (data.criteria) {
            setFormData({
              jobFunction: data.criteria.jobFunction || '',
              locations: data.criteria.locations || [],
              visaRequired: data.criteria.visaRequired || false,
              targetCompanies: data.criteria.targetCompanies || [],
            });
          }
        }
      } catch (err) {
        console.error('Failed to load criteria:', err);
      } finally {
        setIsFetching(false);
      }
    }

    loadCriteria();
  }, []);

  // Add location on Enter
  const handleLocationKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && locationInput.trim()) {
      e.preventDefault();
      if (!formData.locations.includes(locationInput.trim())) {
        setFormData({
          ...formData,
          locations: [...formData.locations, locationInput.trim()],
        });
      }
      setLocationInput('');
    }
  };

  // Remove location chip
  const removeLocation = (location: string) => {
    setFormData({
      ...formData,
      locations: formData.locations.filter((l) => l !== location),
    });
  };

  // Add company on Enter
  const handleCompanyKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && companyInput.trim()) {
      e.preventDefault();
      if (formData.targetCompanies.length >= 15) {
        setError('Maximum 15 companies allowed');
        return;
      }
      if (!formData.targetCompanies.includes(companyInput.trim())) {
        setFormData({
          ...formData,
          targetCompanies: [...formData.targetCompanies, companyInput.trim()],
        });
      }
      setCompanyInput('');
      setError(null);
    }
  };

  // Remove company chip
  const removeCompany = (company: string) => {
    setFormData({
      ...formData,
      targetCompanies: formData.targetCompanies.filter((c) => c !== company),
    });
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (formData.targetCompanies.length === 0) {
      setError('Add at least 1 company');
      return;
    }

    if (formData.targetCompanies.length > 15) {
      setError('Maximum 15 companies');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/criteria', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobFunction: formData.jobFunction || null,
          locations: formData.locations.length > 0 ? formData.locations : null,
          visaRequired: formData.visaRequired || null,
          targetCompanies: formData.targetCompanies,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save criteria');
      }

      setSuccess(true);

      // Clear form data to ensure fresh load on next visit
      setTimeout(() => {
        window.location.href = '/dashboard'; // Force full page navigation to clear cache
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save criteria');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-gray-900 mb-1 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Job Criteria</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Job Function */}
            <div>
              <label htmlFor="jobFunction" className="block text-sm font-medium text-gray-700 mb-2">
                Job Function
              </label>
              <input
                type="text"
                id="jobFunction"
                value={formData.jobFunction}
                onChange={(e) => setFormData({ ...formData, jobFunction: e.target.value })}
                placeholder="e.g., Software Engineering, Product Management"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Locations */}
            <div>
              <label htmlFor="locations" className="block text-sm font-medium text-gray-700 mb-2">
                Locations
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.locations.map((location) => (
                  <span
                    key={location}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {location}
                    <button
                      type="button"
                      onClick={() => removeLocation(location)}
                      className="hover:text-blue-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                id="locations"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={handleLocationKeyDown}
                placeholder="e.g., San Francisco, Remote, New York (press Enter to add)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">Press Enter to add each location</p>
            </div>

            {/* Visa Sponsorship */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="visaRequired"
                checked={formData.visaRequired}
                onChange={(e) => setFormData({ ...formData, visaRequired: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="visaRequired" className="ml-2 block text-sm text-gray-700">
                I need visa sponsorship
              </label>
            </div>

            {/* Target Companies */}
            <div>
              <label htmlFor="companies" className="block text-sm font-medium text-gray-700 mb-2">
                Target Companies
                <span className="ml-2 text-gray-500 font-normal">
                  ({formData.targetCompanies.length}/15)
                </span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.targetCompanies.map((company) => (
                  <span
                    key={company}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                  >
                    {company}
                    <button
                      type="button"
                      onClick={() => removeCompany(company)}
                      className="hover:text-green-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                id="companies"
                value={companyInput}
                onChange={(e) => setCompanyInput(e.target.value)}
                onKeyDown={handleCompanyKeyDown}
                placeholder="e.g., Stripe, Airbnb, Cloudflare (press Enter to add)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={formData.targetCompanies.length >= 15}
              />
              <p className="text-sm text-gray-500 mt-1">Press Enter to add each company (max 15)</p>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">
                  Criteria saved! Jobs will be polled within the hour.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Criteria'}
            </button>
          </form>

          {/* Source Transparency Notice */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> We currently monitor Greenhouse job boards. Not all companies use
              Greenhouse — your target companies will only show results if they post jobs on
              Greenhouse.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
