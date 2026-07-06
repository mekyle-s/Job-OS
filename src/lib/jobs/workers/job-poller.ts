import type { Job } from 'pg-boss';
import { getAdapter } from '../sources';
import type { UserCriteriaInput } from '../sources/adapter';
import { getUserCriteria, updateLastPolledAt } from '@/lib/db/queries/user-criteria';
import {
  upsertRawJobSource,
  upsertJob,
  markJobsInactive,
  getPendingParseJobs,
} from '@/lib/db/queries/jobs';
import { extractJobRequirements } from './requirement-parser';

export const JOB_POLLER_QUEUE = 'poll-jobs-for-user';

// Hard cap on requirement extractions per poll run. Each extraction is one
// gpt-4o-mini call, and a discover-mode poll (all boards) can surface hundreds
// of new jobs at once. Jobs beyond the cap keep parseStatus='pending' and are
// drained, freshest first, by subsequent polls.
const MAX_EXTRACTIONS_PER_POLL = Number(process.env.MAX_EXTRACTIONS_PER_POLL ?? 25);

/**
 * Map adapter employment type strings ('full-time', 'part-time', 'internship',
 * 'contract') to canonical job.roleType values used by filtering.
 */
function normalizeRoleType(employmentType?: string): string {
  switch (employmentType) {
    case 'internship':
      return 'internship';
    case 'part-time':
      return 'part_time';
    case 'full-time':
      return 'full_time';
    case 'contract':
      return 'contract';
    default:
      return 'unknown';
  }
}

interface PollJobsPayload {
  userId: string;
  criteriaId: string;
}

export interface PollResult {
  userId: string;
  jobsFetched: number;
  newJobs: number;
  updatedJobs: number;
  requirementsExtracted?: number;
}

/**
 * Poll job sources for a user's criteria, store raw + canonical jobs, and
 * extract requirements for pending jobs (capped per run).
 *
 * Runs extractions inline (sequential, error-safe) rather than via pg-boss so
 * it works in serverless environments where background workers don't outlive
 * the request. Callable directly or via the pg-boss wrapper below.
 */
export async function pollJobsForUser(userId: string, criteriaId: string): Promise<PollResult> {
  // 1. Get user criteria from database
  const criteria = await getUserCriteria(userId);

  if (!criteria) {
    throw new Error(`Criteria not found for user ${userId}`);
  }

  if (!criteria.isActive) {
    console.warn(`[JobPoller] Criteria ${criteriaId} is inactive, skipping poll`);
    return { userId, jobsFetched: 0, newJobs: 0, updatedJobs: 0 };
  }

  // 2. Instantiate adapter (V1: only greenhouse)
  const adapter = getAdapter('greenhouse');

  if (!adapter) {
    throw new Error('Greenhouse adapter not found');
  }

  // 3. Build criteria input for adapter.
  // Empty targetCompanies = "All companies" discover mode: poll every board
  // this adapter monitors.
  const companiesToPoll =
    criteria.targetCompanies.length > 0
      ? criteria.targetCompanies
      : adapter.getMonitoredCompanies();

  const criteriaInput: UserCriteriaInput = {
    userId,
    jobFunction: criteria.jobFunction,
    locations: criteria.locations,
    visaRequired: criteria.visaRequired,
    targetCompanies: companiesToPoll,
  };

  // 4. Fetch raw jobs from adapter
  const rawJobs = await adapter.fetchJobs(criteriaInput);

  let jobsFetched = 0;
  let newJobs = 0;
  let updatedJobs = 0;

  // 5. Process each raw job
  for (const rawJob of rawJobs) {
    try {
      // a. Store raw source record
      await upsertRawJobSource({
        source: rawJob.sourceName,
        sourceJobId: rawJob.sourceId,
        rawData: rawJob.rawData,
      });

      // b. Normalize via adapter
      const canonical = adapter.normalizeJob(rawJob);

      // c. Upsert canonical job (persist role type for multi-tier filtering).
      // New and updated jobs land at parseStatus='pending' and are extracted
      // below under the per-poll cap.
      const { isNew, isUpdated } = await upsertJob({
        source: canonical.sourceName,
        sourceJobId: canonical.sourceId,
        title: canonical.title,
        company: canonical.company,
        location: canonical.location,
        description: canonical.description,
        url: canonical.url,
        postedAt: canonical.postedAt ? new Date(canonical.postedAt) : undefined,
        sourceUpdatedAt: new Date(canonical.updatedAt),
        metadata: canonical.metadata,
        roleType: normalizeRoleType(canonical.metadata?.employmentType),
        isActive: true,
      });

      jobsFetched++;
      if (isNew) {
        newJobs++;
      } else if (isUpdated) {
        updatedJobs++;
      }
    } catch (error) {
      console.error(`[JobPoller] Failed to process job ${rawJob.sourceId}:`, error);
      // Continue to next job
    }
  }

  // 5b. Extract requirements for pending jobs, capped per run. This drains
  // both this poll's new/updated jobs and any backlog from earlier capped
  // runs, freshest first.
  const pendingJobs = await getPendingParseJobs(MAX_EXTRACTIONS_PER_POLL);
  let requirementsExtracted = 0;
  for (const pending of pendingJobs) {
    try {
      await extractJobRequirements(pending.id, pending.description);
      requirementsExtracted++;
    } catch (error) {
      console.error(`[JobPoller] Requirement extraction failed for job ${pending.id}:`, error);
      // extractJobRequirements already marked the job 'failed'; continue
    }
  }
  console.log(
    `[JobPoller] Extracted requirements for ${requirementsExtracted}/${pendingJobs.length} pending jobs (cap: ${MAX_EXTRACTIONS_PER_POLL})`
  );

  // 6. Mark missing jobs as inactive
  // For each polled company, get active job IDs from adapter and mark missing as inactive
  // CRITICAL: Must pass company name to scope the inactive marking to that company only
  for (const companyName of companiesToPoll) {
    try {
      // Greenhouse uses lowercase company names as board tokens
      const boardToken = companyName.toLowerCase();
      const activeJobIds = await adapter.getActiveJobIds(boardToken);

      if (activeJobIds.length > 0) {
        // Normalize company name to match how it's stored in database
        // Database stores capitalized company names (e.g., "Airbnb", "Stripe")
        const normalizedCompanyName =
          companyName.charAt(0).toUpperCase() + companyName.slice(1).toLowerCase();
        const markedInactive = await markJobsInactive(
          'greenhouse',
          normalizedCompanyName,
          activeJobIds
        );
        if (markedInactive > 0) {
          console.log(`[JobPoller] Marked ${markedInactive} jobs inactive for ${companyName}`);
        }
      }
    } catch (error) {
      console.error(`[JobPoller] Failed to mark inactive jobs for ${companyName}:`, error);
      // Continue to next company
    }
  }

  // 7. Update lastPolledAt on criteria
  await updateLastPolledAt(criteriaId);

  return {
    userId,
    jobsFetched,
    newJobs,
    updatedJobs,
    requirementsExtracted,
  };
}

/**
 * pg-boss worker wrapper (used when running with a persistent worker process).
 */
export async function jobPollerHandler(jobs: Job<PollJobsPayload>[]) {
  const job = jobs[0];
  const { userId, criteriaId } = job.data;
  return pollJobsForUser(userId, criteriaId);
}
