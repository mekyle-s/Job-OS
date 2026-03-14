---
phase: 04-job-data-pipeline
verified: 2026-03-14T17:30:00Z
status: human_needed
score: 4/4 truths verified (automated checks passed)
gaps: []
human_verification:
  - test: "End-to-end flow verification"
    expected: "Complete job data pipeline from criteria setup to requirement editing"
    why_human: "Plan 04-05 marked as autonomous:false with blocking checkpoint gate"
  - test: "Greenhouse API integration"
    expected: "Job polling successfully fetches real jobs from Greenhouse boards"
    why_human: "Requires live API credentials and network access to external service"
  - test: "LLM requirement extraction quality"
    expected: "Extracted requirements are accurate, conservative, and properly categorized"
    why_human: "LLM output quality assessment requires domain expertise"
  - test: "Background worker execution"
    expected: "Cron triggers polling, workers process jobs asynchronously, parse status updates correctly"
    why_human: "Requires observing async job queue behavior over time"
---

# Phase 4: Job Data Pipeline Verification Report

**Phase Goal:** System monitors job sources and extracts structured requirements
**Verified:** 2026-03-14T17:30:00Z
**Status:** human_needed (all automated checks passed, awaiting checkpoint approval)
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can define target criteria (function, location, visa, companies) | ✓ VERIFIED | Criteria API (GET/PUT) + UI page with form validation (1-15 companies) |
| 2 | System fetches roles from supported sources matching user criteria | ✓ VERIFIED | Greenhouse adapter + job poller worker + cron endpoint configured |
| 3 | User can view job listings with title, company, location, freshness | ✓ VERIFIED | Jobs listing page with freshness badges (New/Updated) + parse status |
| 4 | Job postings display extracted requirements with simple review states | ✓ VERIFIED | Job detail page with requirements grouped by category + review badges |

**Score:** 4/4 truths verified

### Required Artifacts

All 22 artifacts verified:

**Database Layer (Plan 04-01):**
- ✓ `src/lib/db/schema.ts` - 5 tables: user_criteria, raw_job_source, job, requirement, requirement_audit
- ✓ `src/lib/schemas/jobs.ts` - Job validation schemas (80 lines)
- ✓ `src/lib/schemas/requirements.ts` - Requirement schemas for LLM + CRUD (91 lines)
- ✓ `src/lib/db/queries/user-criteria.ts` - User criteria CRUD (96 lines)
- ✓ `src/lib/db/queries/jobs.ts` - Job CRUD with upsert pattern (291 lines)
- ✓ `src/lib/db/queries/requirements.ts` - Requirement CRUD with audit trail (232 lines)

**Adapters & Workers (Plans 04-02, 04-03):**
- ✓ `src/lib/jobs/sources/adapter.ts` - JobSource interface (126 lines)
- ✓ `src/lib/jobs/sources/greenhouse.ts` - 15 company board tokens (224 lines)
- ✓ `src/lib/jobs/sources/index.ts` - Adapter registry (18 lines)
- ✓ `src/lib/jobs/parsers/requirement-extractor.ts` - Conservative LLM extractor (98 lines)
- ✓ `src/lib/jobs/workers/job-poller.ts` - Job polling worker (154 lines)
- ✓ `src/lib/jobs/workers/requirement-parser.ts` - Requirement extraction worker (52 lines)
- ✓ `src/app/api/cron/poll-jobs/route.ts` - Vercel Cron endpoint (55 lines)
- ✓ `src/app/api/jobs/poll/route.ts` - Manual poll endpoint (46 lines)

**API Routes (Plan 04-04):**
- ✓ `src/app/api/criteria/route.ts` - Criteria management GET/PUT (86 lines)
- ✓ `src/app/api/jobs/route.ts` - Job listings with pagination (60 lines)
- ✓ `src/app/api/jobs/[id]/route.ts` - Job detail (37 lines)
- ✓ `src/app/api/jobs/[id]/requirements/route.ts` - Requirement list/create (80 lines)
- ✓ `src/app/api/jobs/[id]/requirements/[requirementId]/route.ts` - Edit/delete (93 lines)

**UI Pages (Plan 04-05):**
- ✓ `src/app/dashboard/criteria/page.tsx` - Criteria setup UI (315 lines, min 80)
- ✓ `src/app/dashboard/jobs/page.tsx` - Job listings UI (239 lines, min 60)
- ✓ `src/app/dashboard/jobs/[id]/page.tsx` - Job detail UI (603 lines, min 100)

**Configuration:**
- ✓ `vercel.json` - Hourly cron schedule (0 * * * *)

### Key Link Verification

All critical connections verified:

