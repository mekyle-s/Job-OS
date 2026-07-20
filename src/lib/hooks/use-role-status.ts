'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roleStatusKeys, matchKeys } from './query-keys';

/**
 * Client hooks for role status management.
 * Per research Pitfall 5: Optimistic updates with rollback on error.
 */

export interface RoleStatus {
  status: 'ignore' | 'save' | 'apply' | 'applied' | null;
  notes: string | null;
}

/**
 * Fetch role status for a specific job.
 */
export function useRoleStatus(jobId: string) {
  return useQuery({
    queryKey: roleStatusKeys.forJob(jobId),
    queryFn: async () => {
      const res = await fetch(`/api/roles/${jobId}/status`);
      if (!res.ok) {
        if (res.status === 404) {
          // No status set yet
          return { status: null, notes: null };
        }
        throw new Error('Failed to fetch role status');
      }
      return res.json() as Promise<RoleStatus>;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes - match queue hook cache lifetime
  });
}

/**
 * Update role status with optimistic updates.
 * Invalidates: role status + match queue
 */
export function useUpdateRoleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobId,
      status,
      notes,
    }: {
      jobId: string;
      status: 'ignore' | 'save' | 'apply' | 'applied';
      notes?: string;
    }) => {
      const res = await fetch(`/api/roles/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error('Failed to update role status');
      return res.json();
    },
    onMutate: async ({ jobId, status, notes }) => {
      // Cancel in-flight queries to avoid race conditions
      await queryClient.cancelQueries({ queryKey: matchKeys.queue() });
      await queryClient.cancelQueries({ queryKey: roleStatusKeys.forJob(jobId) });

      // Snapshot the status we're about to optimistically overwrite
      const previousStatus = queryClient.getQueryData<RoleStatus>(roleStatusKeys.forJob(jobId));

      // Optimistically update the role status in cache
      queryClient.setQueryData(roleStatusKeys.forJob(jobId), {
        status,
        notes: notes ?? null,
      });

      // Return context for rollback
      return { previousStatus };
    },
    onError: (_err, { jobId }, context) => {
      // Roll back the optimistic status so a failed update doesn't leave the
      // card showing (or filtered by) a status the server never accepted
      if (context?.previousStatus !== undefined) {
        queryClient.setQueryData(roleStatusKeys.forJob(jobId), context.previousStatus);
      }
    },
    onSettled: (_data, _error, { jobId }) => {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: matchKeys.queue() });
      queryClient.invalidateQueries({ queryKey: roleStatusKeys.forJob(jobId) });
    },
  });
}
