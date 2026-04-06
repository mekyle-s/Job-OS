---
status: resolved
trigger: 'Queue cache flashes then disappears after gcTime fix'
created: 2026-04-06T00:00:00Z
updated: 2026-04-06T00:20:00Z
---

## Current Focus

hypothesis: Fix implemented - markJobsInactive now filters by both source AND company. Need to verify queue persists after navigation and doesn't disappear during background refetches.
test: Manual verification - restart dev server, load Fresh Match Queue, navigate away, return after 6+ minutes, verify queue persists (doesn't flash and disappear)
expecting: Queue displays immediately from cache and remains visible after background refetch completes
next_action: Provide verification instructions to user

## Symptoms

expected: Queue data persists for 30 minutes after navigation, displays immediately when returning to page
actual: Queue flashes briefly (<1 second) when returning to page, then disappears completely
errors: None visible
reproduction:

1. View Fresh Match Queue (data loads)
2. Navigate to Dashboard
3. Navigate back to Fresh Match Queue
4. Queue data flashes for <1 second, then disappears
5. Wait 5+ minutes - data remains gone
   timeline: Started after implementing gcTime fix (quick task 1, commit 7816a11). Previous behavior: queue was empty on return (no flash). Current behavior: queue flashes then disappears.
   context:

- gcTime extended to 30 minutes in use-match-queue.ts, use-role-status.ts, providers.tsx
- refetchInterval set to 10 minutes in use-match-queue.ts
- Dev server restarted, browser hard refreshed
- When user triggers new poll from Browse Jobs, all previous tags/edits are preserved (data persists in DB)

## Eliminated

## Evidence

- timestamp: 2026-04-06T00:01:00Z
  checked: use-match-queue.ts query configuration
  found: staleTime=5min, gcTime=30min, refetchInterval=10min
  implication: Queue cache persists for 30 min but marked stale after 5 min

- timestamp: 2026-04-06T00:02:00Z
  checked: useRoleStatus query configuration (use-role-status.ts line 33-34)
  found: staleTime=5min, gcTime=30min - matches queue settings
  implication: Role status queries also marked stale after 5 min

- timestamp: 2026-04-06T00:03:00Z
  checked: useUpdateRoleStatus mutation onSettled (use-role-status.ts line 86-90)
  found: invalidateQueries({ queryKey: matchKeys.queue() }) called in onSettled
  implication: ANY role status update invalidates entire queue cache

- timestamp: 2026-04-06T00:04:00Z
  checked: page.tsx component structure
  found: FilteredQueueList renders multiple RoleCardWithFilter, each calls useRoleStatus(jobId)
  implication: Multiple role status queries mount simultaneously when returning to page

- timestamp: 2026-04-06T00:05:00Z
  checked: Flash timing and symptom pattern
  found: Flash (<1s) matches typical query refetch completion time. Data briefly visible (from cache), then disappears (after invalidation)
  implication: Sequence: mount -> show cached queue -> role status queries refetch (stale) -> mutation onSettled or query refetch triggers invalidation -> queue cleared

- timestamp: 2026-04-06T00:06:00Z
  checked: refetchInterval behavior in use-match-queue.ts
  found: refetchInterval: 1000 _ 60 _ 10 (10 minutes) configured. TanStack Query continues interval polling even when component unmounts, as long as query is in cache.
  implication: If user is away for 10+ minutes, refetchInterval triggers background fetch that updates cache BEFORE user returns

- timestamp: 2026-04-06T00:07:00Z
  checked: Symptom timing with refetchOnWindowFocus
  found: refetchOnWindowFocus: true in providers.tsx (line 14). Stale queries refetch on window focus.
  implication: Two refetch triggers: 1) refetchInterval after 10 min, 2) refetchOnWindowFocus when returning to page after staleTime (5 min)

- timestamp: 2026-04-06T00:08:00Z
  checked: Added console logging to track refetch behavior
  found: Added logging to use-match-queue.ts (queryFn), queue API route (GET handler), and page.tsx (MatchQueueContent render)
  implication: Will be able to see exact sequence: cache display -> refetch trigger -> API call -> data returned -> UI update

- timestamp: 2026-04-06T00:09:00Z
  checked: Console logs from user test after 6 minutes away
  found:
  - 07:25:24 - Initial API fetch returns count: 50 (queue populated)
  - 07:31:51 - After 6 minutes, user returns to page
  - Cache displays 50 roles briefly (the flash)
  - Automatic refetch triggered by refetchOnWindowFocus
  - API returns count: 0 (empty queue)
  - Component updates to show 0 roles
  - Multiple "Fast Refresh rebuilding" events occurred during the 6-minute period
    implication: Cache is working correctly. The problem is the API is returning empty queue (count: 0) on refetch after 6 minutes, even though database still has data (confirmed by user's tags/edits persisting on manual poll). Next.js hot reload may be interfering.

- timestamp: 2026-04-06T00:10:00Z
  checked: queue API route (/src/app/api/matching/queue/route.ts)
  found: Simple route that calls getRankedJobs(user.id) and returns the result. No state dependencies.
  implication: Issue must be in getRankedJobs function, not the API route itself.

- timestamp: 2026-04-06T00:11:00Z
  checked: getRankedJobs function (/src/lib/matching/ranker.ts lines 48-127)
  found: Complex SQL query that:
  - Filters jobs WHERE isActive=true AND parseStatus='completed'
  - Joins with requirements and evidenceMapping (filtered by userId)
  - Groups by job.id
  - Orders by composite score (70% fit + 30% freshness)
  - Limits to 50 results
    implication: Query returns empty when either: 1) No jobs match WHERE clause (isActive/parseStatus), 2) No jobs have requirements, 3) Join filtering eliminates all results

