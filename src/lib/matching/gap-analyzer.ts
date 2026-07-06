import { db } from '@/lib/db';
import { job, requirement, evidenceMapping, evidenceItem } from '@/lib/db/schema';
import { eq, ne, and, sql } from 'drizzle-orm';
import { determineFitBand, type FitBand } from '@/lib/schemas/matching';

/**
 * Gap analyzer for role brief generation.
 * Identifies requirements with no supporting evidence and produces role brief data.
 * Per CONTEXT.md locked decision #4: Show fit bands with reasons, not percentages.
 */

export interface RequirementWithEvidence {
  id: string;
  category: string;
  priority: string;
  normalizedText: string;
  sourceText: string;
  evidenceMappings?: Array<{
    id: string;
    evidenceItemId: string;
    evidenceTitle: string;
    decision: string;
    confidenceBand: string;
    needsReview: boolean;
  }>;
}

export interface RoleBrief {
  jobId: string;
  title: string;
  company: string;
  fitBand: FitBand;
  fitReasons: string[];
  fitSummary: {
    totalRequirements: number;
    covered: number;
    gaps: number;
    needsReview: number;
  };
  requirementMap: {
    covered: RequirementWithEvidence[];
    gaps: RequirementWithEvidence[];
  };
  recommendedEmphasis: string[];
  matchingState: 'not_matched' | 'in_progress' | 'up_to_date' | 'stale' | 'needs_review';
}

/**
 * Generate role brief for a specific job and user.
 * Analyzes requirements coverage and gaps, determines fit band, and provides recommendations.
 * Per CONTEXT.md locked decision #7: Track matching state for stale detection.
 *
 * @param jobId - Job ID to analyze
 * @param userId - User ID to analyze evidence mappings for
 * @returns Role brief with fit analysis, coverage map, and recommended emphasis
 */
