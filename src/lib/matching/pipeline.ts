import { db } from '@/lib/db';
import { job, requirement, evidenceItem, evidenceMapping } from '@/lib/db/schema';
import { eq, and, isNotNull, inArray } from 'drizzle-orm';
import { generateBatchEmbeddings } from './embedder';
import { findSimilarEvidence } from './similarity';
import { validateEvidenceMatch } from './mapper';
import { createManyEvidenceMappings } from '@/lib/db/queries/evidence-mapping';
import { EMBEDDING_MODEL_VERSION, MATCHING_PROMPT_VERSION, LLM_MODEL_VERSION } from './versions';

/**
 * Matching pipeline orchestrator.
 * Per CONTEXT.md locked decision #7: Preserve manual overrides, never auto-overwrite.
 *
 * Two-stage pipeline per research:
 * 1. Vector similarity retrieves top candidates (cheap pgvector cosine search)
 * 2. LLM validates with decision bands — but only the top-K candidate pairs
 *    by similarity score (hard cap), so worst-case spend per run is bounded
 *    even in open "discover mode" with no company criteria.
 */

export interface MatchingResult {
  totalRequirements: number;
  mapped: number;
  gaps: number;
  needsReview: number;
}

// 5 candidates per requirement: vector search is cheap but each candidate costs
// one LLM validation call — top-5 keeps recall high while halving LLM spend
const MAX_CANDIDATES_PER_REQUIREMENT = 5;

