import { db } from '@/lib/db';
import { job, requirement, evidenceItem, evidenceMapping } from '@/lib/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { generateRequirementEmbedding } from './embedder';
import { findSimilarEvidence } from './similarity';
import { validateEvidenceMatch } from './mapper';
import { createManyEvidenceMappings } from '@/lib/db/queries/evidence-mapping';
import {
  EMBEDDING_MODEL_VERSION,
  MATCHING_PROMPT_VERSION,
  LLM_MODEL_VERSION,
} from './versions';

/**
 * Matching pipeline orchestrator.
 * Per CONTEXT.md locked decision #7: Preserve manual overrides, never auto-overwrite.
 *
 * Two-stage pipeline per research:
 * 1. Vector similarity retrieves top candidates (10 per requirement)
 * 2. LLM validates with decision bands
 *
 * Hard limits per research Pitfall 4:
 * - Max 10 candidates per requirement (vector search top-K)
 * - Max 500 LLM calls per matching run (circuit breaker)
 */

export interface MatchingResult {
  totalRequirements: number;
  mapped: number;
  gaps: number;
  needsReview: number;
}

const MAX_CANDIDATES_PER_REQUIREMENT = 10;
const MAX_LLM_CALLS_PER_RUN = 500;

/**
 * Run the full matching pipeline for a single job.
 * Per CONTEXT.md locked decision #7: Update job.lastMatchedAt timestamp.
 *
 * Pipeline steps:
 * 1. Get job with requirements (verify job exists and has requirements)
 * 2. Get user's evidence items with embeddings (skip items without embeddings)
 * 3. For each requirement that doesn't already have a manual override mapping:
 *    a. If requirement has no embedding, generate one and store it
 *    b. Use findSimilarEvidence to get top-10 candidates
 *    c. For each candidate, call validateEvidenceMatch (LLM validation)
 *    d. Filter: keep match and weak_match, discard no_match
 *    e. Store valid mappings via createManyEvidenceMappings
 * 4. Update job.lastMatchedAt timestamp
 * 5. Return summary
 *
 * @param jobId - Job ID to run matching for
 * @param userId - User ID to match evidence for
 * @returns Matching result summary
 */
