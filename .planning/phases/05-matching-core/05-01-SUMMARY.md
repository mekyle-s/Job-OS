---
phase: 05-matching-core
plan: 01
subsystem: database
tags: [pgvector, drizzle-orm, zod, hnsw, embeddings, schema-migration]

# Dependency graph
requires:
  - phase: 03-evidence-foundation
    provides: evidence_item and requirement tables for embedding columns
  - phase: 04-job-data-pipeline
    provides: job table for eligibility filter columns
provides:
  - Vector embedding infrastructure with HNSW indexes for semantic search
  - Evidence mapping tables with full provenance tracking and audit trail
  - Eligibility filter columns on job table for pre-semantic filtering
  - Version constants for matching pipeline reproducibility
  - Zod schemas for LLM validation output and evidence mapping CRUD
affects: [05-matching-core, 06-ranking-algorithm, matching-engine, job-filtering]

# Tech tracking
tech-stack:
  added: [pgvector extension]
  patterns: [vector similarity search with HNSW indexes, provenance tracking in mappings, version-based audit trail]

key-files:
  created:
    - src/lib/matching/versions.ts
    - src/lib/schemas/matching.ts
    - migrations/0004_robust_king_bedlam.sql
    - migrations/0004_pre_enable_pgvector.sql
    - migrations/0004_post_create_hnsw_indexes.sql
    - scripts/run-vector-migration.ts
  modified:
    - src/lib/db/schema.ts
    - src/lib/db/queries/jobs.ts

key-decisions:
  - "Used text-embedding-3-small-1536 (not large) per CONTEXT.md locked decision #1"
  - "HNSW indexes configured with m=16, ef_construction=64 for balanced performance"
  - "Evidence mapping tracks source text snapshots for provenance"
  - "Version constants enable reproducible matching pipeline debugging"

patterns-established:
  - "Vector columns nullable to allow non-embedded content"
  - "Provenance columns (sourceRequirementText, sourceEvidenceExcerpt) capture snapshots at match time"
  - "Audit trail uses before_value/after_value JSONB for flexible change tracking"
  - "Migration runner pattern with separate pre/main/post scripts for complex migrations"

# Metrics
duration: 4min
completed: 2026-03-30
---

# Phase 05 Plan 01: Schema Migration Summary

**pgvector-powered semantic search foundation with HNSW indexes, evidence mapping tables with full provenance tracking, eligibility filters, version constants, and Zod validation schemas**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-30T15:29:55Z
- **Completed:** 2026-03-30T15:34:05Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- pgvector extension enabled with HNSW indexes (m=16, ef_construction=64) on evidence_item and requirement embeddings
- evidence_mapping table with comprehensive provenance (source text snapshots, model versions, decision bands)
- evidence_mapping_audit table for full CRUD audit trail with before/after values
- Job eligibility filter columns for pre-semantic filtering (visa, remote, role type, season, graduation window)
- Version constants for matching pipeline reproducibility and debugging
- Zod validation schemas for LLM structured output and evidence mapping CRUD

## Task Commits

Each task was committed atomically:

1. **Task 1: Add embedding columns, eligibility columns, evidence mapping tables, and HNSW indexes to schema** - `6454f52` (feat)
2. **Task 2: Create version constants and Zod validation schemas for matching** - `3cebb27` (feat)

## Files Created/Modified
- `src/lib/db/schema.ts` - Added vector(1536) embedding columns, evidence_mapping and evidence_mapping_audit tables, job eligibility filter columns
- `src/lib/matching/versions.ts` - Version constants for audit trail (embedding model, matching prompt, LLM model, ranking algorithm)
- `src/lib/schemas/matching.ts` - Zod schemas for LLM validation output, evidence mapping CRUD, fit band determination, eligibility filters
- `migrations/0004_robust_king_bedlam.sql` - Main drizzle migration with new columns and tables
- `migrations/0004_pre_enable_pgvector.sql` - pgvector extension enablement
- `migrations/0004_post_create_hnsw_indexes.sql` - HNSW index creation with optimized parameters
- `scripts/run-vector-migration.ts` - Migration runner with environment variable loading and pre/main/post script orchestration
- `src/lib/db/queries/jobs.ts` - Updated to include new eligibility filter columns and lastMatchedAt in queries

## Decisions Made
- Used custom migration runner script instead of standard drizzle-kit migrate to handle pgvector extension and HNSW indexes in correct order
- Migration split into pre/main/post scripts: pgvector must be enabled before vector columns are created, HNSW indexes created after tables exist
- Fixed migration script to explicitly load .env.local (tsx doesn't auto-load environment variables)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added environment variable loading to migration script**
- **Found during:** Task 1 (Migration application)
- **Issue:** Migration script failed with "SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string" because tsx doesn't auto-load .env.local
- **Fix:** Added `import { config } from 'dotenv'; config({ path: '.env.local' });` to migration script and created dedicated Pool instance
- **Files modified:** scripts/run-vector-migration.ts
- **Verification:** Migration executed successfully, all tables and indexes created
- **Committed in:** 6454f52 (Task 1 commit)

**2. [Rule 1 - Bug] Updated job queries to include new schema columns**
- **Found during:** Task 2 (Build verification)
- **Issue:** TypeScript compilation failed because getJobsForUser query wasn't selecting the new eligibility filter columns (visaSponsorship, remotePolicy, roleType, season, graduationWindow, lastMatchedAt)
- **Fix:** Added new columns to both the select() clause and the return mapping in getJobsForUser
- **Files modified:** src/lib/db/queries/jobs.ts
- **Verification:** `npm run build` passed with no TypeScript errors
- **Committed in:** 3cebb27 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes necessary for correctness. First enabled migration to run, second ensured type safety after schema changes. No scope creep.

## Issues Encountered
None - deviations were handled automatically via deviation rules.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Vector infrastructure complete and ready for embedding generation
- Evidence mapping schema ready for LLM validation results
- Eligibility filters ready for pre-semantic job filtering
- Version constants ready for pipeline audit trail
- Zod schemas ready for API validation and structured LLM output

**Ready for:** 05-02 (Embedding Generation), 05-03 (Semantic Search), 05-04 (LLM Validation)

---
*Phase: 05-matching-core*
*Completed: 2026-03-30*

## Self-Check: PASSED

All claims verified:
- ✓ All 6 created files exist
- ✓ Both task commits exist (6454f52, 3cebb27)
- ✓ Correct embedding model version (text-embedding-3-small-1536)
- ✓ Correct ranking version (v1-fit70-fresh30)
