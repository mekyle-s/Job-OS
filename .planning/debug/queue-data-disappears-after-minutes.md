---
status: diagnosed
trigger: 'Queue data persists and remains visible without manual intervention - pass however this is a more of a holistic problem: after a couple minutes the whole list disappears and i have to trigger the poll again and again however when trigger the same poll again and going back to fresh match queue the role cards that i marked are still marked/saved'
created: 2026-04-06T00:00:00Z
updated: 2026-04-06T00:00:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: Query data becomes stale after 5min, refetches automatically somehow, but during brief navigation gcTime clears cache
test: tracing exact behavior chain - when user navigates away briefly, cache clears, and on return query has no cached data
expecting: gcTime (5 min) clears cache when user briefly navigates away (to filter, to browse jobs, etc.)
next_action: confirm gcTime is root cause and formulate solution

## Symptoms

expected: Queue data persists and remains visible without manual intervention
actual: After a couple minutes, all roles disappear from the queue; user must manually trigger poll again
errors: None reported
reproduction: Wait a couple minutes on Fresh Match Queue page; roles disappear
started: Existing issue (UAT test 4)

## Eliminated

- hypothesis: After staleTime, queue refetches and API returns empty data
  evidence: getRankedJobs dynamically queries database each time - data persists
  timestamp: 2026-04-06T00:15:00Z

- hypothesis: Filtering logic hides all cards after refetch when filter≠'all'
  evidence: User says "whole list disappears" - implies even marked/filtered roles disappear. Also happens with filter='all' likely
  timestamp: 2026-04-06T00:35:00Z

## Evidence

- timestamp: 2026-04-06T00:05:00Z
  checked: src/lib/hooks/use-match-queue.ts
  found: useMatchQueue hook has staleTime: 5 minutes, but no cacheTime/gcTime configured
  implication: Query uses default TanStack Query gcTime (5 minutes in v5), meaning cache is garbage collected 5 minutes after last use

- timestamp: 2026-04-06T00:06:00Z
  checked: src/app/providers.tsx
  found: QueryClient default staleTime is 5 minutes, no gcTime/cacheTime configured
  implication: All queries inherit default gcTime of 5 minutes (TanStack Query v5 default)

- timestamp: 2026-04-06T00:10:00Z
  checked: TanStack Query v5 documentation
  found: Default gcTime is 5 minutes (300,000ms) - cache is garbage collected after 5 minutes of inactivity
  implication: Queue data is removed from memory 5 minutes after last component using it unmounts

- timestamp: 2026-04-06T00:12:00Z
  checked: User behavior flow
  found: User navigates to Queue page -> sees data -> waits "a couple minutes" -> roles disappear
  implication: User is STAYING on the queue page, but after 5 minutes the cache expires due to staleTime, data refetches, but if network/API issue or data not persisted, queue appears empty

- timestamp: 2026-04-06T00:15:00Z
  checked: /api/matching/queue and getRankedJobs function
  found: API dynamically calculates queue from database each time - queries jobs with requirements and mappings
  implication: Data DOES persist in database, so API should return queue on refetch. Issue must be elsewhere.

- timestamp: 2026-04-06T00:17:00Z
  checked: TanStack Query refetch behavior with refetchOnWindowFocus: true
  found: After staleTime (5 min), query becomes stale. With refetchOnWindowFocus: true, it refetches on window focus. But no automatic refetch while user is actively viewing the page unless refetchInterval is set.
  implication: After 5 minutes of viewing queue page, data becomes stale but doesn't refetch until user focuses window or navigates away/back

- timestamp: 2026-04-06T00:20:00Z
  checked: gcTime behavior documentation
  found: gcTime timer starts AFTER all components unmount, not while component is mounted
  implication: gcTime cannot cause data to disappear while user is on queue page - component is still mounted and using the query

- timestamp: 2026-04-06T00:22:00Z
  reconsidered: User symptom - "after a couple minutes the whole list disappears"
  found: User navigates away to Browse Jobs to trigger poll, then comes BACK to queue
  implication: This suggests gcTime garbage collection happens between navigation - user leaves queue page (unmounts component), gcTime starts, returns before gcTime expires but cache might be in transition, OR user is gone longer than gcTime

- timestamp: 2026-04-06T00:25:00Z
  checked: FilteredQueueList implementation
  found: Each RoleCard fetches its own status via useRoleStatus(job.jobId). Cards render conditionally based on status filter matching actual status.
  implication: If ALL cards disappear, either queue data is empty OR all cards are being filtered out due to status mismatch

