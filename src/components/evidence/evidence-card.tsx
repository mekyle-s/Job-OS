'use client';

import Link from 'next/link';
import { ConfidenceBadge } from './confidence-badge';
import { deleteEvidenceAction } from '@/app/dashboard/evidence/actions';
import type { EvidenceItem } from '@/lib/db/queries/evidence';

type EvidenceCardProps = {
  item: EvidenceItem;
};

export function EvidenceCard({ item }: EvidenceCardProps) {
  // Type badge color mapping
  const typeColors = {
    experience: 'text-blue-700 bg-blue-50',
    project: 'text-purple-700 bg-purple-50',
    skill: 'text-green-700 bg-green-50',
    education: 'text-orange-700 bg-orange-50',
  };

  const typeColor = typeColors[item.itemType as keyof typeof typeColors] || 'text-gray-700 bg-gray-50';

  // Format date range
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    const [year, month] = dateStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const dateRange = item.startDate
    ? `${formatDate(item.startDate)} - ${item.endDate ? formatDate(item.endDate) : 'Present'}`
    : null;

  // Content preview (first 150 chars)
  const contentPreview = item.content
    ? item.content.length > 150
      ? item.content.substring(0, 150) + '...'
      : item.content
    : null;

  // Extract skills/technologies from metadata
  const skills = (item.metadata as { skills?: string[]; technologies?: string[] } | null)?.skills || [];
  const technologies = (item.metadata as { skills?: string[]; technologies?: string[] } | null)?.technologies || [];
  const allSkills = [...skills, ...technologies].slice(0, 5);

  return (
    <div className="rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition p-5 bg-white">
      {/* Header: Title, Type, Source */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{item.title}</h3>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${typeColor}`}>{item.itemType}</span>
          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
            {item.isManual ? 'Manual' : 'Parsed'}
          </span>
        </div>
      </div>

      {/* Company and Date */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
        {item.company && <span>{item.company}</span>}
        {item.company && dateRange && <span>•</span>}
        {dateRange && <span>{dateRange}</span>}
      </div>

      {/* Content Preview */}
      {contentPreview && <p className="text-sm text-gray-700 mb-3">{contentPreview}</p>}

      {/* Skills/Technologies */}
      {allSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {allSkills.map((skill, idx) => (
            <span key={idx} className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Footer: Confidence Badge and Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <ConfidenceBadge confidence={item.confidence ?? 1.0} />
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/evidence/${item.id}/edit`}
            className="px-3 py-1.5 text-sm font-medium text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded transition"
          >
            Edit
          </Link>
          <form action={deleteEvidenceAction}>
            <input type="hidden" name="id" value={item.id} />
            <button
              type="submit"
              onClick={(e) => {
                if (!window.confirm('Delete this evidence item?')) {
                  e.preventDefault();
                }
              }}
              className="px-3 py-1.5 text-sm font-medium text-red-700 hover:text-red-800 hover:bg-red-50 rounded transition"
            >
              Delete
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
