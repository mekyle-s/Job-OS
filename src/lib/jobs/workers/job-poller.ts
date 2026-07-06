import type { Job } from 'pg-boss';
import { getAdapter } from '../sources';
import type { UserCriteriaInput } from '../sources/adapter';
import { getUserCriteria, updateLastPolledAt } from '@/lib/db/queries/user-criteria';
import { upsertRawJobSource, upsertJob, markJobsInactive } from '@/lib/db/queries/jobs';
import { getJobQueue } from '../index';

export const JOB_POLLER_QUEUE = 'poll-jobs-for-user';

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

/**
 * Job poller worker
 *
 * Fetches jobs from source adapters for a user's criteria, stores raw + canonical,
 * and queues requirement extraction for new jobs.
 */
export async function jobPollerHandler(jobs: Job<PollJobsPayload>[]) {
  const job = jobs[0];
  const { userId, criteriaId } = job.data;

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

  // 3. Build criteria input for adapter
  const criteriaInput: UserCriteriaInput = {
    userId,
    jobFunction: criteria.jobFunction,
    locations: criteria.locations,
    visaRequired: criteria.visaRequired,
    targetCompanies: criteria.targetCompanies,
  };

  // 4. Fetch raw jobs from adapter
  const rawJobs = await adapter.fetchJobs(criteriaInput);

  let jobsFetched = 0;
  let newJobs = 0;
  let updatedJobs = 0;

  const boss = getJobQueue();
  await boss.start(); // Ensure boss is started

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

      // c. Upsert canonical job (persist role type for multi-tier filtering)
      const {
        job: canonicalJob,
        isNew,
        isUpdated,
      } = await upsertJob({
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

      // d. If new or updated, queue requirement extraction
      if (isNew) {
        newJobs++;
        await boss.send('extract-requirements', {
          jobId: canonicalJob.id,
          description: canonicalJob.description,
        });
      } else if (isUpdated) {
        updatedJobs++;
        await boss.send('extract-requirements', {
          jobId: canonicalJob.id,
          description: canonicalJob.description,
        });
      }
    } catch (error) {
      console.error(`[JobPoller] Failed to process job ${rawJob.sourceId}:`, error);
      // Continue to next job
    }
  }

  // 6. Mark missing jobs as inactive
  // For each company in criteria, get active job IDs from adapter and mark missing as inactive
  // CRITICAL: Must pass company name to scope the inactive marking to that company only
  for (const companyName of criteria.targetCompanies) {
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
  };
}
