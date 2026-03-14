---
phase: 04-job-data-pipeline
plan: 04
subsystem: job-data-pipeline
tags: [api, rest, criteria, jobs, requirements, crud]
dependency_graph:
  requires:
    - 04-01-job-data-schema
    - 04-03-background-workers-cron
    - 02-01-better-auth-backend
  provides:
    - criteria-management-api
    - job-browsing-api
    - requirement-editing-api
  affects:
    - 04-05-job-data-ui
key_files:
  created:
    - src/app/api/criteria/route.ts
    - src/app/api/jobs/route.ts
    - src/app/api/jobs/[id]/route.ts
    - src/app/api/jobs/[id]/requirements/route.ts
    - src/app/api/jobs/[id]/requirements/[requirementId]/route.ts
  modified: []
decisions:
  - id: DEV-024
    title: Use verifySession for API routes instead of requireUser
    rationale: API routes return JSON responses, not HTML redirects. verifySession returns null instead of redirecting, allowing proper 401 JSON error responses per REST conventions.
    impact: Consistent authentication pattern across all API routes
  - id: DEV-025
    title: Convert null to undefined for optional criteria fields
    rationale: Zod schemas use .nullable().optional() for frontend flexibility, but database query functions expect string | undefined. Use ?? undefined pattern per DEV-020 to convert null to undefined when passing to database layer.
    impact: Type safety maintained between API validation and database operations
metrics:
  duration_minutes: 3
  completed_date: 2026-03-14
  tasks_completed: 2
  commits: 2
tech_stack:
  added: []
  patterns:
    - REST API route handlers with Next.js
    - Zod validation with safeParse for request bodies
    - Session-based authentication with verifySession
    - Audit trail tracking for requirement modifications
    - Null-to-undefined conversion for optional fields
---

# Phase 4 Plan 4: Job Data Management API Summary

**One-liner:** Complete REST API for managing user criteria, browsing jobs by target companies, and editing requirements with full audit trail

## What Was Built

Created 5 REST API route handlers providing the complete HTTP interface for the job data pipeline:

**Criteria Management:**
- `GET /api/criteria` - Retrieve user's active target criteria
- `PUT /api/criteria` - Update criteria with 1-15 company limit validation

**Job Browsing:**
- `GET /api/jobs` - List jobs for user's target companies with pagination
- `GET /api/jobs/[id]` - Get single job detail with all requirements

**Requirement Management:**
- `GET /api/jobs/[id]/requirements` - List all requirements for a job
- `POST /api/jobs/[id]/requirements` - Manually add missing requirement
- `PATCH /api/jobs/[id]/requirements/[requirementId]` - Edit requirement fields
- `DELETE /api/jobs/[id]/requirements/[requirementId]` - Remove incorrect extraction

All routes use `verifySession()` for authentication and return proper JSON error responses (401, 400, 404, 500). Requirement modifications create automatic audit trail entries.

## Task Completion

### Task 1: Create criteria and jobs API routes
**Commit:** c8c085d
**Files:**
- Created `src/app/api/criteria/route.ts` (GET/PUT for criteria management)
- Created `src/app/api/jobs/route.ts` (GET for job listings with pagination)
- Created `src/app/api/jobs/[id]/route.ts` (GET for job detail with requirements)

**Implementation:**
- Criteria API validates 1-15 company limit per phase context decision
- Jobs API returns empty list with helpful message if criteria not set
- Pagination supports limit/offset and active filtering
- All routes authenticated via verifySession (not requireUser)

### Task 2: Create requirement management API routes
**Commit:** 64a0fe4
**Files:**
- Created `src/app/api/jobs/[id]/requirements/route.ts` (GET/POST)
- Created `src/app/api/jobs/[id]/requirements/[requirementId]/route.ts` (PATCH/DELETE)

**Implementation:**
- POST creates manual requirements with audit trail
- PATCH updates priority, category, text, or review status
- DELETE marks requirement as deleted in audit trail
- Original source text preserved (never modified per plan requirement)
- All modifications tracked with userId, before/after values, timestamp

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Type mismatch for nullable criteria fields**
- **Found during:** Task 1 (criteria API implementation)
- **Issue:** Zod validation schema allows `string | null | undefined` for optional fields, but `upsertUserCriteria` query function expects `string | undefined`. TypeScript compiler rejected direct pass-through of validation.data due to null incompatibility.
- **Fix:** Applied DEV-020 pattern - converted null to undefined using `field ?? undefined` when passing validated data to database layer. Added explicit type conversion step before calling upsertUserCriteria.
- **Files modified:** src/app/api/criteria/route.ts
- **Commit:** c8c085d (included in Task 1)
- **Rationale:** This is the same null-to-undefined pattern established in DEV-020 for OpenAI schema compatibility. Frontend may send null for "clear this field" semantics, but database layer uses undefined for optional fields. Conversion layer maintains type safety.

## Verification Results

All verification criteria passed:

1. `npm run build` passed with no TypeScript errors
2. All API routes return JSON responses (not HTML redirects) for error cases
3. Criteria validation enforces 1-15 company limit via Zod schema
4. Requirement edits create audit trail entries via query layer transactions
5. All routes use `verifySession()` for proper JSON-based authentication

## Integration Points

**Upstream dependencies:**
- Uses `verifySession()` from `src/lib/auth/session.ts` (Phase 2)
- Calls query functions from `src/lib/db/queries/` (Plan 04-01)
- Validates with schemas from `src/lib/schemas/requirements.ts` (Plan 04-01)

**Downstream consumers:**
- Plan 04-05 UI will call these endpoints
- Criteria API enables job filtering and polling scope
- Requirement CRUD supports user review workflow

## Technical Decisions

**DEV-024: Use verifySession for API routes**
API routes must return JSON error responses, not HTML redirects. Using `verifySession()` instead of `requireUser()` allows routes to detect unauthenticated state and return proper 401 JSON responses. Follows pattern from `src/app/api/evidence/upload/route.ts`.

**DEV-025: Convert null to undefined for criteria fields**
Zod validation schemas use `.nullable().optional()` to allow frontend flexibility (null = "clear field", undefined = "omit field"). Database query functions expect `string | undefined` for optional parameters. Use `field ?? undefined` pattern to convert null to undefined when passing to database layer, maintaining type safety at API/database boundary.

## Next Steps

Plan 04-05 will build UI components consuming these APIs:
- Criteria setup form (calls PUT /api/criteria)
- Job listings page (calls GET /api/jobs)
- Job detail page with requirement editor (calls requirement CRUD endpoints)

## Self-Check: PASSED

**Files created:**
- FOUND: src/app/api/criteria/route.ts
- FOUND: src/app/api/jobs/route.ts
- FOUND: src/app/api/jobs/[id]/route.ts
- FOUND: src/app/api/jobs/[id]/requirements/route.ts
- FOUND: src/app/api/jobs/[id]/requirements/[requirementId]/route.ts

**Commits exist:**
- FOUND: c8c085d (Task 1)
- FOUND: 64a0fe4 (Task 2)

**Build verification:**
- PASSED: npm run build completed with no errors
- VERIFIED: All 5 API routes appear in build output
