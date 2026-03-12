'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { EvidenceItem } from '@/lib/db/queries/evidence';

interface EvidenceFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<EvidenceItem>;
  action: (formData: FormData) => Promise<{ error?: string } | void>;
}

type ItemType = 'experience' | 'project' | 'skill' | 'education';

export function EvidenceForm({ mode, initialData, action }: EvidenceFormProps) {
  const [itemType, setItemType] = useState<ItemType>(
    (initialData?.itemType as ItemType) || 'experience'
  );
  const [isCurrent, setIsCurrent] = useState(!initialData?.endDate);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract skills from metadata for initial value
  const initialSkills =
    (initialData?.metadata as { skills?: string[] })?.skills?.join(', ') || '';

  // Get placeholder text based on item type
  const getTitlePlaceholder = () => {
    switch (itemType) {
      case 'experience':
        return 'e.g., Software Engineering Intern';
      case 'project':
        return 'e.g., E-commerce Platform';
      case 'skill':
        return 'e.g., React';
      case 'education':
        return 'e.g., Bachelor of Science in Computer Science';
    }
  };

  const getCompanyLabel = () => {
    switch (itemType) {
      case 'experience':
        return 'Company';
      case 'education':
        return 'Institution';
      case 'project':
        return 'Organization (optional)';
      default:
        return 'Company/Organization';
    }
  };

  const showCompanyField = itemType !== 'skill';
  const showDateFields = itemType !== 'skill';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    // Clear end date if "Current" is checked
    if (isCurrent) {
      formData.set('endDate', '');
    }

    try {
      const result = await action(formData);
      if (result && 'error' in result) {
        setError(result.error || 'An error occurred');
        setIsSubmitting(false);
      }
      // If no error and no return, the action will redirect
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Hidden ID field for edit mode */}
      {mode === 'edit' && initialData?.id && (
        <input type="hidden" name="id" value={initialData.id} />
      )}

      {/* Error Display */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Item Type */}
      <div>
        <label htmlFor="itemType" className="block text-sm font-medium text-gray-700 mb-1">
          Evidence Type <span className="text-red-500">*</span>
        </label>
        <select
          id="itemType"
          name="itemType"
          value={itemType}
          onChange={(e) => setItemType(e.target.value as ItemType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="experience">Experience</option>
          <option value="project">Project</option>
          <option value="skill">Skill</option>
          <option value="education">Education</option>
        </select>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          {itemType === 'experience' && 'Job Title'}
          {itemType === 'project' && 'Project Name'}
          {itemType === 'skill' && 'Skill Name'}
          {itemType === 'education' && 'Degree'}
          <span className="text-red-500"> *</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          defaultValue={initialData?.title}
          placeholder={getTitlePlaceholder()}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      {/* Company/Organization */}
      {showCompanyField && (
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
            {getCompanyLabel()}
          </label>
          <input
            type="text"
            id="company"
            name="company"
            defaultValue={initialData?.company || ''}
            placeholder={
              itemType === 'experience'
                ? 'e.g., Google'
                : itemType === 'education'
                  ? 'e.g., Stanford University'
                  : 'e.g., Open Source Foundation'
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      {/* Date Fields */}
      {showDateFields && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="month"
              id="startDate"
              name="startDate"
              defaultValue={initialData?.startDate || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="month"
              id="endDate"
              name="endDate"
              defaultValue={initialData?.endDate || ''}
              disabled={isCurrent}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <div className="mt-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isCurrent}
                  onChange={(e) => setIsCurrent(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Current</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="content"
          name="content"
          defaultValue={initialData?.content || ''}
          rows={6}
          placeholder="Describe your achievements, responsibilities, or details..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Be specific about what you accomplished and the impact you made.
        </p>
      </div>

      {/* Skills/Technologies */}
      <div>
        <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">
          Skills & Technologies
        </label>
        <input
          type="text"
          id="skills"
          name="skills"
          defaultValue={initialSkills}
          placeholder="e.g., React, TypeScript, Node.js, PostgreSQL"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Comma-separated list of skills and technologies used.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Link
          href="/dashboard/evidence"
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition"
        >
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Add Evidence' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