// Hard cap on LLM validation calls per matching run. With open discover-mode
// criteria a run could otherwise fan out to hundreds of gpt-4o-mini calls.
// Pairs beyond the cap stay unvalidated and are picked up by later runs
// (already-validated pairs are skipped, so each run works down the ranking).
// Overridable via env for tuning without a deploy.
const MAX_EVALUATIONS_PER_RUN = Number(process.env.MAX_EVALUATIONS_PER_RUN ?? 25);

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
export async function runMatchingForJob(jobId: string, userId: string): Promise<MatchingResult> {
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

  console.log(
    `[Matching Pipeline] Found ${userEvidence.length} evidence items with embeddings for user ${userId}`
  );

  if (userEvidence.length === 0) {
    console.log(`[Matching Pipeline] No evidence items with embeddings, skipping matching`);
    return {
      totalRequirements: requirements.length,
      mapped: 0,
      gaps: requirements.length,
      needsReview: 0,
    };
  }

  const requirementIds = requirements.map((r) => r.id);

  // Get ALL existing mappings for this job's requirements:
  // - manual overrides are preserved (their requirements are skipped entirely)
  // - already-validated requirement↔evidence pairs are skipped to avoid
  //   redundant LLM calls and duplicate mappings on repeated runs
  const existingMappings = await db
    .select()
    .from(evidenceMapping)
    .where(
      and(
        eq(evidenceMapping.userId, userId),
        inArray(evidenceMapping.requirementId, requirementIds)
      )
    );

  const manualRequirementIds = new Set(
    existingMappings.filter((m) => !m.createdBySystem).map((m) => m.requirementId)
  );
  const validatedPairs = new Set(
    existingMappings.map((m) => `${m.requirementId}:${m.evidenceItemId}`)
  );

  console.log(
    `[Matching Pipeline] Found ${manualRequirementIds.size} requirements with manual overrides, will preserve`
  );
  console.log(
    `[Matching Pipeline] Found ${validatedPairs.size} already-validated pairs, will skip re-validation`
  );

  // Batch-generate missing requirement embeddings in ONE API call instead of
  // one call per requirement (embedding requests are billed per token either
  // way, but batching removes N-1 round trips and rate-limit pressure)
  const missingEmbedding = requirements.filter(
    (r) => !r.embedding && !manualRequirementIds.has(r.id)
  );
  if (missingEmbedding.length > 0) {
    console.log(
      `[Matching Pipeline] Batch-generating ${missingEmbedding.length} requirement embeddings`
    );
    const embeddings = await generateBatchEmbeddings(missingEmbedding.map((r) => r.normalizedText));
    for (let i = 0; i < missingEmbedding.length; i++) {
      missingEmbedding[i].embedding = embeddings[i];
      await db
        .update(requirement)
        .set({ embedding: embeddings[i] })
        .where(eq(requirement.id, missingEmbedding[i].id));
    }
  }

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

  // 3a/3b: Top-K embedding guardrail — collect every unvalidated
  // requirement↔evidence candidate pair via cheap pgvector cosine search.
  // No LLM calls happen in this phase.
  const scoredCandidates: Array<{
    req: (typeof requirements)[number];
    candidate: Awaited<ReturnType<typeof findSimilarEvidence>>[number];
  }> = [];

  for (const req of requirements) {
    // Skip if has manual override
    if (manualRequirementIds.has(req.id)) {
      console.log(`[Matching Pipeline] Requirement ${req.id} has manual override, skipping`);
      continue;
    }

    // Embeddings were batch-generated above; skip anything still missing
    const reqEmbedding: number[] | null = req.embedding as number[] | null;

    if (!reqEmbedding) {
      console.warn(`[Matching Pipeline] Requirement ${req.id} has no embedding, skipping`);
      continue;
    }

    const candidates = await findSimilarEvidence(
      reqEmbedding,
      userId,
      MAX_CANDIDATES_PER_REQUIREMENT,
      0.3 // Low threshold since LLM refines
    );

    for (const candidate of candidates) {
      // Skip pairs already validated in a previous run (cache hit — no LLM call)
      if (validatedPairs.has(`${req.id}:${candidate.id}`)) {
        continue;
      }
      scoredCandidates.push({ req, candidate });
    }
  }

  // Hard cap: sort by vector similarity and feed ONLY the top pairs to the
  // LLM. Everything below the cap stays unmapped for later runs.
  scoredCandidates.sort((a, b) => b.candidate.similarity - a.candidate.similarity);
  const toValidate = scoredCandidates.slice(0, MAX_EVALUATIONS_PER_RUN);

  console.log(
    `[Matching Pipeline] ${scoredCandidates.length} candidate pairs from vector search, validating top ${toValidate.length} (cap: ${MAX_EVALUATIONS_PER_RUN})`
  );

  // 3c: Validate the capped set with the LLM
  let llmCallCount = 0;

  for (const { req, candidate } of toValidate) {
    llmCallCount++;

    // Construct evidence context from candidate
    const evidenceParts = [candidate.title];
    if (candidate.company) evidenceParts.push(`at ${candidate.company}`);
    if (candidate.content) evidenceParts.push(candidate.content);
    if (candidate.metadata?.skills)
      evidenceParts.push(`Skills: ${candidate.metadata.skills.join(', ')}`);
    if (candidate.metadata?.technologies)
      evidenceParts.push(`Technologies: ${candidate.metadata.technologies.join(', ')}`);

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

        console.log(
          `[Matching Pipeline] Validated ${validation.decision} for requirement ${req.id} + evidence ${candidate.id}`
        );
      } else {
        console.log(
          `[Matching Pipeline] Rejected no_match for requirement ${req.id} + evidence ${candidate.id}`
        );
      }
    } catch (error) {
      console.error(
        `[Matching Pipeline] LLM validation failed for requirement ${req.id} + evidence ${candidate.id}:`,
        error
      );
      // Continue with next candidate
    }
  }

  // 3e: Store all valid mappings in batch
  if (allNewMappings.length > 0) {
    console.log(`[Matching Pipeline] Storing ${allNewMappings.length} new evidence mappings`);
    await createManyEvidenceMappings(allNewMappings);
  }

  // Step 4: Update job.lastMatchedAt timestamp
  await db.update(job).set({ lastMatchedAt: new Date() }).where(eq(job.id, jobId));

  // Step 5: Calculate summary (count distinct requirements covered by any
  // mapping — pre-existing, manual, or newly created this run)
  const mappedRequirementIds = new Set<string>([
    ...existingMappings.map((m) => m.requirementId),
    ...allNewMappings.map((m) => m.requirementId),
  ]);
  const totalMapped = mappedRequirementIds.size;
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
