# Code Review — 2026-07-20 (Claude Fable 5, full second pass)

Scope: this pass covered everything the 2026-07-13 quick review could not —
matching-engine internals, dashboard/queue caching, the notification
dispatcher, schema/migration drift — plus a standards/spec review of the
07-13 fix commit itself and a 24-check Playwright e2e run against a local
production build. **All findings below were fixed on this branch in the same
commit that adds this document.**

## High-severity findings (fixed)

### 1. IDOR: mappings POST accepted any user's evidence item

`POST /api/matching/[jobId]/mappings` passed the client-supplied
`evidenceItemId`/`requirementId` straight to insert with no ownership check —
any authenticated user could attach (and then read back through their own
brief) another user's private evidence by UUID.
**Fix:** the route now 404s unless the evidence item belongs to the caller and
400s unless the requirement belongs to the job.

### 2. Matching cooldown was global per job, with no duplicate guard

The 10-minute cooldown keyed on `job.lastMatchedAt` (shared across users), so
user A's run 429'd user B, while two concurrent runs could double-spend LLM
calls and insert duplicate mapping rows (no unique constraint existed).
**Fix:** new `matching_run` table; the run route atomically claims a
`(user, job)` slot via conditional upsert. `evidence_mapping` gained a unique
index on `(user_id, requirement_id, evidence_item_id)` (migration dedupes
first); pipeline inserts use `ON CONFLICT DO NOTHING`, manual creates upsert
as overrides.

### 3. Queue page discarded valid data on failed background refetch

`queue/page.tsx` (and the brief page) checked `error` before `data`. With
5-minute background refetches, one transient failure blanked a populated
queue into a full-page error — the exact historical "queue disappears"
symptom the gcTime/placeholderData fixes never addressed.
**Fix:** full error screen only when there is no cached data; otherwise the
queue renders with a "couldn't refresh" banner.

### 4. Notification dispatcher could double-send emails

`lastNotifiedAt` was updated only after a successful Resend call — a crash
between send and update, or two overlapping cron invocations, re-sent the
same alerts.
**Fix:** claim-then-send — a conditional update on `lastNotifiedAt` claims
the window before sending (overlapping runs lose the claim and skip), with a
best-effort revert if the send fails.

### 5. Fresh `db:migrate` failed outright (migration journal drift)

`0004_pre_enable_pgvector.sql`, `0004_post_create_hnsw_indexes.sql`, and
`0006_post_lower_company_index.sql` were never journaled — a fresh
environment died at 0004 with "type vector does not exist".
**Fix:** `CREATE EXTENSION IF NOT EXISTS vector` now heads the journaled 0004
(drizzle gates by timestamp, so applied DBs are unaffected), and migration
0007 recreates the HNSW + `lower(company)` indexes idempotently.

## Medium findings (fixed)

- **Eligibility filters were dead code** — `filterEligibleJobs` (visa,
  onsite-location, season, graduation window) was never called; users who
  require sponsorship saw non-sponsoring roles. Now wired into
  `getRankedJobs` after the ranking query (unknown values still pass), with a
  unit-test suite.
- **Broken optimistic rollback** — `useUpdateRoleStatus` snapshotted and
  restored the (never-touched) queue instead of the role-status entry it
  actually mutated. A failed status change now rolls back visibly.
- **Empty resume parse marked 'completed'** — a garbage resume that parsed to
  zero items skipped the replace but still showed success. It now fails the
  source with a clear message and keeps prior evidence.
- **Upload error said "PDF parsing error: undefined"** — pdf2json's error
  payload isn't always an Error; both extractors now emit stable, client-safe
  messages (found live by the e2e suite).

## Cleanups (fixed)

- Duplicated cron auth guard extracted to `lib/auth/cron.ts` (fail-closed).
- Dead pg-boss layer deleted (`lib/jobs/index.ts`, unused `*Handler`
  wrappers, queue-name constants, the `pg-boss` dependency) — every worker
  already runs inline via cron routes.
- Dead `createManyEvidenceItems` removed; `EvidenceItemInput.itemType`
  restored to the `'experience' | 'project' | 'skill' | 'education'` union.
- Debug `console.log`s (including user ids) stripped from the queue hot path;
  queue API 500s no longer echo internal error messages.
- Stale "up to 500 per matching run" comment corrected (cap is 25).

## Verified clean (no action)

Ranker fitness SQL (no div-by-zero; weights sum to 1), similarity topK
ordering, embedder failure paths, gap-analyzer scoping, dark-mode input
legibility fix, `markJobsInactive` company scoping, email template escaping
(no HTML injection), remaining schema↔migration alignment including all
upsert-target unique indexes, and the 07-13 fixes themselves (cron
fail-closed, transactional resume replace, tests wired into CI) — confirmed
by code reading plus a 24/24-passing Playwright run (sign-up → criteria →
evidence → queue → sign-out/in, upload rejection paths, cron/API auth).

## Known deferrals

- **N+1 role-status fetches**: the queue mounts up to 50 cards, each fetching
  `/api/roles/[jobId]/status` individually on cold load. Fine at personal
  scale; batch endpoint recommended before multi-user growth.
- **Ranker SQL formula has no DB-backed tests** (pure helpers are tested; the
  SQL itself would need a test database).
- **`npm audit`** reports pre-existing advisories in transitive dependencies;
  none introduced by this pass.
