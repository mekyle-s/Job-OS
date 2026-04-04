---
phase: 06-tracking-notifications
plan: 03
subsystem: ui
tags: [react, tanstack-query, nuqs, url-state, optimistic-updates, print-css]

# Dependency graph
requires:
  - phase: 06-02
    provides: Role status API routes and email notification pipeline
  - phase: 05-03
    provides: Match queue and role brief UI components
provides:
  - Queue page with status filter bar synced to URL search params
  - Role status control buttons with optimistic updates
  - Print-optimized export page for proof summaries
  - Client-side filtering by role status
affects: [06-04-testing, future-ui-patterns]

# Tech tracking
tech-stack:
  added: [nuqs]
  patterns: [URL state management, optimistic mutations with rollback, print-optimized layouts]

key-files:
  created:
    - src/lib/hooks/use-role-status.ts
    - src/app/dashboard/queue/filters.tsx
    - src/app/dashboard/roles/[jobId]/export/page.tsx
  modified:
    - src/lib/hooks/query-keys.ts
    - src/app/dashboard/queue/role-card.tsx
    - src/app/dashboard/queue/page.tsx
    - src/app/dashboard/roles/[jobId]/brief/page.tsx

key-decisions:
  - 'Use nuqs for URL state management in queue filters (shareable links, back-button friendly)'
  - 'Client-side filtering approach for V1 - each card fetches its own status, acceptable with <50 cards'
  - 'Browser-native print via window.print() instead of server-side PDF generation'
  - 'Optimistic updates with rollback on error for instant UI feedback on status changes'

patterns-established:
  - 'URL state synchronization with useQueryState for filters'
  - 'Optimistic mutation pattern with onMutate snapshot and onError rollback'
  - 'Print-optimized layouts with @media print CSS and .no-print class'
  - 'Event propagation control on nested interactive elements (stopPropagation on buttons in Link wrapper)'

# Metrics
duration: 5min
completed: 2026-04-04
---

# Phase 6 Plan 3: Queue Status Controls & Export Summary

**Queue filtering by role status with URL persistence, optimistic status updates, and browser-native PDF export for proof summaries**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-04T06:25:34Z
- **Completed:** 2026-04-04T06:30:35Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Users can mark roles with status (Ignore/Save/Apply/Applied) directly from queue cards
- Queue filterable by status via URL params (?status=save) - shareable and back-button friendly
- Optimistic UI updates provide instant feedback before server confirms
- Print-optimized export page for proof summaries with requirement-to-evidence mappings
- Export to PDF via browser's native print dialog (no server-side PDF generation needed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add status controls to queue page with filtering and optimistic updates** - `f03e965` (feat)
2. **Task 2: Create print-optimized export page and add export button to role brief** - `47f099f` (feat)

## Files Created/Modified

**Created:**

- `src/lib/hooks/use-role-status.ts` - TanStack Query hooks for role status with optimistic updates
- `src/app/dashboard/queue/filters.tsx` - Status filter bar with nuqs URL state synchronization
- `src/app/dashboard/roles/[jobId]/export/page.tsx` - Print-optimized proof summary export page

**Modified:**

- `src/lib/hooks/query-keys.ts` - Added roleStatusKeys for cache management
- `src/app/dashboard/queue/role-card.tsx` - Added status buttons with click propagation control
- `src/app/dashboard/queue/page.tsx` - Integrated filters with NuqsAdapter and Suspense boundary
- `src/app/dashboard/roles/[jobId]/brief/page.tsx` - Added "Export PDF" button in header
- `package.json` - Added nuqs dependency

## Decisions Made

**URL state management:** Chose nuqs over custom URL state hooks for mature URL state synchronization with Next.js App Router. Provides parseAsStringLiteral type safety and automatic search param handling.

**Client-side filtering approach:** For V1, each RoleCard fetches its own status and filtering happens client-side. This is acceptable with <50 cards in queue. Future optimization could join roleStatus in the queue API to reduce client-side requests.

**Browser-native print:** Using window.print() with @media print CSS instead of server-side PDF generation. Simpler, works across browsers, users familiar with print dialog, no additional dependencies.

**Optimistic updates:** Status changes use optimistic updates with rollback on error per research Pitfall 5. Provides instant UI feedback while preventing race conditions with disabled buttons during mutation.

## Deviations from Plan

**1. [Rule 3 - Blocking] Added Suspense boundary for nuqs**

- **Found during:** Task 1 (Queue page integration)
- **Issue:** Next.js build failed with "useSearchParams() should be wrapped in a suspense boundary" error. nuqs uses useSearchParams internally and requires Suspense in App Router.
- **Fix:** Wrapped MatchQueueContent in <Suspense> with loading fallback
- **Files modified:** src/app/dashboard/queue/page.tsx
- **Verification:** npm run build passes
- **Committed in:** f03e965 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fix required for Next.js App Router compatibility. No scope creep.

## Issues Encountered

None - plan executed smoothly with one standard Next.js Suspense requirement.

## User Setup Required

None - no external service configuration required. Role status API routes already operational from 06-02.

## Next Phase Readiness

Queue status tracking and export workflow complete. Ready for:

- End-to-end testing of tracking flow (06-04)
- Email notification testing with real job updates
- UAT for Phase 6 complete workflow

**Blockers:** None

**Notes:**

- Filter state persists in URL - users can bookmark or share filtered queue views
- Status buttons prevent click propagation to avoid navigation when changing status
- Export page fetches same data as brief page via useRoleBrief hook
- Print layout uses A4 width (210mm) and serif fonts for professional PDF output

---

_Phase: 06-tracking-notifications_
_Completed: 2026-04-04_

## Self-Check: PASSED

**Files created:**

- FOUND: src/lib/hooks/use-role-status.ts
- FOUND: src/app/dashboard/queue/filters.tsx
- FOUND: src/app/dashboard/roles/[jobId]/export/page.tsx

**Commits verified:**

- FOUND: f03e965 (Task 1)
- FOUND: 47f099f (Task 2)
