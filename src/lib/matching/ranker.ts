import { db } from '@/lib/db';
import { job, requirement, evidenceMapping, userCriteria } from '@/lib/db/schema';
import { eq, ne, and, or, isNull, inArray, sql } from 'drizzle-orm';
import { determineFitBand, type FitBand } from '@/lib/schemas/matching';
import { filterEligibleJobs } from './eligibility';
import { jobFunctionMatches } from '@/lib/jobs/sources/greenhouse';

/**
 * Weighted job ranking using 70% fit + 30% freshness.
 * Per CONTEXT.md locked decision #5: NO quality component in V1.
 *
 * Ranking formula: composite_score = 0.7 * fit_score + 0.3 * freshness_score
 */

export interface RankedJob {
  jobId: string;
  title: string;
  company: string;
  location: string;
  url: string;
  sourceUpdatedAt: Date;
  totalRequirements: number;
  mappedRequirements: number;
  fitScore: number;
  freshnessScore: number;
  compositeScore: number;
  fitBand: FitBand;
  fitReasons: string[];
}

/** Raw aggregation row for one job, before filtering/scoring. */
export interface RankableJobRow {
  jobId: string;
  title: string;
  company: string;
  location: string;
  url: string;
  sourceUpdatedAt: Date;
  totalRequirements: number;
  mappedRequirements: number;
  daysOld: number;
  departmentName?: string | null;
  visaSponsorship?: string | null;
  remotePolicy?: string | null;
  roleType?: string | null;
  season?: string | null;
  graduationWindow?: string | null;
}

export interface RankingCriteria {
  jobFunction?: string | null;
  visaRequired?: boolean | null;
  locations?: string[] | null;
  jobTypes?: string[] | null;
}

// Queue page size. Filtering happens BEFORE this cap so relevant jobs are
// never crowded out by fresher-but-irrelevant ones.
const QUEUE_LIMIT = 50;

/**
 * Filter, score, and rank raw job rows against the user's criteria.
 * Pure function — exported for unit testing.
 *
 * Filters: job function (flexible title+department matching, same rule the
 * poller uses) and hard eligibility (visa/onsite-location/type/season).
 * Ranking: composite = 0.7 * fit + 0.3 * freshness, top QUEUE_LIMIT.
 */
