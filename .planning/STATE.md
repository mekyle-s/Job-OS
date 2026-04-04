# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-08)

**Core value:** Students instantly know which fresh internships are worth their time and exactly how to prove they fit - requirement by requirement - so they apply to fewer roles with higher confidence and better-tailored evidence.
**Current focus:** Phase 1 - Foundation Setup (COMPLETE ✓)

## Current Position

Phase: 6 of 6 (Tracking & Notifications) — IN PROGRESS
Plan: 1 of 3 complete
Status: Data foundation ready, role status tracking and audit trail established
Last activity: 2026-04-04 — Completed 06-01-PLAN.md (Tracking Data Foundation)

Progress: [█████████████████████░░] 80% (Overall: 16 of 20 plans complete)

## Performance Metrics

**Velocity:**

- Total plans completed: 16
- Average duration: 25.8 minutes
- Total execution time: 6.9 hours (412 minutes)

**By Phase:**

| Phase                       | Plans | Total   | Avg/Plan |
| --------------------------- | ----- | ------- | -------- |
| 01-foundation-setup         | 2     | 13 min  | 6.5 min  |
| 02-authentication           | 2     | 187 min | 93.5 min |
| 03-evidence-foundation      | 4     | 147 min | 36.8 min |
| 04-job-data-pipeline        | 4     | 14 min  | 3.5 min  |
| 05-matching-core            | 3     | 14 min  | 4.7 min  |
| 06-tracking-notifications   | 1     | 4 min   | 4.0 min  |

**Recent Trend:**

- Last 5 plans: 05-01 (4 min), 05-02 (6 min), 05-03 (4 min), 06-01 (4 min)
- Trend: Exceptional velocity maintained - Phase 4, 5, and 6 plans executing in 3-6 minutes with minimal deviations

_Updated after each plan completion_

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Proof-first positioning: Lead with requirement-level evidence mapping, not discovery volume (differentiates from LinkedIn)
- Internship-only V1: Tight ICP focus, defer full-time roles to avoid early dilution
- Trust over automation: Show source excerpts, confidence scores, manual overrides - never hallucinate fit
- Supported sources only: Be explicit about coverage, build trust through honesty
- Personal proof graph as moat: Reusable evidence compounds on user-specific data

**From 01-01 (Foundation Setup):**

- DEV-001: Manual Next.js setup (create-next-app incompatible with non-empty directory)
- DEV-002: Use @tailwindcss/postcss for Tailwind CSS v4
- DEV-003: Simplified ESLint flat config (avoid FlatCompat circular dependency)
- DEV-004: Foundation users table without auth fields (Phase 2 will add via migration)

**From 01-02 (Job Queue and Health Check):**

- DEV-005: Per-request job queue initialization for Phase 1 (proves queue works, Phase 2+ will refactor to server-level lifecycle)
- DEV-006: Separate pgboss schema for job queue tables (isolates pg-boss from application tables)
- DEV-007: Add TypeScript parser to ESLint config (fixes parsing errors for TypeScript files)

**From 02-01 (Better Auth Backend):**

- DEV-008: Use text IDs instead of UUIDs for Better Auth compatibility (Better Auth generates its own text-based IDs internally)
- DEV-009: Disable email verification for V1 to allow immediate login after sign-up (can enable later for production)
- DEV-010: Use Resend's onboarding@resend.dev sandbox domain as default EMAIL_FROM (works without domain verification, user can update later)
- DEV-011: Implement DAL pattern for session verification via requireUser/verifySession helpers (separate from middleware for proper authorization)

**From 02-02 (Auth UI Pages):**

- DEV-012: Use singular table names for Better Auth schema (user, session, account, verification instead of plural). Better Auth's internal queries expect singular table names. This is a framework convention that must be followed for compatibility.

**From 03-01 (Evidence Data Layer):**

- DEV-013: Defer vector/embedding columns to Phase 5 - Evidence tables don't need embedding columns until semantic search is implemented. Phase 5 will add embedding columns via migration when actually needed for proof graph search.

**From 03-02 (Resume Upload & Parsing):**

- DEV-014: Lazy-initialize OpenAI client at runtime - Direct instantiation (`const client = new OpenAI()`) causes Next.js build failures when OPENAI_API_KEY env var is missing. Using lazy initialization pattern (getOpenAIClient() function) defers client creation to first use, allowing builds to succeed without API key present.
- DEV-015: pg-boss workers accept Job<T>[] array signature - pg-boss work() handlers receive array of jobs, not single job objects. Workers must extract first job with `jobs[0]` pattern for processing.

**From 03-03 (Evidence Management UI):**

- DEV-016: Evidence UI components created early in 03-02 to support resume parsing testing - 03-03 focused on dashboard integration and form pages rather than creating all UI components from scratch. Evidence list, cards, and actions were already functional from prior plan.

**From 03-04 (Upload UI Integration):**

