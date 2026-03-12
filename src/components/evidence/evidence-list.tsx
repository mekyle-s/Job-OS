'use client';

import { useState } from 'react';
import Link from 'next/link';
import { EvidenceCard } from './evidence-card';
import type { EvidenceItem } from '@/lib/db/queries/evidence';

type EvidenceListProps = {
  items: EvidenceItem[];
};

type ItemType = 'all' | 'experience' | 'project' | 'skill' | 'education';

export function EvidenceList({ items }: EvidenceListProps) {
  const [filter, setFilter] = useState<ItemType>('all');

  const filteredItems = filter === 'all' ? items : items.filter((item) => item.itemType === filter);

  // Empty state
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">No evidence items yet</h3>
        <p className="text-gray-600 mb-6">Upload a resume or add evidence manually to get started.</p>
        <Link
          href="/dashboard/evidence/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          Add Manually
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          All ({items.length})
        </button>
        <button
          onClick={() => setFilter('experience')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'experience'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Experience ({items.filter((i) => i.itemType === 'experience').length})
        </button>
        <button
          onClick={() => setFilter('project')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'project'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Projects ({items.filter((i) => i.itemType === 'project').length})
        </button>
        <button
          onClick={() => setFilter('skill')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'skill'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Skills ({items.filter((i) => i.itemType === 'skill').length})
        </button>
        <button
          onClick={() => setFilter('education')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'education'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Education ({items.filter((i) => i.itemType === 'education').length})
        </button>
      </div>

      {/* Evidence Cards */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No {filter} items found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredItems.map((item) => (
            <EvidenceCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
