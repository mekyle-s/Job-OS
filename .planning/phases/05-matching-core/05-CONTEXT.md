# Phase 5: Matching Core - Context & Decisions

**Created:** 2026-03-24
**Source:** User feedback on initial plans

## Locked Decisions

### 1. Embedding Model Specification (LOCKED)

**Decision:** Use `text-embedding-3-small` at 1536 dimensions (native, no reduction)

**Rationale:**
- Native 1536-dim output (no dimension reduction complexity)
- 5x cheaper than text-embedding-3-large ($0.02 vs $0.13 per 1M tokens)
- Sufficient quality for V1 internship matching
- Simpler pgvector configuration
- Lower cost = more experimentation budget

**Implementation requirements:**
- Model: `text-embedding-3-small`
- Dimensions: 1536 (native, do NOT specify dimensions parameter)
- pgvector storage: `vector(1536)` columns
- HNSW index configuration: `m=16, ef_construction=64` for 1536-dim vectors

### 2. Hard Eligibility Filters BEFORE Semantic Matching (LOCKED)

**Decision:** Apply non-semantic filters before embeddings to exclude clearly ineligible jobs

**Filters to apply (in order):**
1. **Visa/Work Authorization** - If user requires visa sponsorship and job doesn't offer it, exclude
2. **Location/Remote** - If job is on-site and user location doesn't match, exclude (unless job allows remote)
3. **Internship vs Full-Time** - V1 is internship-only; exclude full-time roles
4. **Season/Term** - If job specifies summer-only and user wants fall, exclude
5. **Graduation Window** - If available, exclude roles requiring graduation dates outside user's window

**Implementation:**
- Add eligibility filter step BEFORE calling matching engine
- Store filter metadata in job table (visa_sponsorship, remote_policy, role_type, season, graduation_window)
- Matching pipeline only runs on pre-filtered eligible jobs
- Do NOT show ineligible jobs in Fresh Match Queue at all

### 3. Structured LLM Validation with Conservative Bands (LOCKED)

**Decision:** LLM validation returns structured output with decision bands, not just confidence scores

**Required output schema:**
```typescript
{
  decision: 'match' | 'weak_match' | 'no_match',
  reason: string,  // Why this decision was made
  quotedRequirementText: string,  // Exact text from requirement
  quotedEvidenceText: string,  // Exact text from evidence that proves it
  confidenceBand: 'high' | 'medium' | 'low',
  needsReview: boolean  // True if borderline or low confidence
}
```

**Decision mapping:**
- `match` + `high` confidence → auto-accept, store mapping
- `match` + `medium/low` confidence → store but flag for review
- `weak_match` → store but always flag needsReview=true
- `no_match` → discard, do not store

**Conservative prompting rules:**
- Only mark `match` if there is clear, specific proof
- Use `weak_match` for semantic similarity without explicit proof
- Use `no_match` for mismatches or insufficient evidence
- Be conservative with confidence bands (high = explicit match only)

### 4. Fit Bands + Reasons in UI, NOT Percentages (LOCKED)

**Decision:** Show fit bands (High/Medium/Low) with reasons, avoid fake precision

**UI presentation:**
- **High Fit** - 80%+ requirements covered with high-confidence evidence
- **Medium Fit** - 50-79% coverage OR mix of high/medium confidence
- **Low Fit** - <50% coverage OR mostly low-confidence matches

**In role cards:**
- Show fit band (High/Medium/Low) with color coding
- Show top 2-3 reasons: "Strong Python experience", "Matches 8 of 10 technical requirements", "No leadership experience (gap)"
- Keep internal numeric scores for ranking, but DO NOT show percentages to users

**Reasons generation:**
- Extract from requirement categories with high coverage
- Highlight critical gaps (required requirements with no evidence)
- Reference specific evidence strength

### 5. Define "Quality" Component in Ranking (LOCKED)

**Decision:** Remove "quality" from V1 ranking formula; use 2-factor ranking instead

**New ranking formula:**
```
composite_score = 0.7 * fit + 0.3 * freshness
```

**Rationale:**
- "Quality" was poorly defined (avg confidence? data completeness?)
- Fit already incorporates confidence via evidence mapping validation
- Simpler formula = easier to explain and tune
- Can add quality back in V2 if needed (e.g., job source reputation, requirement extraction confidence)

**Implementation:**
- Update ranking query to use 70/30 weights
- Remove avg_confidence from composite score calculation
- Track quality metrics separately for future analysis but don't rank on them

### 6. Versioning for Audit Trail (LOCKED)

**Decision:** Version all matching components for reproducibility and debugging

**What to version:**
1. **Embedding model version** - Store in evidence_mapping table: `embedding_model_version` (e.g., "text-embedding-3-small-1536")
2. **Matching prompt version** - Store prompt hash or version ID in evidence_mapping: `matching_prompt_version`
3. **Ranking formula version** - Store in match queue cache or job metadata: `ranking_version` (e.g., "v1-fit70-fresh30")
4. **LLM model version** - Store in evidence_mapping: `llm_model_version` (e.g., "gpt-4o-2024-08-06")

