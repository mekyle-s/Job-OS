# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-08)

**Core value:** Students instantly know which fresh internships are worth their time and exactly how to prove they fit - requirement by requirement - so they apply to fewer roles with higher confidence and better-tailored evidence.
**Current focus:** Phase 1 - Foundation Setup (COMPLETE ✓)

## Current Position

Phase: 3 of 6 (Evidence Foundation) — IN PROGRESS
Plan: 1 of 4 in current phase
Status: Evidence data layer complete - database schema, validation, and CRUD queries ready
Last activity: 2026-03-12 — Completed 03-01-PLAN.md (Evidence Data Layer)

Progress: [████████████░░░░░░░░] 62.5% (Overall: 5 of 8 plans complete)

## Performance Metrics

**Velocity:**

- Total plans completed: 5
- Average duration: 42.4 minutes
- Total execution time: 3.53 hours

**By Phase:**

| Phase                  | Plans | Total   | Avg/Plan |
| ---------------------- | ----- | ------- | -------- |
| 01-foundation-setup    | 2     | 13 min  | 6.5 min  |
| 02-authentication      | 2     | 187 min | 93.5 min |
| 03-evidence-foundation | 1     | 3 min   | 3 min    |

**Recent Trend:**

- Last 5 plans: 01-02 (6 min), 02-01 (28 min), 02-02 (159 min), 03-01 (3 min)
- Trend: Phase 3 started - evidence foundation data layer complete in 3 minutes (schema and CRUD queries)

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

Last session: 2026-03-12 (Phase 3 Plan 03-01 execution & completion)
Stopped at: Phase 3 Plan 1 complete - evidence data layer (schema, validation, CRUD) ready
Resume file: .planning/phases/03-evidence-foundation/03-01-SUMMARY.md
