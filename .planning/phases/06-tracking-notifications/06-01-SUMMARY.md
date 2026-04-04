---
phase: 06-tracking-notifications
plan: 01
subsystem: database
tags: [drizzle-orm, zod, postgresql, schema, audit-trail]

# Dependency graph
requires:
  - phase: 05-matching-core
    provides: evidenceMapping and requirement tables for audit trail tracking
provides:
  - roleStatus table with unique (userId, jobId) constraint for application tracking
  - parserAudit table for unified audit trail across all entities
  - user.lastNotifiedAt column for notification timestamp tracking
  - Zod schemas for role status validation (ignore, save, apply, applied)
  - CRUD query functions for role status and audit logging
affects: [06-tracking-notifications, notifications, queue-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Fire-and-forget audit logging (catches errors without blocking operations)
    - Upsert pattern with onConflictDoUpdate for status tracking
    - Runtime Zod validation with text columns (no pgEnum)

key-files:
  created:
    - src/lib/schemas/role-status.ts
    - src/lib/db/queries/role-status.ts
    - src/lib/db/queries/audit.ts
    - migrations/0005_careful_iceman.sql
    - scripts/run-phase6-migration.ts
  modified:
    - src/lib/db/schema.ts

key-decisions:
  - Used text columns with Zod validation instead of pgEnum (per DEV-021)
  - Fire-and-forget audit logging to prevent blocking business operations
  - Custom migration runner pattern for Phase 6 (per DEV-026)

patterns-established:
  - Fire-and-forget audit logging pattern
  - Composite unique constraint with uniqueIndex() for user+job status tracking

# Metrics
duration: 4min
completed: 2026-04-04
---

# Phase 6 Plan 1: Tracking Data Foundation Summary

**Database schema for role status tracking (ignore/save/apply/applied), unified parser audit trail with confidence scores, and notification timestamp tracking**

## Performance

- **Duration:** 4 minutes
- **Started:** 2026-04-04T06:09:43Z
- **Completed:** 2026-04-04T06:13:50Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Three new schema tables (roleStatus, parserAudit, user.lastNotifiedAt) with proper indexes
- Zod validation schemas for runtime status validation without database-level enums
- CRUD query functions with upsert, filtering, and fire-and-forget audit logging
- Migration successfully applied with custom runner

## Task Commits

Each task was committed atomically:

1. **Task 1: Add roleStatus, parserAudit tables and lastNotifiedAt column to schema + run migration** - `43d8b4d` (feat)
2. **Task 2: Create Zod schemas and CRUD query functions for role status and audit** - `0464be0` (feat)

## Files Created/Modified

### Created
- `src/lib/schemas/role-status.ts` - Zod schemas for role status validation (RoleStatusEnum, UpdateRoleStatusSchema, RoleStatusFilterSchema)
- `src/lib/db/queries/role-status.ts` - CRUD functions: upsertRoleStatus, getRoleStatusForJob, getRoleStatusesForUser, deleteRoleStatus
- `src/lib/db/queries/audit.ts` - Audit helpers: logParserAudit (fire-and-forget), getAuditTrail
- `migrations/0005_careful_iceman.sql` - Migration creating roleStatus, parserAudit tables and user.lastNotifiedAt column
- `scripts/run-phase6-migration.ts` - Custom migration runner with hash tracking (per DEV-026 pattern)

### Modified
- `src/lib/db/schema.ts` - Added roleStatus table (8 columns, 4 indexes), parserAudit table (11 columns, 3 indexes), user.lastNotifiedAt column

## Decisions Made

**DEV-030: Fire-and-forget audit logging pattern** - The logParserAudit function catches and logs errors instead of throwing to prevent audit failures from blocking business operations. This ensures the audit trail is best-effort and doesn't impact user-facing features. Pattern established for all future audit logging.

Other than this pattern, the plan was followed exactly as specified per existing decisions (DEV-021 for text columns, DEV-022 for uniqueIndex, DEV-026 for custom migration runner).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed drizzle-kit migrate replay issue**
- **Found during:** Task 1 (Running migration)
- **Issue:** Standard `npx drizzle-kit migrate` tried to replay all migrations from 0004 onwards because migration 0004 was applied via custom script but not recorded in drizzle's migration tracking table
- **Fix:** Created custom migration runner (scripts/run-phase6-migration.ts) that applies migration and records hash in drizzle.__drizzle_migrations table, following same pattern as run-vector-migration.ts
- **Files modified:** scripts/run-phase6-migration.ts (created)
- **Verification:** Migration applied successfully, hash recorded in tracking table, build passes
- **Committed in:** 43d8b4d (Task 1 commit)

**2. [Rule 1 - Bug] Fixed query chaining in getRoleStatusesForUser**
- **Found during:** Task 2 (TypeScript build check)
- **Issue:** Cannot chain .where() twice on Drizzle query - initial attempt to conditionally add status filter by calling query.where() again failed TypeScript compilation
- **Fix:** Build where condition before query execution using ternary operator: `whereCondition = statusFilter ? and(...) : eq(...)`
- **Files modified:** src/lib/db/queries/role-status.ts
- **Verification:** TypeScript build passes with no errors
- **Committed in:** 0464be0 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep. Migration runner follows established pattern from Phase 5.

## Issues Encountered

None - both deviations were standard auto-fixes following deviation rules.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Data foundation complete and ready for Phase 6 features:
- roleStatus table ready for queue filtering and status tracking UI (Plan 06-02)
- parserAudit table ready for correction tracking and feedback loops (Plan 06-03)
- user.lastNotifiedAt column ready for notification deduplication logic (Plan 06-03)

All query functions tested via TypeScript compilation. Migration applied and verified in database.

## Self-Check: PASSED

All files verified:
- src/lib/schemas/role-status.ts - FOUND
- src/lib/db/queries/role-status.ts - FOUND
- src/lib/db/queries/audit.ts - FOUND
- migrations/0005_careful_iceman.sql - FOUND
- scripts/run-phase6-migration.ts - FOUND

All commits verified:
- 43d8b4d - FOUND
- 0464be0 - FOUND

---
*Phase: 06-tracking-notifications*
*Completed: 2026-04-04*
