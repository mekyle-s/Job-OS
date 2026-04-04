/**
 * Query key factory for consistent cache invalidation.
 * Per research Pattern 4: Granular keys prevent over-invalidation.
 */

export const matchKeys = {
  all: ['matching'] as const,
  queue: () => [...matchKeys.all, 'queue'] as const,
  brief: (jobId: string) => [...matchKeys.all, 'brief', jobId] as const,
  mappings: (jobId: string) => [...matchKeys.all, 'mappings', jobId] as const,
};

export const roleStatusKeys = {
  all: ['roleStatus'] as const,
  forJob: (jobId: string) => [...roleStatusKeys.all, jobId] as const,
  forUser: () => [...roleStatusKeys.all, 'user'] as const,
};
