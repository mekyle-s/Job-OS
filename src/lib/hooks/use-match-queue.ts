'use client';

import { useQuery } from '@tanstack/react-query';
import { matchKeys } from './query-keys';

/**
 * Client hook for fetching the ranked match queue.
 * Per CONTEXT.md locked decision #4: Queue returns fit bands with reasons, not percentages.
 */
export function useMatchQueue() {
  return useQuery({
    queryKey: matchKeys.queue(),
    queryFn: async () => {
      console.log('[useMatchQueue] Fetching queue from API...');
      const res = await fetch('/api/matching/queue');
      if (!res.ok) {
        console.error('[useMatchQueue] API error:', res.status, res.statusText);
        throw new Error('Failed to fetch match queue');
      }
      const data = await res.json();
      console.log('[useMatchQueue] Received queue data:', {
        count: data.queue?.length || 0,
        generatedAt: data.generatedAt,
      });
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes - prevents cache GC during navigation
    refetchInterval: 1000 * 60 * 10, // 10 minutes - background polling keeps data fresh
  });
}