export async function runMatchingForJob(
  jobId: string,
  userId: string
): Promise<MatchingResult> {
  console.log(`[Matching Pipeline] Starting for job ${jobId}, user ${userId}`);

  // Step 1: Get job and requirements
  const [jobRecord] = await db.select().from(job).where(eq(job.id, jobId)).limit(1);

  if (!jobRecord) {
    throw new Error(`Job ${jobId} not found`);
  }

  const requirements = await db.select().from(requirement).where(eq(requirement.jobId, jobId));

  if (requirements.length === 0) {
    console.log(`[Matching Pipeline] Job ${jobId} has no requirements, skipping`);
    return { totalRequirements: 0, mapped: 0, gaps: 0, needsReview: 0 };
  }

  console.log(`[Matching Pipeline] Found ${requirements.length} requirements for job ${jobId}`);

  // Step 2: Get user's evidence items with embeddings
  const userEvidence = await db
    .select()
    .from(evidenceItem)
    .where(and(eq(evidenceItem.userId, userId), isNotNull(evidenceItem.embedding)));

  console.log(`[Matching Pipeline] Found ${userEvidence.length} evidence items with embeddings for user ${userId}`);

  if (userEvidence.length === 0) {
    console.log(`[Matching Pipeline] No evidence items with embeddings, skipping matching`);
    return { totalRequirements: requirements.length, mapped: 0, gaps: requirements.length, needsReview: 0 };
  }

  // Get existing manual mappings to preserve
  const existingMappings = await db
    .select()
    .from(evidenceMapping)
    .where(and(eq(evidenceMapping.userId, userId), eq(evidenceMapping.createdBySystem, false)));

  const manualRequirementIds = new Set(existingMappings.map((m) => m.requirementId));

  console.log(`[Matching Pipeline] Found ${manualRequirementIds.size} requirements with manual overrides, will preserve`);

  // Step 3: Process each requirement
  const allNewMappings: Array<{
    userId: string;
    requirementId: string;
    evidenceItemId: string;
    decision: string;
    confidenceBand: string;
    reason: string;
    needsReview: boolean;
    sourceRequirementText: string;
    sourceEvidenceExcerpt: string;
    embeddingModelVersion: string;
    matchingPromptVersion: string;
    llmModelVersion: string;
  }> = [];

  let llmCallCount = 0;

  for (const req of requirements) {
    // Skip if has manual override
    if (manualRequirementIds.has(req.id)) {
      console.log(`[Matching Pipeline] Requirement ${req.id} has manual override, skipping`);
      continue;
    }

    // 3a: If requirement has no embedding, generate one and store it
    let reqEmbedding: number[] | null = req.embedding as number[] | null;

    if (!reqEmbedding) {
      console.log(`[Matching Pipeline] Generating embedding for requirement ${req.id}`);
      reqEmbedding = await generateRequirementEmbedding(req.normalizedText);

      // Store embedding in database
      await db
        .update(requirement)
        .set({ embedding: reqEmbedding })
        .where(eq(requirement.id, req.id));
    }

    // 3b: Find similar evidence using vector search
    const candidates = await findSimilarEvidence(
      reqEmbedding,
      userId,
      MAX_CANDIDATES_PER_REQUIREMENT,
      0.3 // Low threshold since LLM refines
    );

    console.log(`[Matching Pipeline] Found ${candidates.length} similar evidence items for requirement ${req.id}`);

    // 3c: Validate each candidate with LLM
    for (const candidate of candidates) {
      // Circuit breaker
      if (llmCallCount >= MAX_LLM_CALLS_PER_RUN) {
        console.warn(`[Matching Pipeline] Reached max LLM calls (${MAX_LLM_CALLS_PER_RUN}), stopping validation`);
        break;
      }

      llmCallCount++;

      // Construct evidence context from candidate
      const evidenceParts = [candidate.title];
      if (candidate.company) evidenceParts.push(`at ${candidate.company}`);
      if (candidate.content) evidenceParts.push(candidate.content);
      if (candidate.metadata?.skills) evidenceParts.push(`Skills: ${candidate.metadata.skills.join(', ')}`);
      if (candidate.metadata?.technologies) evidenceParts.push(`Technologies: ${candidate.metadata.technologies.join(', ')}`);

      const evidenceContext = evidenceParts.join(' | ');

      try {
        const validation = await validateEvidenceMatch(req.normalizedText, evidenceContext);

        // 3d: Filter - keep match and weak_match, discard no_match
        if (validation.decision === 'match' || validation.decision === 'weak_match') {
          allNewMappings.push({
            userId,
            requirementId: req.id,
            evidenceItemId: candidate.id,
            decision: validation.decision,
            confidenceBand: validation.confidenceBand,
            reason: validation.reason,
            needsReview: validation.needsReview,
            sourceRequirementText: req.sourceText,
            sourceEvidenceExcerpt: validation.quotedEvidenceText,
            embeddingModelVersion: EMBEDDING_MODEL_VERSION,
            matchingPromptVersion: MATCHING_PROMPT_VERSION,
            llmModelVersion: LLM_MODEL_VERSION,
          });

          console.log(`[Matching Pipeline] Validated ${validation.decision} for requirement ${req.id} + evidence ${candidate.id}`);
        } else {
          console.log(`[Matching Pipeline] Rejected no_match for requirement ${req.id} + evidence ${candidate.id}`);
        }
      } catch (error) {
        console.error(`[Matching Pipeline] LLM validation failed for requirement ${req.id} + evidence ${candidate.id}:`, error);
        // Continue with next candidate
      }
    }

    // Break outer loop if circuit breaker triggered
    if (llmCallCount >= MAX_LLM_CALLS_PER_RUN) {
      break;
    }
  }

  // 3e: Store all valid mappings in batch
  if (allNewMappings.length > 0) {
    console.log(`[Matching Pipeline] Storing ${allNewMappings.length} new evidence mappings`);
    await createManyEvidenceMappings(allNewMappings);
  }

  // Step 4: Update job.lastMatchedAt timestamp
  await db
    .update(job)
    .set({ lastMatchedAt: new Date() })
    .where(eq(job.id, jobId));

  // Step 5: Calculate summary
  const totalMapped = allNewMappings.length + manualRequirementIds.size;
  const needsReview = allNewMappings.filter((m) => m.needsReview).length;

  const result: MatchingResult = {
    totalRequirements: requirements.length,
    mapped: totalMapped,
    gaps: requirements.length - totalMapped,
    needsReview,
  };

  console.log(`[Matching Pipeline] Complete for job ${jobId}: ${JSON.stringify(result)}`);
  console.log(`[Matching Pipeline] Used ${llmCallCount} LLM calls`);

  return result;
}