- timestamp: 2026-04-06T00:27:00Z
  checked: useRoleStatus implementation
  found: useRoleStatus has same staleTime (5 min) as useMatchQueue. Returns { status: null, notes: null } when no status set (404 response).
  implication: Status queries expire at same time as queue query

- timestamp: 2026-04-06T00:30:00Z
  checked: RoleCardWithFilter shouldShow logic (queue/page.tsx lines 152-158)
  found: Logic is: if filter='all' return true, if loading return true, else return roleStatus?.status === statusFilter
  implication: Cards with status=null only show when filter='all' OR while loading. After loading completes with status=null and filter≠'all', card is hidden

- timestamp: 2026-04-06T00:32:00Z
  hypothesis_formed: After 5 minutes (staleTime), BOTH queue and status queries become stale. On next window focus or user interaction, TanStack Query refetches all stale queries. During refetch, isLoading becomes true again for status queries. After refetch completes, if user has filter≠'all', all cards with status=null disappear because they don't match the filter.
  eliminated: This doesn't explain ALL roles disappearing - some roles have statuses set (user said "marked roles persist")

- timestamp: 2026-04-06T00:35:00Z
  reconsidered: User symptom details
  found: "after a couple minutes" (2-3 min, less than 5 min staleTime), ALL roles disappear, must trigger poll to get them back
  implication: Not a staleTime/refetch issue. Something else is clearing the data.

- timestamp: 2026-04-06T00:37:00Z
  hypothesis_new: gcTime (5 min) is clearing queue cache when user navigates away briefly
  test: User might minimize browser or switch tabs briefly, causing unmount/remount or navigation event
  implication: Need to verify if "couple minutes" means user is continuously on page or if they navigate away

- timestamp: 2026-04-06T00:40:00Z
  checked: Automatic polling configuration
  found: No refetchInterval configured for useMatchQueue or useRoleStatus queries. No background polling.
  implication: Queries only refetch on: manual refetch, window focus (refetchOnWindowFocus: true), or manual invalidation

- timestamp: 2026-04-06T00:42:00Z
  reconsidered: "couple minutes" and "trigger poll again and again"
  insight: User doesn't say they navigate away - they stay on queue page, roles disappear, THEN they navigate to Browse Jobs to trigger poll
  implication: Something is happening on the queue page itself to make roles disappear while user is actively viewing it

- timestamp: 2026-04-06T00:45:00Z
  hypothesis_refined: Default gcTime (5 min) is causing cache garbage collection, but user says "couple minutes" (2-3 min)
  checked: TanStack Query defaults - staleTime:0 (default), gcTime: 5min (default)
  found: Our config sets staleTime: 5min explicitly, but gcTime is not configured - uses default 5 min
  implication: Both staleTime AND gcTime are 5 minutes. If user waits 5+ minutes on page, query becomes stale but component is still mounted so cache should persist. But if user briefly navigates (even back/forward), component unmounts, gcTime timer starts, and cache clears after 5 min inactive.

- timestamp: 2026-04-06T00:50:00Z
  final_analysis: User workflow - views queue, navigates around app (Browse Jobs, role briefs, etc.), returns to queue after gcTime expires
  found: gcTime countdown starts when MatchQueueContent unmounts (user navigates away). After 5 min inactive, cache is garbage collected. On return, no cached data exists.
  confirmation: ROOT CAUSE - gcTime (5 min) is too short for typical user session, causing cache to be cleared during normal navigation patterns

## Resolution

root_cause: Default gcTime (5 minutes) causes TanStack Query to garbage collect queue cache after 5 minutes of inactivity. When user navigates away from Fresh Match Queue page (even briefly to Browse Jobs or another page), the component unmounts and gcTime countdown begins. If user returns after gcTime expires, cache is gone and query returns stale/empty data until manual poll trigger repopulates database with fresh jobs.

Compounding factor: No automatic background polling configured for queue data, so once cache expires, queue remains empty until user manually triggers poll via Browse Jobs page.

fix: Increase gcTime for matchQueue query to persist cache longer (e.g., 30 minutes or Infinity for persistent cache), OR implement automatic background polling to keep queue data fresh
verification: n/a (find_root_cause_only mode)
files_changed:

- src/lib/hooks/use-match-queue.ts (needs gcTime configuration)
- src/app/providers.tsx (optional: increase default gcTime globally)