export async function generateRoleBrief(jobId: string, userId: string): Promise<RoleBrief> {
  // Get job details
  const [jobRecord] = await db.select().from(job).where(eq(job.id, jobId)).limit(1);

  if (!jobRecord) {
    throw new Error(`Job ${jobId} not found`);
  }

  // Get all requirements for job (excluding soft-rejected ones)
  const requirements = await db
    .select()
    .from(requirement)
    .where(and(eq(requirement.jobId, jobId), ne(requirement.reviewStatus, 'rejected')))
    .orderBy(
      sql`CASE ${requirement.priority}
        WHEN 'required' THEN 1
        WHEN 'preferred' THEN 2
        WHEN 'unknown' THEN 3
      END`,
      requirement.category
    );

  // Get evidence mappings for this user+job
  const mappings = await db
    .select({
      mappingId: evidenceMapping.id,
      requirementId: evidenceMapping.requirementId,
      evidenceItemId: evidenceMapping.evidenceItemId,
      evidenceTitle: evidenceItem.title,
      decision: evidenceMapping.decision,
      confidenceBand: evidenceMapping.confidenceBand,
      needsReview: evidenceMapping.needsReview,
    })
    .from(evidenceMapping)
    .innerJoin(requirement, eq(evidenceMapping.requirementId, requirement.id))
    .innerJoin(evidenceItem, eq(evidenceMapping.evidenceItemId, evidenceItem.id))
    .where(and(eq(requirement.jobId, jobId), eq(evidenceMapping.userId, userId)));

  // Group mappings by requirement ID
  const mappingsByRequirement = new Map<string, typeof mappings>();
  for (const mapping of mappings) {
    const existing = mappingsByRequirement.get(mapping.requirementId) || [];
    existing.push(mapping);
    mappingsByRequirement.set(mapping.requirementId, existing);
  }

  // Categorize requirements into covered and gaps
  const covered: RequirementWithEvidence[] = [];
  const gaps: RequirementWithEvidence[] = [];

  for (const req of requirements) {
    const reqMappings = mappingsByRequirement.get(req.id) || [];

    if (reqMappings.length > 0) {
      covered.push({
        id: req.id,
        category: req.category,
        priority: req.priority,
        normalizedText: req.normalizedText,
        sourceText: req.sourceText,
        evidenceMappings: reqMappings.map((m) => ({
          id: m.mappingId,
          evidenceItemId: m.evidenceItemId,
          evidenceTitle: m.evidenceTitle,
          decision: m.decision,
          confidenceBand: m.confidenceBand,
          needsReview: m.needsReview,
        })),
      });
    } else {
      gaps.push({
        id: req.id,
        category: req.category,
        priority: req.priority,
        normalizedText: req.normalizedText,
        sourceText: req.sourceText,
      });
    }
  }

  // Calculate fit summary
  const totalRequirements = requirements.length;
  const coveredCount = covered.length;
  const gapsCount = gaps.length;
  const needsReviewCount = mappings.filter((m) => m.needsReview).length;

  const coveragePercent = totalRequirements > 0 ? (coveredCount / totalRequirements) * 100 : 0;

  // Determine fit band per CONTEXT.md locked decision #4
  // Calculate average confidence band from mappings
  const confidenceBands = mappings.map((m) => m.confidenceBand);
  const hasHighConfidence = confidenceBands.some((c) => c === 'high');
  const hasLowConfidence = confidenceBands.some((c) => c === 'low');
  const avgConfidenceBand = hasLowConfidence ? 'low' : hasHighConfidence ? 'high' : 'medium';

  const fitBand = determineFitBand(coveragePercent, avgConfidenceBand);

  // Generate fit reasons
  const fitReasons = generateFitReasons(coveredCount, totalRequirements, gaps, needsReviewCount);

  // Identify recommended emphasis: top 3 evidence items used most frequently
  const evidenceUsageCounts = new Map<string, { title: string; count: number }>();
  for (const mapping of mappings) {
    const existing = evidenceUsageCounts.get(mapping.evidenceItemId);
    if (existing) {
      existing.count += 1;
    } else {
      evidenceUsageCounts.set(mapping.evidenceItemId, {
        title: mapping.evidenceTitle,
        count: 1,
      });
    }
  }

  const recommendedEmphasis = Array.from(evidenceUsageCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((item) => item.title);

  // Determine matching state per CONTEXT.md locked decision #7
  let matchingState: RoleBrief['matchingState'] = 'not_matched';
  if (mappings.length > 0) {
    if (needsReviewCount > 0) {
      matchingState = 'needs_review';
    } else {
      matchingState = 'up_to_date'; // Simplified; real stale detection needs lastMatchedAt comparison
    }
  }

  return {
    jobId,
    title: jobRecord.title,
    company: jobRecord.company,
    fitBand,
    fitReasons,
    fitSummary: {
      totalRequirements,
      covered: coveredCount,
      gaps: gapsCount,
      needsReview: needsReviewCount,
    },
    requirementMap: {
      covered,
      gaps,
    },
    recommendedEmphasis,
    matchingState,
  };
}

/**
 * Generate fit reasons for role brief.
 * Per CONTEXT.md locked decision #4: Reference specific evidence strength and critical gaps.
 */
function generateFitReasons(
  covered: number,
  total: number,
  gaps: RequirementWithEvidence[],
  needsReview: number
): string[] {
  const reasons: string[] = [];

  // Reason 1: Coverage strength
  const coveragePercent = total > 0 ? (covered / total) * 100 : 0;
  if (coveragePercent >= 80) {
    reasons.push(`Strong coverage: ${covered} of ${total} requirements matched`);
  } else if (coveragePercent >= 50) {
    reasons.push(`Partial coverage: ${covered} of ${total} requirements matched`);
  } else {
    reasons.push(`Limited coverage: Only ${covered} of ${total} requirements matched`);
  }

  // Reason 2: Critical gaps (required requirements with no evidence)
  const criticalGaps = gaps.filter((g) => g.priority === 'required');
  if (criticalGaps.length > 0) {
    const gapCategories = [...new Set(criticalGaps.map((g) => g.category))];
    reasons.push(
      `Missing ${criticalGaps.length} required skills: ${gapCategories.slice(0, 2).join(', ')}`
    );
  }

  // Reason 3: Review needed
  if (needsReview > 0) {
    reasons.push(`${needsReview} match${needsReview > 1 ? 'es' : ''} need manual review`);
  }

  return reasons.slice(0, 3); // Top 2-3 reasons
}
