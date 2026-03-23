'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { use } from 'react';

type Requirement = {
  id: string;
  category: 'technical_skill' | 'experience' | 'education' | 'soft_skill' | 'other';
  priority: 'required' | 'preferred' | 'unknown';
  normalizedText: string;
  sourceText: string;
  sourceSpan: string | null;
  reviewStatus: 'parsed' | 'needs_review' | 'unparsed';
  isManuallyEdited: boolean;
};

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  postedAt: string | null;
  firstSeenAt: string;
  sourceUpdatedAt: string;
  parseStatus: 'pending' | 'processing' | 'completed' | 'failed';
  requirements: Requirement[];
};

type GroupedRequirements = {
  [key in Requirement['category']]: Requirement[];
};

const categoryLabels: Record<Requirement['category'], string> = {
  technical_skill: 'Technical Skills',
  experience: 'Experience',
  education: 'Education',
  soft_skill: 'Soft Skills',
  other: 'Other',
};

const categoryOrder: Requirement['category'][] = [
  'technical_skill',
  'experience',
  'education',
  'soft_skill',
  'other',
];

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRequirement, setEditingRequirement] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    normalizedText: string;
    priority: Requirement['priority'];
  }>({ normalizedText: '', priority: 'unknown' });
  const [isAddingRequirement, setIsAddingRequirement] = useState(false);
  const [newRequirement, setNewRequirement] = useState<{
    category: Requirement['category'];
    priority: Requirement['priority'];
    normalizedText: string;
  }>({
    category: 'technical_skill',
    priority: 'required',
    normalizedText: '',
  });
  const [expandedCategories, setExpandedCategories] = useState<Set<Requirement['category']>>(
    new Set(categoryOrder)
  );

  useEffect(() => {
    loadJob();
  }, [resolvedParams.id]);

  const loadJob = async () => {
    try {
      const response = await fetch(`/api/jobs/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setJob(data.job);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load job');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (category: Requirement['category']) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const startEditing = (requirement: Requirement) => {
    setEditingRequirement(requirement.id);
    setEditForm({
      normalizedText: requirement.normalizedText,
      priority: requirement.priority,
    });
  };

  const cancelEditing = () => {
    setEditingRequirement(null);
    setEditForm({ normalizedText: '', priority: 'unknown' });
  };

  const saveEdit = async (requirementId: string) => {
    try {
      const response = await fetch(`/api/jobs/${resolvedParams.id}/requirements/${requirementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        await loadJob();
        cancelEditing();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to update requirement');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update requirement');
    }
  };

  const deleteRequirement = async (requirementId: string) => {
    if (!confirm('Are you sure you want to delete this requirement?')) {
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${resolvedParams.id}/requirements/${requirementId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadJob();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete requirement');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete requirement');
    }
  };

  const addRequirement = async () => {
    if (!newRequirement.normalizedText.trim()) {
      alert('Please enter requirement text');
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${resolvedParams.id}/requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: resolvedParams.id,
          category: newRequirement.category,
          priority: newRequirement.priority,
          normalizedText: newRequirement.normalizedText,
          sourceText: '',
          reviewStatus: 'parsed',
        }),
      });

      if (response.ok) {
        await loadJob();
        setIsAddingRequirement(false);
        setNewRequirement({
          category: 'technical_skill',
          priority: 'required',
          normalizedText: '',
        });
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to add requirement');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add requirement');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <Link
              href="/dashboard/jobs"
              className="text-sm text-gray-600 hover:text-gray-900 mb-1 inline-block"
            >
              ← Back to Jobs
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Job Not Found</h1>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">{error || 'Job not found'}</p>
          </div>
        </main>
      </div>
    );
  }

  // Group requirements by category
  const groupedRequirements: GroupedRequirements = {
    technical_skill: [],
    experience: [],
    education: [],
    soft_skill: [],
    other: [],
  };

  job.requirements.forEach((req) => {
    groupedRequirements[req.category].push(req);
  });

  const getFreshnessIndicator = () => {
    const firstSeenDate = new Date(job.firstSeenAt);
    const updatedDate = new Date(job.sourceUpdatedAt);
    const now = new Date();
    const dayInMs = 24 * 60 * 60 * 1000;

    if (now.getTime() - firstSeenDate.getTime() < dayInMs) {
      return { label: 'New', className: 'bg-green-100 text-green-700' };
    }

    if (now.getTime() - updatedDate.getTime() < dayInMs) {
      return { label: 'Updated', className: 'bg-blue-100 text-blue-700' };
    }

    return null;
  };

  const freshness = getFreshnessIndicator();

  const getPriorityBadgeClass = (priority: Requirement['priority']) => {
    switch (priority) {
      case 'required':
        return 'bg-red-100 text-red-700';
      case 'preferred':
        return 'bg-blue-100 text-blue-700';
      case 'unknown':
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getReviewStatusBadgeClass = (status: Requirement['reviewStatus']) => {
    switch (status) {
      case 'parsed':
        return 'bg-green-100 text-green-700';
      case 'needs_review':
        return 'bg-yellow-100 text-yellow-700';
      case 'unparsed':
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href="/dashboard/jobs"
            className="text-sm text-gray-600 hover:text-gray-900 mb-1 inline-block"
          >
            ← Back to Jobs
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Job Information Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{job.title}</h2>
              <p className="text-gray-600 mt-1">
                {job.company} • {job.location}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {job.postedAt
                  ? `Posted ${formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })}`
                  : `First seen ${formatDistanceToNow(new Date(job.firstSeenAt), { addSuffix: true })}`}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {freshness && (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${freshness.className}`}>
                  {freshness.label}
                </span>
              )}
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  job.parseStatus === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : job.parseStatus === 'processing'
                      ? 'bg-blue-100 text-blue-700'
                      : job.parseStatus === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                }`}
              >
                {job.parseStatus.charAt(0).toUpperCase() + job.parseStatus.slice(1)}
              </span>
            </div>
          </div>

          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            View original posting
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>

        {/* Requirements Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Requirements</h2>
            <button
              onClick={() => setIsAddingRequirement(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
            >
              + Add Requirement
            </button>
          </div>

          {/* Add Requirement Form */}
          {isAddingRequirement && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Add New Requirement</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={newRequirement.category}
                      onChange={(e) =>
                        setNewRequirement({
                          ...newRequirement,
                          category: e.target.value as Requirement['category'],
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {categoryOrder.map((cat) => (
                        <option key={cat} value={cat}>
                          {categoryLabels[cat]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={newRequirement.priority}
                      onChange={(e) =>
                        setNewRequirement({
                          ...newRequirement,
                          priority: e.target.value as Requirement['priority'],
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="required">Required</option>
                      <option value="preferred">Preferred</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Requirement Text
                  </label>
                  <textarea
                    value={newRequirement.normalizedText}
                    onChange={(e) =>
                      setNewRequirement({ ...newRequirement, normalizedText: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Enter requirement text..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addRequirement}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingRequirement(false);
                      setNewRequirement({
                        category: 'technical_skill',
                        priority: 'required',
                        normalizedText: '',
                      });
                    }}
                    className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Requirements grouped by category */}
          {job.requirements.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No requirements extracted yet. Add requirements manually or wait for parsing to complete.
            </p>
          ) : (
            <div className="space-y-4">
              {categoryOrder.map((category) => {
                const requirements = groupedRequirements[category];
                if (requirements.length === 0) return null;

                const isExpanded = expandedCategories.has(category);

                return (
                  <div key={category} className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{categoryLabels[category]}</span>
                        <span className="text-sm text-gray-500">({requirements.length})</span>
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform ${
                          isExpanded ? 'transform rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="p-4 space-y-4">
                        {requirements.map((req) => (
                          <div key={req.id} className="border-l-4 border-gray-200 pl-4">
                            {editingRequirement === req.id ? (
                              // Edit mode
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Priority
                                  </label>
                                  <select
                                    value={editForm.priority}
                                    onChange={(e) =>
                                      setEditForm({
                                        ...editForm,
                                        priority: e.target.value as Requirement['priority'],
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="required">Required</option>
                                    <option value="preferred">Preferred</option>
                                    <option value="unknown">Unknown</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Requirement Text
                                  </label>
                                  <textarea
                                    value={editForm.normalizedText}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, normalizedText: e.target.value })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={3}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => saveEdit(req.id)}
                                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={cancelEditing}
                                    className="px-3 py-1 bg-white text-gray-700 border border-gray-300 rounded text-sm hover:bg-gray-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // View mode
                              <div>
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span
                                        className={`px-2 py-1 rounded text-xs font-medium ${getPriorityBadgeClass(req.priority)}`}
                                      >
                                        {req.priority.charAt(0).toUpperCase() + req.priority.slice(1)}
                                      </span>
                                      <span
                                        className={`px-2 py-1 rounded text-xs font-medium ${getReviewStatusBadgeClass(req.reviewStatus)}`}
                                      >
                                        {req.reviewStatus === 'parsed'
                                          ? 'Parsed'
                                          : req.reviewStatus === 'needs_review'
                                            ? 'Needs Review'
                                            : 'Unparsed'}
                                      </span>
                                      {req.isManuallyEdited && (
                                        <span className="text-xs text-gray-500 italic">Edited</span>
                                      )}
                                    </div>
                                    <p className="text-gray-900">{req.normalizedText}</p>
                                    {req.sourceText && (
                                      <p className="text-sm text-gray-500 mt-2 italic">
                                        Source: "{req.sourceText}"
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex gap-2 ml-4">
                                    <button
                                      onClick={() => startEditing(req)}
                                      className="text-sm text-blue-600 hover:text-blue-700"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => deleteRequirement(req.id)}
                                      className="text-sm text-red-600 hover:text-red-700"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