- timestamp: 2026-04-06T00:12:00Z
  checked: job-poller.ts lines 120-138 (job deactivation logic)
  found: After fetching jobs, poller calls adapter.getActiveJobIds(boardToken) then markJobsInactive(source, activeJobIds). This is meant to mark jobs that disappeared from the source as inactive.
  implication: If getActiveJobIds fails or returns empty array, markJobsInactive will mark ALL jobs as inactive

- timestamp: 2026-04-06T00:13:00Z
  checked: greenhouse.ts getActiveJobIds implementation (lines 154-170)
  found: Function returns empty array [] on any error (response.ok = false, exception, etc.). No distinction between "no jobs" vs "API failed".
  implication: API failures during background polling cause empty array return, which triggers marking all jobs inactive

- timestamp: 2026-04-06T00:14:00Z
  checked: markJobsInactive implementation (jobs.ts lines 274-290)
  found: UPDATE job SET isActive=false WHERE source='greenhouse' AND sourceJobId NOT IN (activeJobIds) AND isActive=true. When activeJobIds=[], the NOT IN ([]) clause matches ALL jobs.
  implication: Calling markJobsInactive with empty array marks ALL jobs as inactive - this is the bug

- timestamp: 2026-04-06T00:15:00Z
  checked: Re-examined markJobsInactive logic with multi-company scenario
  found: Guard clause `if (activeJobIds.length > 0)` was already present in job-poller.ts (line 128), so empty array is NOT the issue.
  implication: The bug must be something else - empty array is prevented from calling markJobsInactive

- timestamp: 2026-04-06T00:16:00Z
  checked: Multi-company polling loop in job-poller.ts (lines 122-138)
  found: Loop iterates through ALL targetCompanies. For each company:
  1. Fetches activeJobIds for that company's board token
  2. Calls markJobsInactive('greenhouse', activeJobIds)
  3. markJobsInactive filters WHERE source='greenhouse' AND sourceJobId NOT IN (activeJobIds)
  4. But activeJobIds only contains jobs for CURRENT company, not all companies
     implication: When polling Airbnb, it marks all NON-Airbnb Greenhouse jobs (Stripe, Figma, etc.) as inactive!

- timestamp: 2026-04-06T00:17:00Z
  checked: Job table schema (schema.ts line 193)
  found: Job table has `company` text field that's queryable
  implication: markJobsInactive should filter by BOTH source AND company, not just source

## Resolution

root_cause: markJobsInactive filters jobs only by source (e.g., 'greenhouse'), not by company. When user has multiple target companies (Airbnb, Stripe, Figma), the job poller iterates through each company and calls markJobsInactive with that company's active job IDs. The WHERE clause `sourceJobId NOT IN (activeJobIds)` marks jobs from OTHER companies as inactive because activeJobIds only contains the current company's jobs. Example: Polling Airbnb gets [job1, job2, job3] for Airbnb, then marks inactive WHERE sourceJobId NOT IN ([job1, job2, job3]), which incorrectly includes Stripe and Figma jobs. This causes all jobs to eventually be marked inactive as the poller cycles through companies, making the queue disappear.

fix: Updated markJobsInactive to accept company parameter and filter by both source AND company. Updated job poller to pass normalized company name when calling markJobsInactive. This ensures each company's poll only affects that company's jobs.

verification: Awaiting manual test - user should:

1. Restart dev server (npm run dev)
2. Load Fresh Match Queue page (should see ~50 jobs)
3. Navigate to Dashboard
4. Wait 6-10 minutes (allow background polling/refetch to occur)
5. Navigate back to Fresh Match Queue
6. Expected: Queue displays immediately from cache and persists (no flash then disappear)
7. Check console logs - should see refetch completing with same count as initial load

files_changed:

- C:\Users\Mekyle\desktop\personal_project\src\lib\db\queries\jobs.ts: Added company parameter to markJobsInactive, added eq(job.company, company) to WHERE clause
- C:\Users\Mekyle\desktop\personal_project\src\lib\jobs\workers\job-poller.ts: Pass normalized company name to markJobsInactive

root_cause:
fix:
verification:
files_changed:

- C:\Users\Mekyle\desktop\personal_project\src\lib\hooks\use-match-queue.ts
- C:\Users\Mekyle\desktop\personal_project\src\app\api\matching\queue\route.ts
- C:\Users\Mekyle\desktop\personal_project\src\app\dashboard\queue\page.tsx