**Schema additions:**
- Add to `evidence_mapping` table: `embedding_model_version`, `matching_prompt_version`, `llm_model_version`
- Add to job or match queue cache: `ranking_version`
- Add constants file: `src/lib/matching/versions.ts` with current versions

**Why:**
- Understand why match quality changes over time
- Roll back to previous versions if new prompt degrades quality
- A/B test different matching strategies
- Debug user reports of "missing matches"

### 7. Re-run Triggers and Stale-State Behavior (LOCKED)

**Decision:** Define exactly when matching re-runs and how stale state is communicated

**Re-run triggers:**
1. **User clicks "Run Matching" button** - Manual trigger, re-runs for specific job
2. **Evidence added/edited/deleted** - Mark all existing mappings as potentially stale, do NOT auto-rerun (expensive)
3. **Requirement extraction changes** - If requirements change for a job, mark mappings stale
4. **New job ingested** - Auto-run matching for new jobs (background job)
5. **Manual mapping edited** - Do NOT re-run; preserve manual overrides
6. **Ranking logic changes** - Only affects queue order, not mappings (no re-run needed)

**UI/System states:**
- **Not matched yet** - Job has requirements but no evidence mappings (show "Run Matching" button)
- **Matching in progress** - Show loading spinner on button, disable interactions
- **Up to date** - Mappings exist and evidence hasn't changed since last run (no indicator needed)
- **Stale after edits** - Evidence changed since last matching run (show "Re-run to refresh" badge/button)
- **Needs review** - Has mappings with `needsReview=true` flags (show review count badge)

**Stale detection:**
- Add `last_matched_at` timestamp to job or evidence_mapping
- Compare with evidence `updatedAt` timestamps
- If any evidence updated after last_matched_at, mark stale

### 8. Provenance for All Mappings (LOCKED)

**Decision:** Preserve source texts and metadata for every requirement→evidence match

**Required provenance fields (in evidence_mapping table):**
- `sourceRequirementText` - Original requirement text from job posting (before normalization)
- `sourceEvidenceExcerpt` - Exact text from evidence that proves requirement (not just title)
- `embeddingModelVersion` - Which embedding model was used
- `matchingPromptVersion` - Which LLM prompt validated this match
- `llmModelVersion` - Which LLM model produced the validation
- `createdBySystem` - Boolean (true if system-generated, false if manual)
- `manualOverrideReason` - If user edited, why (nullable text field)

**Audit trail additions:**
- Store before/after values for all edits
- Track who made the change (userId)
- Track when the change was made (timestamp)
- Track what changed (action: create/update/delete/accept/reject)

**Why:**
- Users can see exact proof text without opening evidence detail
- Debug false positives/negatives by reviewing source texts
- Track how matching quality changes over model/prompt versions
- Legal/compliance: show exactly why a match was made

### 9. Remove Unverified Performance Claims (LOCKED)

**Decision:** Do not hard-code performance promises without benchmarks

**What to remove:**
- Claims like "~10ms for 100K vectors"
- Claims like "15-30% better recall"
- Claims like "98%+ recall with HNSW"

**What to keep:**
- Architecture descriptions: "HNSW indexes for efficient similarity search"
- Relative statements: "HNSW provides better recall than IVFFlat"
- Research references: "Research shows hybrid approaches improve recall"

**Add instead:**
- Performance monitoring hooks
- Logging for query times
- Metrics collection for actual recall/precision on our dataset
- V2 optimization opportunity: "benchmark and tune based on real data"

## Claude's Discretion

### API Design
- REST endpoint structure
- Request/response formats
- Error handling patterns
- Authentication approach (already using verifySession)

### UI/UX Details
- Exact color schemes for fit bands
- Layout/spacing for role cards
- Icon choices
- Loading state animations
- Confirmation dialog text

### Database Schema Details
- Index naming conventions (as long as HNSW indexes exist)
- Timestamp column patterns (as long as audit trail exists)
- ID generation strategy (already using crypto.randomUUID())

### Code Organization
- File structure within src/lib/matching/
- Function naming conventions (as long as exports match must_haves)
- Import organization

## Deferred Ideas (Out of Scope for Phase 5)

- Hybrid search (BM25 + embeddings) - defer to Phase 6 if users report missed exact keyword matches
- Match queue caching - compute on-demand initially, add cache only if queries >2s
- A/B testing infrastructure - track metrics in V1, build testing framework in V2
- Confidence threshold calibration from user feedback - collect data in V1, tune in V2
- Dimension reduction experiments (1536 vs 512 vs 256) - V1 uses 1536, test in V2
- Embedding refresh triggers - V1 handles stale state with UI indicators, auto-refresh in V2
- Advanced quality scoring - V1 uses fit + freshness only, add quality back in V2 with definition

## Notes

- These decisions lock in the architecture for V1
- Planner has discretion on implementation details within these constraints
- Any conflicts between decisions and existing research should be flagged
- Performance optimization is V2 work; V1 focuses on correctness and user trust
