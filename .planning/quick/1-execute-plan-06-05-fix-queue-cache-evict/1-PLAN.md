---
phase: 06-tracking-notifications
plan: 05
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/hooks/use-match-queue.ts
  - src/lib/hooks/use-role-status.ts
  - src/app/providers.tsx
autonomous: true
gap_closure: true

must_haves:
  truths:
    - 'Queue data remains visible when user navigates away and returns within 30 minutes'
    - 'Queue data automatically refreshes in background via 10-minute polling interval'
    - 'Role status caches persist alongside queue data for 30 minutes'
  artifacts:
    - path: 'src/lib/hooks/use-match-queue.ts'
      provides: 'Queue query with gcTime (30 min) and refetchInterval (10 min)'
      contains: 'gcTime'
    - path: 'src/lib/hooks/use-role-status.ts'
      provides: 'Role status query with gcTime (30 min)'
      contains: 'gcTime'
    - path: 'src/app/providers.tsx'
      provides: 'Global QueryClient with default gcTime (30 min)'
      contains: 'gcTime'
  key_links:
    - from: 'src/lib/hooks/use-match-queue.ts'
      to: 'TanStack Query cache'
      via: 'gcTime prevents garbage collection for 30 minutes after unmount'
      pattern: 'gcTime.*30.*60.*1000'
    - from: 'src/app/providers.tsx'
      to: 'All queries globally'
      via: 'defaultOptions.queries.gcTime safety net'
      pattern: 'gcTime'
---

<objective>
Fix queue data disappearing after navigating away from Fresh Match Queue page by extending TanStack Query gcTime from default 5 minutes to 30 minutes.

Purpose: UAT Test 4 revealed that queue roles vanish after a few minutes of navigation because TanStack Query's default gcTime (5 min) garbage collects the cache when the queue component unmounts. This is a configuration-only fix -- no logic changes.

Output: Three files updated with gcTime configuration. Queue cache persists 30 min, background polling at 10 min intervals, role status caches also persist 30 min.
</objective>

<execution_context>
@C:\Users\Mekyle\.claude/get-shit-done/workflows/execute-plan.md
@C:\Users\Mekyle\.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/06-tracking-notifications/06-05-PLAN.md
@src/lib/hooks/use-match-queue.ts
@src/lib/hooks/use-role-status.ts
@src/app/providers.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add gcTime and refetchInterval to TanStack Query hooks and global config</name>
  <files>
    src/lib/hooks/use-match-queue.ts
    src/lib/hooks/use-role-status.ts
    src/app/providers.tsx
  </files>
  <action>
Configuration-only changes to three files. No logic modifications.

1. **src/lib/hooks/use-match-queue.ts** -- In the useQuery options object (after the existing `staleTime` line):
   - Add `gcTime: 1000 * 60 * 30,` with comment `// 30 minutes - prevents cache GC during navigation`
   - Add `refetchInterval: 1000 * 60 * 10,` with comment `// 10 minutes - background polling keeps data fresh`
   - Keep existing `staleTime: 1000 * 60 * 5` unchanged

2. **src/lib/hooks/use-role-status.ts** -- In the useRoleStatus useQuery options object (after existing `staleTime` line):
   - Add `gcTime: 1000 * 60 * 30,` with comment `// 30 minutes - match queue hook cache lifetime`
   - Keep existing `staleTime: 1000 * 60 * 5` unchanged
   - Do NOT modify useUpdateRoleStatus mutation hook

3. **src/app/providers.tsx** -- In the QueryClient defaultOptions.queries object (after existing `staleTime` line):
   - Add `gcTime: 1000 * 60 * 30,` with comment `// 30 minutes - global default prevents premature cache eviction`
   - Keep existing `staleTime` and `refetchOnWindowFocus` unchanged
     </action>
     <verify>
     Run `npx next build` to confirm no TypeScript errors. Then grep all three files for gcTime to confirm presence: `grep -n "gcTime" src/lib/hooks/use-match-queue.ts src/lib/hooks/use-role-status.ts src/app/providers.tsx`. Also grep use-match-queue.ts for refetchInterval: `grep -n "refetchInterval" src/lib/hooks/use-match-queue.ts`.
     </verify>
     <done>
     All three files contain gcTime: 1000 _ 60 _ 30 configuration. use-match-queue.ts additionally has refetchInterval: 1000 _ 60 _ 10. Existing staleTime values (5 min) remain unchanged. useUpdateRoleStatus is untouched. Build passes cleanly.
     </done>
     </task>

</tasks>

<verification>
- `npx next build` succeeds without errors
- `gcTime` appears in all three target files with value `1000 * 60 * 30`
- `refetchInterval` appears in use-match-queue.ts with value `1000 * 60 * 10`
- Existing `staleTime` values (5 min) remain unchanged in all files
- `useUpdateRoleStatus` mutation hook is unmodified
- No other files modified beyond the three listed
</verification>

<success_criteria>
Queue cache persists for 30 minutes after component unmount (vs previous 5-minute default). Background polling at 10-minute intervals keeps queue data fresh automatically. Role status caches also persist for 30 minutes. Build passes with no errors.
</success_criteria>

<output>
After completion, create `.planning/phases/06-tracking-notifications/06-05-SUMMARY.md`
</output>
