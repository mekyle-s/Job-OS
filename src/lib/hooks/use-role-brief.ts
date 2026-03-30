'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { matchKeys } from './query-keys';

/**
 * Client hooks for role brief data and mapping mutations.
 * Per CONTEXT.md locked decision #7: Manual edits invalidate cache but don't trigger re-matching.
 * Per research Pattern 4: Granular cache invalidation (not blanket invalidation).
 */

/**
 * Fetch role brief for a specific job.
 */
export function useRoleBrief(jobId: string) {
  return useQuery({
    queryKey: matchKeys.brief(jobId),
    queryFn: async () => {
      const res = await fetch(`/api/matching/${jobId}/brief`);
      if (!res.ok) throw new Error('Failed to fetch role brief');
      return res.json();
    },
  });
}

/**
 * Run matching for a job.
 * Invalidates: queue + specific brief
 */
export function useRunMatching() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch('/api/matching/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) throw new Error('Failed to run matching');
      return res.json();
    },
    onSuccess: (data, jobId) => {
      // Invalidate queue (coverage changed)
      queryClient.invalidateQueries({ queryKey: matchKeys.queue() });
      // Invalidate specific brief (mappings updated)
      queryClient.invalidateQueries({ queryKey: matchKeys.brief(jobId) });
    },
  });
}

/**
 * Create a manual evidence mapping.
 * Invalidates: specific brief + queue
 */
export function useCreateMapping(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      requirementId: string;
      evidenceItemId: string;
      decision: string;
      confidenceBand: string;
      reason: string;
      needsReview: boolean;
      sourceRequirementText: string;
      sourceEvidenceExcerpt: string;
    }) => {
      const res = await fetch(`/api/matching/${jobId}/mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create mapping');
      return res.json();
    },
    onSuccess: () => {
      // Invalidate specific brief (new mapping added)
      queryClient.invalidateQueries({ queryKey: matchKeys.brief(jobId) });
      // Invalidate queue (coverage changed)
      queryClient.invalidateQueries({ queryKey: matchKeys.queue() });
    },
  });
}

/**
 * Update an existing mapping.
 * Invalidates: specific brief + queue
 */
export function useUpdateMapping(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mappingId,
      updates,
    }: {
      mappingId: string;
      updates: {
        decision?: string;
        confidenceBand?: string;
        reason?: string;
        sourceEvidenceExcerpt?: string;
        manualOverrideReason?: string;
      };
    }) => {
      const res = await fetch(`/api/matching/${jobId}/mappings/${mappingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update mapping');
      return res.json();
    },
    onSuccess: () => {
      // Invalidate specific brief (mapping changed)
      queryClient.invalidateQueries({ queryKey: matchKeys.brief(jobId) });
      // Invalidate queue (coverage may have changed)
      queryClient.invalidateQueries({ queryKey: matchKeys.queue() });
    },
  });
}

/**
 * Delete a mapping.
 * Invalidates: specific brief + queue
 */
export function useDeleteMapping(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mappingId: string) => {
      const res = await fetch(`/api/matching/${jobId}/mappings/${mappingId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete mapping');
      return res.json();
    },
    onSuccess: () => {
      // Invalidate specific brief (mapping removed)
      queryClient.invalidateQueries({ queryKey: matchKeys.brief(jobId) });
      // Invalidate queue (coverage changed)
      queryClient.invalidateQueries({ queryKey: matchKeys.queue() });
    },
  });
}