| From | To | Via | Status |
|------|----|----|--------|
| greenhouse.ts | adapter.ts | implements JobSource | ✓ WIRED |
| requirement-extractor.ts | requirements.ts schema | zodResponseFormat | ✓ WIRED |
| cron/poll-jobs/route.ts | job-poller.ts worker | pg-boss queue | ✓ WIRED |
| job-poller.ts | requirement-parser.ts | pg-boss queue | ✓ WIRED |
| job-poller.ts | greenhouse.ts adapter | adapter.fetchJobs() | ✓ WIRED |
| api/criteria/route.ts | queries/user-criteria.ts | function calls | ✓ WIRED |
| api/jobs/route.ts | queries/jobs.ts | getJobsForUser | ✓ WIRED |
| api/jobs/[id]/requirements/[requirementId] | queries/requirements.ts | update/delete with audit | ✓ WIRED |
| dashboard/criteria/page.tsx | /api/criteria | fetch GET/PUT | ✓ WIRED |
| dashboard/jobs/page.tsx | /api/jobs | fetch with pagination | ✓ WIRED |
| dashboard/jobs/[id]/page.tsx | /api/jobs/[id]/requirements | CRUD operations | ✓ WIRED |

### Requirements Coverage

Phase 4 maps to: SUPP-04, SUPP-05, SUPP-06, CORE-05

| Requirement | Status | Evidence |
|-------------|--------|----------|
| SUPP-04: User defines target companies | ✓ SATISFIED | user_criteria table, criteria API, UI |
| SUPP-05: System fetches jobs from boards | ✓ SATISFIED | Greenhouse adapter, poller, cron |
| SUPP-06: User views job listings | ✓ SATISFIED | jobs API, listing page |
| CORE-05: System extracts requirements | ✓ SATISFIED | LLM extractor with conservative prompt |

### Anti-Patterns Found

**None detected.** No TODO/FIXME/stub patterns found in phase 4 code.

### Build Verification

```bash
npm run build
```
**Result:** ✓ PASSED - All TypeScript compilation successful, all routes present in build output.

### Human Verification Required

#### 1. Complete End-to-End User Flow

**Test:**
1. Start dev server: `npm run dev`
2. Sign in and navigate to `/dashboard`
3. Navigate to `/dashboard/criteria`
4. Enter criteria: add 3-5 companies (e.g., "stripe", "airbnb", "cloudflare")
5. Verify transparency notice: "We currently monitor Greenhouse job boards"
6. Save criteria and verify success message
7. Navigate to `/dashboard/jobs`
8. Trigger manual poll: POST to `/api/jobs/poll` with auth
9. After poll: refresh jobs page, verify job cards display
10. Click a job to view detail page
11. Verify requirements grouped by category with review status badges
12. Edit a requirement's priority and text - verify saves
13. Delete a requirement - verify confirmation, then deletes
14. Add a manual requirement - verify appears in list
15. Verify source text always visible and read-only

**Expected:** All flows work with proper loading states and error handling.

**Why human:** Plan 04-05 marked as autonomous:false with blocking checkpoint gate. Requires human approval of complete UX.

#### 2. Greenhouse API Integration

**Test:**
1. Set OPENAI_API_KEY and CRON_SECRET in .env.local
2. Add companies that use Greenhouse from hardcoded list
3. Trigger manual poll: POST /api/jobs/poll
4. Verify jobs fetched, normalized, and stored correctly

**Expected:** Jobs successfully fetched from Greenhouse API.

**Why human:** Requires live API access to external service.

#### 3. LLM Requirement Extraction Quality

**Test:**
1. Review extracted requirements for a parsed job
2. Check for accuracy, correct priorities, proper categorization
3. Verify conservative extraction (no inferred requirements)

**Expected:** LLM extracts only explicitly stated requirements.

**Why human:** Quality assessment requires domain expertise.

#### 4. Background Worker Execution

**Test:**
1. Trigger cron endpoint with CRON_SECRET
2. Observe pg-boss job queue processing
3. Verify parse status updates: pending → processing → completed
4. Check error handling for failed jobs

**Expected:** Workers process asynchronously with correct status updates.

**Why human:** Requires observing async behavior over time.

#### 5. Audit Trail for Requirement Edits

**Test:**
1. Edit a requirement, check database for audit entry
2. Verify beforeValue and afterValue in requirement_audit table

**Expected:** All edits create atomic audit trail entries.

**Why human:** Requires direct database inspection.

### Gaps Summary

**No gaps found in automated verification.**

All 4 observable truths verified. All 22 artifacts exist and meet requirements. All key links wired. Build passes. No anti-patterns.

**Note:** Plan 04-05 requires human checkpoint approval per plan specification (autonomous:false, gate:blocking).

**Recommendation:** Execute the 5 human verification tests above to complete phase 4 validation.

---

_Verified: 2026-03-14T17:30:00Z_
_Verifier: Claude (gsd-verifier)_
