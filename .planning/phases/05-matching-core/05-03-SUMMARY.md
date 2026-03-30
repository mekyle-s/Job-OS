---
phase: 05-matching-core
plan: 03
subsystem: matching-api
tags: [api, client-state, tanstack-query, rest, cache-invalidation]
dependency_graph:
  requires:
    - 05-02-SUMMARY.md (matching engine modules)
    - 04-04-SUMMARY.md (API route patterns)
    - 02-01-SUMMARY.md (verifySession helper)
  provides:
    - REST API endpoints for matching operations
    - TanStack Query client hooks for UI consumption
    - Granular cache invalidation strategy
  affects:
    - Future UI components (Phase 6) will consume these hooks
tech_stack:
  added:
    - "@tanstack/react-query: ^5.95.2"
  patterns:
    - TanStack Query for client state management
    - Query key factory for consistent invalidation
    - Granular cache invalidation (not blanket)
    - Next.js App Router API routes with verifySession
key_files:
  created:
    - src/app/api/matching/run/route.ts
    - src/app/api/matching/queue/route.ts
    - src/app/api/matching/[jobId]/brief/route.ts
    - src/app/api/matching/[jobId]/mappings/route.ts
    - src/app/api/matching/[jobId]/mappings/[mappingId]/route.ts
    - src/app/providers.tsx
    - src/lib/hooks/query-keys.ts
    - src/lib/hooks/use-match-queue.ts
    - src/lib/hooks/use-role-brief.ts
  modified:
    - src/app/layout.tsx (wrapped with Providers)
    - src/lib/db/queries/evidence-mapping.ts (fixed jobId filter bug)
decisions: []
metrics:
  duration_minutes: 4
  completed_date: 2026-03-30
---

# Phase 05 Plan 03: Matching API & Client Hooks Summary

**One-liner:** REST API endpoints for matching operations + TanStack Query hooks with granular cache invalidation

## What Was Built

Created the complete HTTP interface for matching operations and client-side state management layer:

**API Routes (5 endpoints):**
1. **POST /api/matching/run** - Trigger matching pipeline for a job
   - Validates job exists and has requirements
   - Calls runMatchingForJob from pipeline.ts
   - Returns summary: totalRequirements, mapped, gaps, needsReview

2. **GET /api/matching/queue** - Ranked match queue
   - Calls getRankedJobs from ranker.ts
   - Returns jobs with fitBand (High/Medium/Low), fitReasons, composite scores
   - Per CONTEXT.md decision #4: Fit bands with reasons, NOT percentages

3. **GET /api/matching/[jobId]/brief** - Role brief
   - Calls generateRoleBrief from gap-analyzer.ts
   - Returns full requirement-to-evidence map with gaps
   - Includes matchingState (not_matched/in_progress/up_to_date/stale/needs_review)

4. **GET/POST /api/matching/[jobId]/mappings** - List/create mappings
   - GET: Returns all mappings for job with evidence titles
   - POST: Manual mapping creation (createdBySystem=false, creates audit trail)

5. **PATCH/DELETE /api/matching/[jobId]/mappings/[mappingId]** - Edit/remove mappings
   - PATCH: Requires manualOverrideReason when changing decision/confidence
   - Both create audit trail entries with before/after values

All routes use verifySession() per DEV-024 and return proper JSON error responses (401, 400, 404, 500).

**Client State Management:**
- TanStack Query provider wraps entire app in src/app/layout.tsx
- Query key factory (matchKeys) for consistent cache keys
- 5 client hooks:
  - useMatchQueue: Fetches ranked queue, auto-refreshes every 5 minutes
  - useRoleBrief: Fetches role brief for specific job
  - useRunMatching: Mutation that triggers matching, invalidates queue + brief
  - useCreateMapping, useUpdateMapping, useDeleteMapping: Mutations that invalidate brief + queue

