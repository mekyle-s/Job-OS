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
      const res = await fetch('/api/matching/queue');
      if (!res.ok) {
        throw new Error('Failed to fetch match queue');
      }
      return res.json();
    },
    staleTime: 1000 * 30, // 30 seconds - queue must reflect recent polls/criteria changes quickly
    gcTime: 1000 * 60 * 30, // 30 minutes - prevents cache GC during navigation
    refetchInterval: 1000 * 60 * 5, // 5 minutes - background polling keeps data fresh
    refetchOnMount: 'always', // returning to the queue after a poll always fetches fresh data
    placeholderData: (previousData: unknown) => previousData, // keep last queue visible while refetching
  });
}
