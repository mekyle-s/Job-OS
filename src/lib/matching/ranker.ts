import { db } from '@/lib/db';
import { job, requirement, evidenceMapping, userCriteria } from '@/lib/db/schema';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { determineFitBand, type FitBand } from '@/lib/schemas/matching';

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
  // Get user's active criteria to filter by target companies
  const [activeCriteria] = await db
    .select()
    .from(userCriteria)
    .where(and(eq(userCriteria.userId, userId), eq(userCriteria.isActive, true)))
    .limit(1);

  // If no active criteria or no target companies, return empty queue
  if (
    !activeCriteria ||
    !activeCriteria.targetCompanies ||
    activeCriteria.targetCompanies.length === 0
  ) {
    console.log('[Ranker] No active criteria or target companies found for user:', userId);
    return [];
  }

  console.log('[Ranker] Filtering jobs by companies:', activeCriteria.targetCompanies);

  // SQL aggregation query:
  // 1. Get active, parsed jobs matching user's target companies
  // 2. Count total requirements and evidence-mapped requirements per job
  // 3. Calculate fit_score = mapped_requirements / total_requirements
  // 4. Calculate freshness_score using exponential decay on days since sourceUpdatedAt
  // 5. Compute composite_score = 0.7 * fit_score + 0.3 * freshness_score
  // 6. Return ordered by composite_score DESC, limit 50

  const rankedJobs = await db
    .select({
      jobId: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      url: job.url,
      sourceUpdatedAt: job.sourceUpdatedAt,
      totalRequirements: sql<number>`cast(count(distinct ${requirement.id}) as integer)`,
      mappedRequirements: sql<number>`cast(count(distinct ${evidenceMapping.id}) as integer)`,
      daysOld: sql<number>`extract(epoch from (now() - ${job.sourceUpdatedAt})) / 86400`,
    })
    .from(job)
    .leftJoin(requirement, eq(job.id, requirement.jobId))
    .leftJoin(
      evidenceMapping,
      and(eq(evidenceMapping.requirementId, requirement.id), eq(evidenceMapping.userId, userId))
    )
    .where(
      and(
        eq(job.isActive, true),
        eq(job.parseStatus, 'completed'),
        inArray(job.company, activeCriteria.targetCompanies)
      )
    )
    .groupBy(job.id)
    .having(sql`count(distinct ${requirement.id}) > 0`) // Only jobs with requirements
    .orderBy(
      desc(
        sql`0.7 * (cast(count(distinct ${evidenceMapping.id}) as float) / cast(count(distinct ${requirement.id}) as float)) + 0.3 * exp(-0.1 * extract(epoch from (now() - ${job.sourceUpdatedAt})) / 86400)`
      )
    )
    .limit(50);

  // Map to RankedJob type with fit bands and reasons
  const results: RankedJob[] = rankedJobs.map((row) => {
    const fitScore = row.totalRequirements > 0 ? row.mappedRequirements / row.totalRequirements : 0;
    const freshnessScore = calculateFreshnessScore(row.daysOld);
    const compositeScore = 0.7 * fitScore + 0.3 * freshnessScore;

    // Determine fit band per CONTEXT.md locked decision #4
    const coveragePercent = fitScore * 100;
    // For simplicity, assume medium confidence if we have matches
    const avgConfidenceBand = row.mappedRequirements > 0 ? 'medium' : 'low';
    const fitBand = determineFitBand(coveragePercent, avgConfidenceBand);

    // Generate top 2-3 reasons
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
  });

  return results;
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