export function rankJobRows(rows: RankableJobRow[], criteria: RankingCriteria): RankedJob[] {
  // The poller filters by job function at fetch time, but the job table is
  // shared across users (and accumulates old polls), so the queue must apply
  // the user's own function filter here too — otherwise every parsed job in
  // the database shows up regardless of what the user asked for.
  const functionMatched = criteria.jobFunction
    ? rows.filter((row) =>
        jobFunctionMatches(criteria.jobFunction!, `${row.title} ${row.departmentName ?? ''}`)
      )
    : rows;

  const eligible = filterEligibleJobs(
    functionMatched.map((row) => ({ ...row, id: row.jobId })),
    {
      visaRequired: criteria.visaRequired ?? undefined,
      locations: criteria.locations ?? undefined,
      jobTypes: criteria.jobTypes ?? undefined,
    }
  );

  return eligible
    .map((row) => {
      const fitScore =
        row.totalRequirements > 0 ? row.mappedRequirements / row.totalRequirements : 0;
      const freshnessScore = calculateFreshnessScore(row.daysOld);
      const compositeScore = 0.7 * fitScore + 0.3 * freshnessScore;

      // Determine fit band per CONTEXT.md locked decision #4
      const coveragePercent = fitScore * 100;
      // For simplicity, assume medium confidence if we have matches
      const avgConfidenceBand = row.mappedRequirements > 0 ? 'medium' : 'low';
      const fitBand = determineFitBand(coveragePercent, avgConfidenceBand);

      const fitReasons = generateFitReasons(
        row.mappedRequirements,
        row.totalRequirements,
        fitScore,
        freshnessScore
      );

      return {
        jobId: row.jobId,
        title: row.title,
        company: row.company,
        location: row.location,
        url: row.url,
        sourceUpdatedAt: row.sourceUpdatedAt,
        totalRequirements: row.totalRequirements,
        mappedRequirements: row.mappedRequirements,
        fitScore,
        freshnessScore,
        compositeScore,
        fitBand,
        fitReasons,
      };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, QUEUE_LIMIT);
}

/**
 * Calculate freshness score using exponential decay.
 * Half-life ~7 days per e^(-0.1 * daysOld).
 *
 * @param daysOld - Number of days since job was updated
 * @returns Freshness score between 0.0 and 1.0
 */
export function calculateFreshnessScore(daysOld: number): number {
  return Math.exp(-0.1 * daysOld);
}

/**
 * Get ranked jobs for a user using 70/30 fit + freshness weighting.
 * Per CONTEXT.md locked decision #4: Return fit bands with reasons, not percentages.
 * Per CONTEXT.md locked decision #5: Use 70/30 weighting, NO quality component.
 *
 * @param userId - User ID to get ranked jobs for
 * @returns Array of ranked jobs sorted by composite score descending, limit 50
 */
export async function getRankedJobs(userId: string): Promise<RankedJob[]> {
  // Queue adheres to the user's active criteria (companies + job types).
  // Empty targetCompanies = "All companies" (discover mode) — the strict
  // company filter is skipped entirely. Company matching is case-insensitive:
  // criteria store tokens like "stripe" while jobs store display names like
  // "Stripe" (the exact-match version of this filter emptied the queue and
  // was reverted in 2d21715).
  const [activeCriteria] = await db
    .select()
    .from(userCriteria)
    .where(and(eq(userCriteria.userId, userId), eq(userCriteria.isActive, true)))
    .limit(1);

  if (!activeCriteria) {
    return [];
  }

  const jobConditions = [eq(job.isActive, true), eq(job.parseStatus, 'completed')];

  if (activeCriteria.targetCompanies.length > 0) {
    jobConditions.push(
      inArray(
        sql`lower(${job.company})`,
        activeCriteria.targetCompanies.map((c) => c.toLowerCase())
      )
    );
  }

  // Job type filter: exclude explicit mismatches, keep unknown/unclassified jobs
  if (activeCriteria.jobTypes && activeCriteria.jobTypes.length > 0) {
    jobConditions.push(
      or(
        isNull(job.roleType),
        eq(job.roleType, 'unknown'),
        inArray(job.roleType, activeCriteria.jobTypes)
      )!
    );
  }

  // SQL aggregation: active parsed jobs matching the cheap criteria (company,
  // job type), with per-job requirement and coverage counts. A requirement
  // counts as covered when at least one mapping has decision match/weak_match
  // — counting mapping ROWS would overcount requirements with multiple
  // evidence matches (and count manual 'no_match' overrides as coverage).
  // Function/eligibility filtering, scoring, and the top-50 cut happen in
  // rankJobRows so relevant jobs are never crowded out before filtering.
  const rows = await db
    .select({
      jobId: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      url: job.url,
      sourceUpdatedAt: job.sourceUpdatedAt,
      totalRequirements: sql<number>`cast(count(distinct ${requirement.id}) as integer)`,
      mappedRequirements: sql<number>`cast(count(distinct case when ${evidenceMapping.decision} in ('match', 'weak_match') then ${requirement.id} end) as integer)`,
      daysOld: sql<number>`extract(epoch from (now() - ${job.sourceUpdatedAt})) / 86400`,
      departmentName: sql<string | null>`${job.metadata} ->> 'departmentName'`,
      visaSponsorship: job.visaSponsorship,
      remotePolicy: job.remotePolicy,
      roleType: job.roleType,
      season: job.season,
      graduationWindow: job.graduationWindow,
    })
    .from(job)
    .leftJoin(
      requirement,
      and(eq(job.id, requirement.jobId), ne(requirement.reviewStatus, 'rejected'))
    )
    .leftJoin(
      evidenceMapping,
      and(eq(evidenceMapping.requirementId, requirement.id), eq(evidenceMapping.userId, userId))
    )
    .where(and(...jobConditions))
    .groupBy(job.id)
    .having(sql`count(distinct ${requirement.id}) > 0`) // Only jobs with requirements
    .limit(1000); // Safety cap far above current data scale

  return rankJobRows(rows, {
    jobFunction: activeCriteria.jobFunction,
    visaRequired: activeCriteria.visaRequired,
    locations: activeCriteria.locations,
    jobTypes: activeCriteria.jobTypes,
  });
}

/**
 * Generate fit reasons for a job based on coverage and freshness.
 * Per CONTEXT.md locked decision #4: Reference specific evidence strength and critical gaps.
 */
function generateFitReasons(
  mappedRequirements: number,
  totalRequirements: number,
  fitScore: number,
  freshnessScore: number
): string[] {
  const reasons: string[] = [];
  const gaps = totalRequirements - mappedRequirements;

  // Reason 1: Coverage strength
  if (fitScore >= 0.8) {
    reasons.push(
      `Strong match: ${mappedRequirements} of ${totalRequirements} requirements covered`
    );
  } else if (fitScore >= 0.5) {
    reasons.push(
      `Partial match: ${mappedRequirements} of ${totalRequirements} requirements covered`
    );
  } else {
    reasons.push(
      `Limited match: Only ${mappedRequirements} of ${totalRequirements} requirements covered`
    );
  }

  // Reason 2: Freshness
  if (freshnessScore >= 0.9) {
    reasons.push('Posted very recently (within last few days)');
  } else if (freshnessScore >= 0.7) {
    reasons.push('Posted recently (within last week)');
  } else if (freshnessScore < 0.5) {
    reasons.push('Older posting (may be less competitive)');
  }

  // Reason 3: Critical gaps
  if (gaps > 0 && gaps <= 3) {
    reasons.push(`${gaps} requirement gap${gaps > 1 ? 's' : ''} to address`);
  } else if (gaps > 3) {
    reasons.push(`${gaps} significant requirement gaps`);
  }

  return reasons.slice(0, 3); // Top 2-3 reasons
}
