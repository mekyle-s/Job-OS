'use client';

import { useQueryState, parseAsStringLiteral } from 'nuqs';

const statusValues = ['all', 'ignore', 'save', 'apply', 'applied'] as const;

/**
 * Queue filter bar with URL state synchronization.
 * Status filter persists in URL search params for shareability.
 */
export function QueueFilters() {
  const [status, setStatus] = useQueryState(
    'status',
    parseAsStringLiteral(statusValues).withDefault('all')
  );

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'ignore', label: 'Ignore' },
    { value: 'save', label: 'Save' },
    { value: 'apply', label: 'Apply' },
    { value: 'applied', label: 'Applied' },
  ] as const;

  const getButtonStyle = (value: string) => {
    if (value === status) {
      return 'bg-blue-100 text-blue-800 font-semibold border-b-2 border-blue-600';
    }
    return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700 mr-2">Filter by status:</span>
        <div className="flex gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setStatus(option.value)}
              className={`px-4 py-2 rounded-lg text-sm transition ${getButtonStyle(option.value)}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to read current status filter value.
 */
export function useStatusFilter() {
  const [status] = useQueryState('status', parseAsStringLiteral(statusValues).withDefault('all'));
  return status;
}