- DEV-017: Use pdf2json instead of pdf-parse for server-side PDF extraction - pdf-parse v2 requires browser workers (incompatible with Next.js server), v1 has build-time test file issues. pdf2json is purpose-built for Node.js server environments with event-based API and no worker dependencies.
- DEV-018: OpenAI Structured Outputs requires .nullable() not .optional() - All optional fields in Resume Evidence schemas must use .nullable() instead of .optional() per OpenAI API requirements. Fields can be omitted entirely (undefined) or explicitly null, but .optional() is not supported.
- DEV-019: Tailwind CSS v4 uses @import syntax not @tailwind directives - v4 requires `@import "tailwindcss";` and `@source "../**/*.{js,ts,jsx,tsx}";` in globals.css instead of `@tailwind base/components/utilities`. Config file (tailwind.config.ts) is no longer used for content paths.
- DEV-020: Convert nullable to undefined when passing to TypeScript interfaces - Database query functions expect `string | undefined` for optional fields, but OpenAI schemas use `string | null`. Use `field ?? undefined` pattern to convert null to undefined when creating database records.

**From 04-01 (Job Data Schema):**

- DEV-021: Use text columns with Zod validation instead of pgEnum - Per DEV-012 patterns and existing codebase convention, the project uses text columns with runtime Zod validation rather than database-level enums. This avoids migration complexity when adding new enum values. Apply to all category/priority/status fields in job pipeline tables.
- DEV-022: Use uniqueIndex() not index().unique() for composite unique constraints - Drizzle ORM API does not support `.unique()` method on index builder. Must use `uniqueIndex()` function for composite unique constraints on (source, sourceJobId) lookup patterns.

**From 04-03 (Background Workers and Cron):**

- DEV-023: pg-boss work() does not accept teamSize option - The pg-boss WorkOptions interface does not support a `teamSize` concurrency option. Workers use default concurrency settings. For custom concurrency control, use pg-boss built-in options like `teamConcurrency` or configure at the queue level.

**From 04-04 (Job Data Management API):**

- DEV-024: Use verifySession for API routes instead of requireUser - API routes return JSON responses, not HTML redirects. verifySession returns null instead of redirecting, allowing proper 401 JSON error responses per REST conventions. Consistent authentication pattern across all API routes.
- DEV-025: Convert null to undefined for optional criteria fields - Zod schemas use .nullable().optional() for frontend flexibility, but database query functions expect string | undefined. Use field ?? undefined pattern per DEV-020 to convert null to undefined when passing to database layer. Maintains type safety at API/database boundary.

**From 05-01 (Schema Migration):**

- DEV-026: Custom migration runner for complex migrations - pgvector extension enablement and HNSW index creation require specific ordering (extension → tables → indexes). Split migrations into pre/main/post scripts with custom runner instead of standard drizzle-kit migrate. Pattern: scripts/run-{feature}-migration.ts for non-standard migrations.
- DEV-027: Explicit environment variable loading for tsx scripts - tsx doesn't auto-load .env.local. Migration and utility scripts must explicitly import dotenv and call config({ path: '.env.local' }) at top of file. Prevents SASL/connection errors from undefined DATABASE_URL.
- DEV-028: Vector columns require nullable option - Vector embedding columns on evidence_item and requirement tables should be nullable to allow content without embeddings. Use `vector('embedding', { dimensions: 1536 })` (nullable by default) to support gradual embedding generation.
- DEV-029: Query selects must include all schema columns - When schema adds new columns, all SELECT queries must explicitly include them in both select() clause and return mapping. TypeScript will error on missing properties. Update pattern: add to select(), add to .groupBy() if using aggregation, add to return mapping.

**From 06-01 (Tracking Data Foundation):**

- DEV-030: Fire-and-forget audit logging pattern - The logParserAudit function catches and logs errors instead of throwing to prevent audit failures from blocking business operations. This ensures the audit trail is best-effort and doesn't impact user-facing features. Pattern established for all future audit logging.

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 1:** Need to validate Docling integration (newer tool with limited production case studies) during planning. Fallback: pdf-parse for basic extraction, manual entry for complex cases.

**Phase 3:**

- BLOCKER: User must add OPENAI_API_KEY to .env.local before resume parsing will work in Plan 03-02. Get API key from https://platform.openai.com/api-keys
- Embedding dimension optimization needed - pgvector supports up to 2000 dimensions efficiently but OpenAI text-embedding-3-large produces 3072. May need dimension reduction or different embedding model (deferred to Phase 5).

**Phase 4:**

- BLOCKER: User must add CRON_SECRET to .env.local for cron endpoint security. Generate with: `openssl rand -base64 32`. Also add to Vercel project env vars for production.
- Job board API access validation needed - Indeed and LinkedIn have strict requirements. May need to start with smaller boards or user-submitted URLs in V1.

**Phase 5:** Confidence threshold calibration (85%+ for auto-accept, 70-85% for review, <70% quarantine) needs validation with real data. Plan A/B testing during Phase 5.

## Session Continuity

Last session: 2026-04-04 (Plan 06-01 execution)
Stopped at: Plan 06-01 complete - Database schema for role status tracking, parser audit trail, and notification timestamps
Resume file: .planning/phases/06-tracking-notifications/06-01-SUMMARY.md
Next action: Execute plan 06-02 (Role Status Tracking UI) to build status update components and queue filtering
