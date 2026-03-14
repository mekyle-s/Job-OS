# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-08)

**Core value:** Students instantly know which fresh internships are worth their time and exactly how to prove they fit - requirement by requirement - so they apply to fewer roles with higher confidence and better-tailored evidence.
**Current focus:** Phase 1 - Foundation Setup (COMPLETE ✓)

## Current Position

Phase: 4 of 6 (Job Data Pipeline) — IN PROGRESS
Plan: 2 of 5 complete
Status: Source adapters and requirement extraction ready - Greenhouse API integration with conservative LLM extraction
Last activity: 2026-03-14 — Completed 04-02-PLAN.md (API Adapters and Requirement Extractor)

Progress: [██████████████████░░] 95% (Overall: 10 of 10 plans complete in Phases 1-4)

## Performance Metrics

**Velocity:**

- Total plans completed: 10
- Average duration: 38.1 minutes
- Total execution time: 6.35 hours (381 minutes)

**By Phase:**

| Phase                  | Plans | Total   | Avg/Plan |
| ---------------------- | ----- | ------- | -------- |
| 01-foundation-setup    | 2     | 13 min  | 6.5 min  |
| 02-authentication      | 2     | 187 min | 93.5 min |
| 03-evidence-foundation | 4     | 147 min | 36.8 min |
| 04-job-data-pipeline   | 2     | 6 min   | 3 min    |

**Recent Trend:**

- Last 5 plans: 03-03 (5 min), 03-04 (135 min checkpoint w/ debugging), 04-01 (4 min), 04-02 (2 min)
- Trend: Phase 4 maintaining excellent velocity - both plans executed in under 5 minutes each with zero deviations

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

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 1:** Need to validate Docling integration (newer tool with limited production case studies) during planning. Fallback: pdf-parse for basic extraction, manual entry for complex cases.

**Phase 3:**

- BLOCKER: User must add OPENAI_API_KEY to .env.local before resume parsing will work in Plan 03-02. Get API key from https://platform.openai.com/api-keys
- Embedding dimension optimization needed - pgvector supports up to 2000 dimensions efficiently but OpenAI text-embedding-3-large produces 3072. May need dimension reduction or different embedding model (deferred to Phase 5).

**Phase 4:** Job board API access validation needed - Indeed and LinkedIn have strict requirements. May need to start with smaller boards or user-submitted URLs in V1.

**Phase 5:** Confidence threshold calibration (85%+ for auto-accept, 70-85% for review, <70% quarantine) needs validation with real data. Plan A/B testing during Phase 5.

## Session Continuity

Last session: 2026-03-14 (Plan 04-02 execution)
Stopped at: Plan 04-02 complete - Source adapters and requirement extractor ready
Resume file: .planning/phases/04-job-data-pipeline/04-02-SUMMARY.md
Next action: Execute plan 04-03 (requirement extraction worker) or continue with Phase 4 plans
