---
phase: 05-matching-core
plan: 02
subsystem: matching-engine
tags: [embeddings, llm-validation, vector-search, ranking, gap-analysis]
dependency_graph:
  requires:
    - 05-01 (schema-migration)
    - 03-02 (resume-parsing - evidence items)
    - 04-02 (requirement-extraction)
  provides:
    - embedding-generation
    - eligibility-filtering
    - vector-similarity-search
    - llm-validation-with-decision-bands
    - weighted-ranking-70-30
    - gap-analysis-role-brief
    - evidence-mapping-crud-with-audit
    - matching-pipeline-orchestration
  affects:
    - 05-03 (matching-api - will consume these modules)
    - 05-04 (matching-ui - will display fit bands and role briefs)
tech_stack:
  added:
    - OpenAI text-embedding-3-small (1536-dim embeddings)
    - OpenAI gpt-4o-2024-08-06 (LLM validation with structured outputs)
    - pgvector cosineDistance (vector similarity search)
  patterns:
    - Lazy-init OpenAI client (DEV-014)
    - Conservative prompting (per CONTEXT.md locked decision #3)
    - Two-stage matching pipeline (vector retrieval + LLM validation)
    - Exponential decay freshness scoring (half-life ~7 days)
    - Audit trail with before/after values (per CONTEXT.md locked decision #8)
key_files:
  created:
    - src/lib/matching/embedder.ts (embedding generation)
    - src/lib/matching/eligibility.ts (hard filters before semantic matching)
    - src/lib/matching/similarity.ts (vector cosine similarity search)
    - src/lib/matching/mapper.ts (LLM validation with decision bands)
    - src/lib/matching/ranker.ts (70/30 fit + freshness ranking)
    - src/lib/matching/gap-analyzer.ts (role brief generation)
    - src/lib/matching/pipeline.ts (matching orchestrator)
    - src/lib/db/queries/evidence-mapping.ts (CRUD with audit trail)
  modified: []
decisions:
  - id: IMPL-001
    title: Use text-embedding-3-small NOT text-embedding-3-large
    rationale: Per CONTEXT.md locked decision #1 - native 1536 dims, 5x cheaper, sufficient for V1
    impact: Lower cost, simpler pgvector config, more experimentation budget
  - id: IMPL-002
    title: Apply 5 hard eligibility filters BEFORE semantic matching
    rationale: Per CONTEXT.md locked decision #2 - exclude clearly ineligible jobs to reduce LLM calls
    impact: Visa, location, role type, season, graduation filters applied before embeddings
  - id: IMPL-003
    title: LLM returns structured decision bands NOT simple boolean
    rationale: Per CONTEXT.md locked decision #3 - match/weak_match/no_match with confidence bands
    impact: Conservative prompting, needsReview flags for medium/low confidence and all weak_match
  - id: IMPL-004
    title: Ranking formula is 70% fit + 30% freshness (NO quality)
    rationale: Per CONTEXT.md locked decision #5 - removed poorly-defined quality component
    impact: Simpler formula, easier to explain and tune, can add quality in V2
  - id: IMPL-005
    title: Show fit bands (High/Medium/Low) with reasons NOT percentages
    rationale: Per CONTEXT.md locked decision #4 - avoid fake precision, provide actionable reasons
    impact: UI displays fit bands with top 2-3 reasons, internal scores hidden
  - id: IMPL-006
    title: Preserve manual overrides during re-matching
    rationale: Per CONTEXT.md locked decision #7 - never auto-overwrite user edits
    impact: Pipeline skips requirements with createdBySystem=false mappings
  - id: IMPL-007
    title: Hard limits on vector search and LLM calls
    rationale: Per research Pitfall 4 - circuit breakers prevent runaway costs
    impact: Max 10 candidates per requirement, max 500 LLM calls per matching run
metrics:
  duration_minutes: 6
  completed_at: "2026-03-30T06:36:21Z"
  tasks_completed: 2
  commits: 2
  files_created: 8
  deviations: 0
---

# Phase 5 Plan 02: Matching Engine Modules Summary

**One-liner:** Two-stage matching pipeline using text-embedding-3-small for vector retrieval + gpt-4o for conservative LLM validation with structured decision bands, 70/30 fit+freshness ranking, gap analysis for role briefs, and full audit trail for evidence mappings.

## Objective

Build the complete matching engine: embedding generator, eligibility filters, two-stage matching pipeline (vector similarity + LLM validation), weighted ranker, gap analyzer, evidence mapping CRUD, and orchestration pipeline.

**Purpose:** Implements the core intelligence layer that maps user evidence to job requirements, producing decision-banded matches with provenance, ranked jobs by fit + freshness, and gap analysis for role briefs.

**Output:** Matching engine modules ready for API integration.

## Completed Tasks

### Task 1: Create embedding generator, eligibility filters, and vector similarity search

**Commit:** `636930f`

**What was built:**

1. **Embedder (`src/lib/matching/embedder.ts`):**
   - Generates 1536-dim vectors using `text-embedding-3-small` (per CONTEXT.md locked decision #1)
   - Does NOT specify dimensions parameter (native 1536 output, no reduction)
   - Lazy-init OpenAI client per DEV-014 pattern
   - Functions: `generateEmbedding`, `generateBatchEmbeddings`, `generateEvidenceEmbedding`, `generateRequirementEmbedding`
   - Batch support for up to 2048 texts per OpenAI API call

2. **Eligibility filter (`src/lib/matching/eligibility.ts`):**
   - Applies 5 hard filters BEFORE semantic matching (per CONTEXT.md locked decision #2)
   - Filter order: Visa → Location/Remote → Internship vs Full-Time → Season → Graduation Window
   - Conservative approach: Unknown values pass through (don't exclude what we can't confirm)
   - V1 specific: Excludes all full-time roles (internship-only)

3. **Similarity search (`src/lib/matching/similarity.ts`):**
   - Vector cosine similarity search using drizzle-orm `cosineDistance` helper
   - Searches only evidence items with non-null embeddings
   - Returns top-K results sorted by similarity descending
   - Default topK=10, minSimilarity=0.3 (low threshold since LLM refines)

**Verification:**
- Build passes with no TypeScript errors
- Confirmed `text-embedding-3-small` used (NOT `text-embedding-3-large`)
- Confirmed NO `dimensions` parameter passed to OpenAI API
- Confirmed `cosineDistance` used for vector search
- Confirmed no unverified performance claims in comments

### Task 2: Create LLM mapper, ranker, gap analyzer, evidence mapping CRUD, and pipeline orchestrator

**Commit:** `b929b68`

**What was built:**

1. **LLM mapper (`src/lib/matching/mapper.ts`):**
   - Uses `gpt-4o-2024-08-06` with OpenAI Structured Outputs (per CONTEXT.md locked decision #6)
   - Conservative prompting per CONTEXT.md locked decision #3
   - Decision bands: `match`, `weak_match`, `no_match` with confidence `high`, `medium`, `low`
   - Provenance: Returns `quotedRequirementText` and `quotedEvidenceText` for every validation
   - `needsReview` flag: true for all weak_match AND match with medium/low confidence

2. **Ranker (`src/lib/matching/ranker.ts`):**
   - Weighted ranking: `composite_score = 0.7 * fit_score + 0.3 * freshness_score` (per CONTEXT.md locked decision #5)
   - NO quality component (removed from research's 60/30/10 formula)
   - Freshness: Exponential decay `e^(-0.1 * daysOld)`, half-life ~7 days
   - Fit bands: High (80%+ coverage), Medium (50-79%), Low (<50%)
   - Generates top 2-3 reasons per job (coverage strength, freshness, critical gaps)
   - Returns top 50 jobs ordered by composite score

3. **Gap analyzer (`src/lib/matching/gap-analyzer.ts`):**
   - Generates role brief for a job+user
   - Categorizes requirements into covered (has mappings) and gaps (no mappings)
   - Calculates fit summary: total requirements, covered count, gap count, needsReview count
   - Determines fit band per CONTEXT.md locked decision #4
   - Identifies recommended emphasis: top 3 evidence items used most frequently
   - Sorts gaps by priority (required first)
   - Matching state tracking per CONTEXT.md locked decision #7

4. **Evidence mapping CRUD (`src/lib/db/queries/evidence-mapping.ts`):**
   - Full CRUD with audit trail (create, batch create, update, delete, get)
   - Stores all provenance fields per CONTEXT.md locked decision #8
   - Version tracking per CONTEXT.md locked decision #6: `embeddingModelVersion`, `matchingPromptVersion`, `llmModelVersion`
   - Manual override support: `createdBySystem=false` preserves user edits
   - Audit trail with before/after values in transactions (per requirements.ts pattern)
   - Functions: `createEvidenceMapping`, `createManyEvidenceMappings`, `updateEvidenceMapping`, `deleteEvidenceMapping`, `getEvidenceMappingsForJob`, `getEvidenceMappingsForRequirement`, `getEvidenceMappingAuditTrail`

5. **Pipeline orchestrator (`src/lib/matching/pipeline.ts`):**
   - Two-stage pipeline: vector similarity → LLM validation (per research)
   - Preserves manual overrides per CONTEXT.md locked decision #7
   - For each requirement: (a) generate embedding if missing, (b) find top-10 similar evidence, (c) LLM validate each, (d) store match/weak_match
   - Hard limits per research Pitfall 4: max 10 candidates per requirement, max 500 LLM calls per run
   - Updates `job.lastMatchedAt` timestamp for stale detection
   - Returns summary: `totalRequirements`, `mapped`, `gaps`, `needsReview`
   - Logging throughout for monitoring and debugging

**Verification:**
- Build passes with no TypeScript errors
- Confirmed decision bands (match/weak_match/no_match) in mapper
- Confirmed 70/30 weighting in ranker (NOT 60/30/10)
- Confirmed NO "quality" references in ranker
- Confirmed pipeline imports and uses all matching modules
- Confirmed evidence-mapping CRUD includes audit trail in transactions
- Confirmed no unverified performance claims (no "~10ms", "98%+ recall", etc.)

## Deviations from Plan

None - plan executed exactly as written.

All 9 locked decisions from CONTEXT.md were followed:
1. ✅ text-embedding-3-small at 1536 dims (no reduction)
2. ✅ Hard eligibility filters before semantic matching
3. ✅ Structured LLM validation with conservative decision bands
4. ✅ Fit bands + reasons in UI, NOT percentages
5. ✅ 70/30 ranking formula (removed quality)
6. ✅ Version constants for audit trail
7. ✅ Manual override preservation during re-matching
8. ✅ Provenance tracking for all mappings
9. ✅ No unverified performance claims

## Architecture Notes

**Two-stage pipeline:**
1. **Vector similarity** (fast, high recall): Retrieves top-10 candidates per requirement using pgvector HNSW index
2. **LLM validation** (accurate, conservative): Validates each candidate with structured outputs, decision bands, and provenance

**Conservative by design:**
- Low vector similarity threshold (0.3) to maximize recall
- LLM conservative prompting to minimize false positives
- Decision bands with `needsReview` flags for borderline cases
- Manual overrides never auto-overwritten

**Circuit breakers:**
- Max 10 candidates per requirement (prevents excessive LLM calls)
- Max 500 LLM calls per matching run (cost control)
- Pipeline continues on individual validation failures (resilient)

**Audit trail:**
- Every mapping stores version info (embedding model, LLM model, prompt version)
- Before/after values tracked for all updates and deletes
- User ID and timestamp on all changes
- Enables reproducibility, debugging, A/B testing

## Integration Points

**Consumed by:**
- 05-03 (Matching API): Will expose `runMatchingForJob`, `getRankedJobs`, `generateRoleBrief` via REST endpoints
- 05-04 (Matching UI): Will display fit bands, reasons, coverage map, recommended emphasis

**Depends on:**
- Evidence items with embeddings (03-02 resume parsing)
- Requirements with normalized text (04-02 requirement extraction)
- Schema with vector columns and HNSW indexes (05-01 schema migration)

## Next Steps

**Phase 5 Plan 03 (Matching API):**
- Create REST endpoints for matching pipeline
- Add job matching trigger endpoint (POST `/api/jobs/:id/match`)
- Add ranked jobs list endpoint (GET `/api/jobs/ranked`)
- Add role brief endpoint (GET `/api/jobs/:id/brief`)
- Add evidence mapping CRUD endpoints for manual overrides

**Phase 5 Plan 04 (Matching UI):**
- Build Fresh Match Queue with fit bands and reasons
- Build Role Brief view with coverage map and gap analysis
- Build manual override interface for evidence mappings
- Add "Run Matching" button for on-demand matching

## Self-Check

Verifying claimed files exist and commits are valid:

```bash
# Check created files
[ -f "src/lib/matching/embedder.ts" ] && echo "FOUND: embedder.ts" || echo "MISSING: embedder.ts"
[ -f "src/lib/matching/eligibility.ts" ] && echo "FOUND: eligibility.ts" || echo "MISSING: eligibility.ts"
[ -f "src/lib/matching/similarity.ts" ] && echo "FOUND: similarity.ts" || echo "MISSING: similarity.ts"
[ -f "src/lib/matching/mapper.ts" ] && echo "FOUND: mapper.ts" || echo "MISSING: mapper.ts"
[ -f "src/lib/matching/ranker.ts" ] && echo "FOUND: ranker.ts" || echo "MISSING: ranker.ts"
[ -f "src/lib/matching/gap-analyzer.ts" ] && echo "FOUND: gap-analyzer.ts" || echo "MISSING: gap-analyzer.ts"
[ -f "src/lib/matching/pipeline.ts" ] && echo "FOUND: pipeline.ts" || echo "MISSING: pipeline.ts"
[ -f "src/lib/db/queries/evidence-mapping.ts" ] && echo "FOUND: evidence-mapping.ts" || echo "MISSING: evidence-mapping.ts"

# Check commits exist
git log --oneline --all | grep -q "636930f" && echo "FOUND: 636930f" || echo "MISSING: 636930f"
git log --oneline --all | grep -q "b929b68" && echo "FOUND: b929b68" || echo "MISSING: b929b68"
```

**Self-Check Result:** PASSED

All files verified:
- FOUND: embedder.ts
- FOUND: eligibility.ts
- FOUND: similarity.ts
- FOUND: mapper.ts
- FOUND: ranker.ts
- FOUND: gap-analyzer.ts
- FOUND: pipeline.ts
- FOUND: evidence-mapping.ts

All commits verified:
- FOUND: 636930f
- FOUND: b929b68
