# Code Review — 2026-07-13 (Claude Fable 5, quick pass)

Scope: security-critical surfaces reviewed directly — middleware, all 19 API route
auth guards, cron endpoints, file upload, server actions, Greenhouse fetcher, raw
SQL usage, CI/config. A wider 10-agent review was cut short at the 5-minute mark,
so the areas listed under "Not reviewed" have had no completed pass.

## Findings

### 1. Cron endpoints accept `Bearer undefined` if `CRON_SECRET` is unset — medium

`src/app/api/cron/poll-jobs/route.ts:19` and
`src/app/api/cron/check-notifications/route.ts:16` compare the incoming header to
`` `Bearer ${process.env.CRON_SECRET}` ``. If that env var is ever missing (new
environment, CRLF env-var mishap on Vercel), sending the literal string
`Bearer undefined` authenticates and lets anyone trigger polling/notifications.

**Fix:** fail closed — return 401/500 when `!process.env.CRON_SECRET` before
comparing.

### 2. Resume re-upload deletes old evidence before the new source is safely created — medium

`src/app/api/evidence/upload/route.ts:63-76` runs `deleteParsedResumeEvidence(userId)`
and then `createEvidenceSource(...)` as two separate writes with no transaction. If
the create (or the later parse) fails, the user's previous resume evidence is
already gone with nothing to replace it.

**Fix:** wrap delete + create in a transaction, or defer the delete until the new
source has parsed successfully.

### 3. No tests anywhere; CI is lint + build only — medium

`package.json` has no test script, the repo has zero test files, and
`.github/workflows/ci.yml` runs `eslint` + `next build`. For ~11.5k lines including
scoring math (`src/lib/matching/ranker.ts` has a hand-written SQL fitness formula)
and money-costing LLM calls, there is no regression net at all.

### 4. Upload error handler leaks internal messages — low

`src/app/api/evidence/upload/route.ts:97-98` returns `error.message` from PDF/DOCX
parser internals straight to the client in the 500 response.

## What checked out clean

- **Auth coverage is complete**: all 19 API routes are guarded via
  `verifySession()` / `requireUser()` / `CRON_SECRET` except `/api/health` and the
  better-auth handler, both intentionally public. All three server actions in
  `src/app/dashboard/evidence/actions.ts` call `requireUser()`. Middleware is
  correctly documented as UX-only, not the auth boundary.
- **No SSRF** in the Greenhouse source: company names are stripped to `[a-z0-9]`
  and appended to a fixed `boards-api.greenhouse.io` base URL.
- **No XSS sinks**: zero hits for `dangerouslySetInnerHTML` / `innerHTML`; all raw
  `` sql` ` `` usage goes through Drizzle's parameterized template.
- Upload validation (auth, MIME allowlist, 4MB cap, no filesystem writes) is solid.

## Not reviewed

Matching-engine math internals, dashboard pages/caching (the area with the past
queue-cache bugs), DB schema/migration drift, hooks, and the notification
dispatcher never got a completed pass. Highest-value next slice: a review scoped to
`src/lib/matching` + `src/app/dashboard/queue`.
