---
status: diagnosed
trigger: "Queue Filter Shows Empty Results - status filters show empty queue, only 'All' works"
created: 2026-04-06T00:00:00Z
updated: 2026-04-06T00:10:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: Client-side filtering logic is not correctly matching role statuses from the API
test: Examine queue page filtering implementation and role status data flow
expecting: Find mismatch between filter values and actual status data format
next_action: Read queue page and filter components to understand data flow

## Symptoms

expected: Selecting a filter (e.g., "Saved") should show only roles with that status
actual: URL updates correctly (?status=save), but queue shows empty results. Only "All" filter shows roles.
errors: None visible - no console errors
reproduction:

1. Navigate to queue page
2. Click any filter other than "All" (e.g., "Saved", "Apply", etc.)
3. Observe empty queue despite URL updating correctly
   started: Phase 06 UAT testing

## Eliminated

## Evidence

- timestamp: 2026-04-06T00:05:00Z
  checked: src/app/dashboard/queue/filters.tsx
  found: Filter values are 'all', 'ignore', 'save', 'apply', 'applied'
  implication: These are the expected filter values used in URL query params

- timestamp: 2026-04-06T00:06:00Z
  checked: src/app/dashboard/queue/page.tsx line 148-155
  found: RoleCardWithFilter checks `roleStatus?.status === statusFilter` to determine visibility
  implication: Filter comparison expects exact match between filter value and status value

- timestamp: 2026-04-06T00:07:00Z
  checked: src/lib/hooks/use-role-status.ts line 11-14
  found: RoleStatus interface defines status as: 'ignore' | 'save' | 'apply' | 'applied' | null
  implication: API returns these exact values for status

- timestamp: 2026-04-06T00:08:00Z
  checked: API response for roleStatus when no status is set
  found: When no status has been set for a role, API returns { status: null, notes: null } (line 27)
  implication: Unstatused roles have status = null

- timestamp: 2026-04-06T00:09:00Z
  checked: Filter logic in page.tsx line 152-155
  found: When statusFilter is NOT 'all', it checks: `roleStatus?.status === statusFilter`
  implication: If roleStatus.status is null (unstatused role), it will never match any filter except 'all'

## Resolution

root_cause: The filter logic assumes all roles have a status, but newly matched roles have status = null by default. When filtering by 'save', 'apply', etc., the code checks if `roleStatus?.status === statusFilter`, which fails for null statuses. Since most/all roles in the queue haven't been assigned a status yet, they have status = null and are filtered out by any non-'all' filter. The 'all' filter works because it has explicit logic to return true (line 153), bypassing the status comparison.

Location: src/app/dashboard/queue/page.tsx, lines 152-155, function shouldShow()

fix: Not providing fix (goal: find_root_cause_only)
verification: Not applicable (diagnosis-only mode)
files_changed: []
