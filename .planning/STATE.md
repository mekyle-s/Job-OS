# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-08)

**Core value:** Students instantly know which fresh internships are worth their time and exactly how to prove they fit - requirement by requirement - so they apply to fewer roles with higher confidence and better-tailored evidence.
**Current focus:** Phase 1 - Foundation Setup (COMPLETE ✓)

## Current Position

Phase: 2 of 6 (Authentication) — IN PROGRESS
Plan: 1 of 2 in current phase
Status: Plan 02-01 complete, ready for Plan 02-02
Last activity: 2026-03-09 — Completed 02-01-PLAN.md (Better Auth Backend)

Progress: [██████████░░░░░░░░] 50% (Phase 2: 1 of 2 plans complete)

## Performance Metrics

**Velocity:**

- Total plans completed: 3
- Average duration: 15.7 minutes
- Total execution time: 0.78 hours

**By Phase:**

| Phase               | Plans | Total  | Avg/Plan |
| ------------------- | ----- | ------ | -------- |
| 01-foundation-setup | 2     | 13 min | 6.5 min  |
| 02-authentication   | 1     | 28 min | 28 min   |

**Recent Trend:**

- Last 5 plans: 01-01 (7 min), 01-02 (6 min), 02-01 (28 min)
- Trend: Phase 2 in progress (1 of 2 complete)

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

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 1:** Need to validate Docling integration (newer tool with limited production case studies) during planning. Fallback: pdf-parse for basic extraction, manual entry for complex cases.

**Phase 3:** Embedding dimension optimization needed - pgvector supports up to 2000 dimensions efficiently but OpenAI text-embedding-3-large produces 3072. May need dimension reduction or different embedding model.

**Phase 4:** Job board API access validation needed - Indeed and LinkedIn have strict requirements. May need to start with smaller boards or user-submitted URLs in V1.

**Phase 5:** Confidence threshold calibration (85%+ for auto-accept, 70-85% for review, <70% quarantine) needs validation with real data. Plan A/B testing during Phase 5.

## Session Continuity

Last session: 2026-03-09 (Phase 2 Plan 02-01 execution & completion)
Stopped at: Plan 02-01 complete, ready for Plan 02-02 (Auth UI Pages)
Resume file: .planning/phases/02-authentication/02-01-SUMMARY.md