**Cache Invalidation Strategy:**
- Granular invalidation using specific keys (matchKeys.brief(jobId), matchKeys.queue())
- NO blanket invalidation (matchKeys.all) per research Pitfall 3
- Manual mapping edits invalidate cache but do NOT trigger re-matching (per CONTEXT.md decision #7)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed getEvidenceMappingsForJob to actually filter by jobId**
- **Found during:** Task 1 - Creating GET /api/matching/[jobId]/mappings route
- **Issue:** Function signature accepted jobId parameter but didn't use it in WHERE clause, only filtered by userId
- **Fix:** Added join with requirement table and filter: `and(eq(requirement.jobId, jobId), eq(evidenceMapping.userId, userId))`
- **Files modified:** src/lib/db/queries/evidence-mapping.ts (added requirement import, updated query)
- **Commit:** a4ed0ba (included in Task 1 commit)

## Verification Results

- [x] All 5 API routes exist in correct Next.js app router structure
- [x] All routes use verifySession() (grep confirms 12 occurrences, 0 requireUser)
- [x] POST /api/matching/run calls runMatchingForJob ✓
- [x] GET /api/matching/queue returns fitBand not percentage ✓
- [x] PATCH endpoint requires manualOverrideReason for decision/confidence changes ✓
- [x] TanStack Query installed (@tanstack/react-query: ^5.95.2)
- [x] Providers component wraps app in layout.tsx ✓
- [x] Query key factory exports matchKeys ✓
- [x] Hooks use granular keys (matchKeys.queue(), matchKeys.brief(jobId)) ✓
- [x] NO use of matchKeys.all for invalidation (grep confirms 0 matches) ✓
- [x] npm run build passes with no TypeScript errors ✓

## Key Technical Decisions

**1. Granular Cache Invalidation Pattern**
- Each mutation invalidates ONLY affected queries (specific brief + queue)
- Avoids over-invalidation that would cause unnecessary refetches
- Per research Pattern 4: Use query key factory for consistency

**2. Manual Override Validation**
- PATCH endpoint enforces manualOverrideReason when changing decision/confidence
- Preserves audit trail for why human overrode LLM decision
- Per CONTEXT.md locked decision #8: Full provenance tracking

**3. Client-side State Management Setup**
- TanStack Query wraps entire app (not just matching components)
- 5-minute stale time balances freshness vs. unnecessary requests
- refetchOnWindowFocus enabled for real-time updates when user returns to tab

## Next Phase Readiness

**Ready for Phase 06 (Matching UI):**
- ✓ All API endpoints ready for consumption
- ✓ Client hooks ready for component integration
- ✓ Cache invalidation strategy proven
- ✓ Audit trail fully wired through API layer

**Blockers:** None

**Recommendations for Phase 06:**
1. Use useMatchQueue in queue/dashboard page
2. Use useRoleBrief in job detail/brief page
3. Wire up useRunMatching to "Run Matching" button
4. Use mutation hooks in mapping edit forms
5. Consider adding React Query DevTools for debugging (optional)

## Commits

| Task | Description | Hash | Files Changed |
|------|-------------|------|---------------|
| 1 | Create matching API routes with audit trail | a4ed0ba | 6 files (+313 lines): 5 API routes + getEvidenceMappingsForJob bug fix |
| 2 | Add TanStack Query provider and client hooks | 758bb0e | 7 files (+230 lines): providers, query-keys, 2 hook files, layout update, package.json |

## Self-Check: PASSED

**Files created verification:**
- [x] src/app/api/matching/run/route.ts exists
- [x] src/app/api/matching/queue/route.ts exists
- [x] src/app/api/matching/[jobId]/brief/route.ts exists
- [x] src/app/api/matching/[jobId]/mappings/route.ts exists
- [x] src/app/api/matching/[jobId]/mappings/[mappingId]/route.ts exists
- [x] src/app/providers.tsx exists
- [x] src/lib/hooks/query-keys.ts exists
- [x] src/lib/hooks/use-match-queue.ts exists
- [x] src/lib/hooks/use-role-brief.ts exists

**Commits verification:**
- [x] Commit a4ed0ba exists in git history
- [x] Commit 758bb0e exists in git history

All claims verified.
