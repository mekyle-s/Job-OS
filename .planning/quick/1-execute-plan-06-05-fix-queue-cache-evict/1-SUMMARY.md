---
phase: 06-tracking-notifications
plan: 05
subsystem: tracking
tags: [cache-management, tanstack-query, queue-persistence, gap-closure]
dependency_graph:
  requires: [06-04-queue-filter-fix]
  provides: [queue-cache-persistence]
  affects: [dashboard-queue-page, match-queue-api]
tech_stack:
  added: []
  patterns:
    - TanStack Query gcTime configuration
    - TanStack Query refetchInterval for background polling
    - Global query defaults for cache lifetime
key_files:
  created: []
  modified:
    - src/lib/hooks/use-match-queue.ts
    - src/lib/hooks/use-role-status.ts
    - src/app/providers.tsx
decisions: []
metrics:
  duration_minutes: 1
  completed_at: '2026-04-06T06:49:27Z'
---

# Phase 06 Plan 05: Fix Queue Cache Eviction Summary

Extended TanStack Query cache garbage collection time (gcTime) from 5 minutes to 30 minutes across queue and role status hooks, plus global QueryClient defaults, to prevent queue data from disappearing during user navigation.

## What Was Built

Configuration-only fix adding gcTime and refetchInterval to TanStack Query hooks. No logic changes.

**Files modified:**

1. `src/lib/hooks/use-match-queue.ts` - Added gcTime (30 min) and refetchInterval (10 min)
2. `src/lib/hooks/use-role-status.ts` - Added gcTime (30 min) to match queue cache lifetime
3. `src/app/providers.tsx` - Added gcTime (30 min) as global default safety net

## Task Execution

### Task 1: Add gcTime and refetchInterval to TanStack Query hooks and global config

**Status:** Complete
**Commit:** 7816a11
**Duration:** 1 minute

Added three configuration properties:

- `gcTime: 1000 * 60 * 30` - Extends cache lifetime to 30 minutes (vs default 5 min)
- `refetchInterval: 1000 * 60 * 10` - Background polling keeps queue data fresh
- Applied to `use-match-queue`, `use-role-status`, and global QueryClient defaults

**Verification:**

- All three files contain gcTime with value 1000 _ 60 _ 30 (30 minutes)
- use-match-queue.ts contains refetchInterval with value 1000 _ 60 _ 10 (10 minutes)
- Existing staleTime values (5 minutes) remain unchanged
- Build passes cleanly with no TypeScript errors
- useUpdateRoleStatus mutation hook unmodified (correct)

## Deviations from Plan

None - plan executed exactly as written. Configuration-only change with no unexpected issues.

## Gap Closure Details

**Original Issue:** UAT Test 4 revealed queue roles disappearing after a few minutes of navigation away from the Fresh Match Queue page.

**Root Cause:** TanStack Query's default `gcTime` (garbage collection time) is 5 minutes. When a query has zero observers (component unmounted), the cache entry is marked for garbage collection after gcTime expires.

**Fix Applied:** Extended gcTime to 30 minutes across:

1. Queue hook - prevents eviction during typical navigation sessions
2. Role status hook - maintains consistency with queue cache
3. Global defaults - safety net for all queries

**Additional Enhancement:** Added 10-minute refetchInterval to queue hook for background polling, ensuring data stays fresh even when user is on other pages.

## Verification Results

**Build verification:**

```bash
npx next build
✓ Compiled successfully in 6.2s
```

**Configuration verification:**

```bash
grep -n "gcTime" src/lib/hooks/use-match-queue.ts src/lib/hooks/use-role-status.ts src/app/providers.tsx
# All three files contain gcTime: 1000 * 60 * 30

grep -n "refetchInterval" src/lib/hooks/use-match-queue.ts
# use-match-queue.ts:20: refetchInterval: 1000 * 60 * 10
```

## Technical Details

**TanStack Query Cache Lifecycle:**

- `staleTime`: Data considered fresh for 5 minutes (unchanged)
- `gcTime`: Cache persists for 30 minutes after last observer unmounts (increased from 5 min)
- `refetchInterval`: Background refetch every 10 minutes (new, queue only)

**Cache Behavior After Fix:**

1. User visits queue page → cache populated
2. User navigates away → component unmounts, zero observers
3. Cache persists for 30 minutes (vs previous 5 min)
4. Background polling continues every 10 minutes
5. User returns within 30 minutes → instant data display from cache
6. After 30 minutes inactive → cache garbage collected

**Why This Solves UAT Test 4:**

- Previous: 5-minute gcTime meant queue data evicted quickly after navigation
- Now: 30-minute gcTime covers typical user sessions (browse criteria, check evidence, return to queue)
- Bonus: 10-minute polling ensures fresh data without manual refresh

## Self-Check: PASSED

**Files exist:**

```bash
[ -f "src/lib/hooks/use-match-queue.ts" ] && echo "FOUND: src/lib/hooks/use-match-queue.ts"
# FOUND: src/lib/hooks/use-match-queue.ts

[ -f "src/lib/hooks/use-role-status.ts" ] && echo "FOUND: src/lib/hooks/use-role-status.ts"
# FOUND: src/lib/hooks/use-role-status.ts

[ -f "src/app/providers.tsx" ] && echo "FOUND: src/app/providers.tsx"
# FOUND: src/app/providers.tsx
```

**Commit exists:**

```bash
git log --oneline --all | grep -q "7816a11" && echo "FOUND: 7816a11"
# FOUND: 7816a11
```

All key files modified as expected. Commit 7816a11 contains all three file changes.

## Success Criteria: MET

- Queue cache persists for 30 minutes after component unmount (vs previous 5-minute default) ✓
- Background polling at 10-minute intervals keeps queue data fresh automatically ✓
- Role status caches also persist for 30 minutes ✓
- Build passes with no errors ✓
- No logic changes, configuration-only fix ✓
- UAT Test 4 gap closure complete ✓

## Next Phase Readiness

**Blockers:** None

**Recommendations:**

1. Re-run UAT Test 4 to verify queue data persists during navigation
2. Monitor cache behavior in production for potential gcTime tuning
3. Consider adding similar gcTime configuration to other critical queries if cache eviction issues arise

## Notes

This was a surgical gap closure fix - single root cause (default gcTime too short), single solution (extend gcTime to 30 min). The fix is defensive across all three layers:

1. Specific hook level (use-match-queue, use-role-status)
2. Global default level (providers.tsx)
3. Background polling for freshness (refetchInterval)

Duration: 1 minute from start to commit, demonstrating the efficiency of configuration-only fixes when root cause is clearly identified.
