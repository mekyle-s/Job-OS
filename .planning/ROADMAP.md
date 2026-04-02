# Roadmap: Internship OS - Proof Queue

## Overview

This roadmap delivers a proof-first internship application platform through six phases: foundation setup, authentication infrastructure, evidence extraction and storage, job data pipeline, intelligent matching engine, and application tracking with notifications. Each phase builds on the previous, following the critical dependency path from user identity to proof assembly to requirement mapping to actionable insights.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation Setup** - Project scaffolding and infrastructure
- [x] **Phase 2: Authentication** - User accounts and session management
- [x] **Phase 3: Evidence Foundation** - Resume parsing and evidence extraction
- [x] **Phase 4: Job Data Pipeline** - Job monitoring and requirement extraction
- [ ] **Phase 5: Matching Core** - Proof-based ranking and role briefs
- [ ] **Phase 6: Tracking & Notifications** - Application tracking and alerts

## Phase Details

### Phase 1: Foundation Setup

**Goal**: Development environment ready with database, job queue, and deployment infrastructure
**Depends on**: Nothing (first phase)
**Requirements**: (Infrastructure - no explicit requirements, enables all others)
**Success Criteria** (what must be TRUE):

1. Developer can run the application locally with hot reload
2. Database schema is deployed and migrations run successfully
3. Background job queue processes test jobs
4. Application deploys to staging environment
   **Plans**: 2 plans in 2 waves

Plans:

- [x] 01-01-PLAN.md — Project scaffolding, Docker Compose PostgreSQL, Drizzle ORM + schema + migrations
- [x] 01-02-PLAN.md — pg-boss job queue with test worker, health check endpoint, build verification

### Phase 2: Authentication

**Goal**: Users can securely create accounts and manage sessions
**Depends on**: Phase 1
**Requirements**: SUPP-01, SUPP-02, SUPP-03
**Success Criteria** (what must be TRUE):

1. User can create account with email and password
2. User can log in and session persists across browser refresh
3. User can log out from any page
4. User can reset forgotten password via email link
   **Plans**: 2 plans in 2 waves

Plans:

- [x] 02-01-PLAN.md — Better Auth backend: schema migration, server/client config, Resend email, API route
- [x] 02-02-PLAN.md — Auth UI: sign-up/sign-in/sign-out pages, password reset, middleware, protected dashboard

### Phase 3: Evidence Foundation

**Goal**: Users can upload resumes and build structured evidence banks
**Depends on**: Phase 2
**Requirements**: CORE-01, CORE-02, CORE-03, CORE-04
**Success Criteria** (what must be TRUE):

1. User can upload resume (PDF or DOCX) and see parsing progress
2. Parsed resume displays as structured evidence items with confidence scores
3. User can add evidence sources (GitHub repos, portfolio links, manual projects)
4. User can edit or delete parsed evidence items
5. Evidence items show source excerpts and extraction confidence
   **Plans**: 4 plans in 3 waves

Plans:

- [x] 03-01-PLAN.md — Evidence database schema, Zod validation schemas, and CRUD query functions
- [x] 03-02-PLAN.md — Resume text extraction (PDF/DOCX), OpenAI LLM parsing, pg-boss worker, upload/status API routes
- [x] 03-03-PLAN.md — Evidence management UI: list, manual add, edit, delete with confidence badges
- [x] 03-04-PLAN.md — Upload UI with drag-and-drop, parse status polling, end-to-end verification

### Phase 4: Job Data Pipeline

**Goal**: System monitors job sources and extracts structured requirements
**Depends on**: Phase 2
**Requirements**: SUPP-04, SUPP-05, SUPP-06, CORE-05
**Success Criteria** (what must be TRUE):

1. User can define target criteria (function, location, visa status, companies)
2. System fetches roles from supported sources matching user criteria
3. User can view job listings with title, company, location, and freshness indicator
4. Job postings display extracted requirements with simple review states (not confidence scores)
   **Plans**: 5 plans in 5 waves

Plans:

- [x] 04-01-PLAN.md -- Database schema, Zod validation, and CRUD queries for jobs, requirements, and user criteria
- [x] 04-02-PLAN.md -- Source adapter interface, Greenhouse adapter, and conservative LLM requirement extractor
- [x] 04-03-PLAN.md -- pg-boss workers for job polling and requirement extraction, Vercel Cron endpoint
- [x] 04-04-PLAN.md -- REST API routes for criteria, jobs, and requirement management
- [x] 04-05-PLAN.md -- UI pages for criteria setup, job listings, and job detail with requirement editing

### Phase 5: Matching Core

**Goal**: Users see ranked opportunities with requirement-level proof mapping
**Depends on**: Phase 3, Phase 4
**Requirements**: CORE-06, CORE-07, CORE-08, CORE-09, CORE-10, CORE-11, CORE-12
**Success Criteria** (what must be TRUE):

1. User sees Fresh Match Queue ranked by fit, freshness, and evidence coverage
2. Each role card shows fit score, evidence coverage percentage, and next action
3. User can open role brief showing requirement-to-evidence mapping
4. Role brief displays gaps (requirements with no supporting evidence)
5. Role brief shows recommended emphasis based on strongest evidence
6. User can manually edit or remove evidence mappings for any requirement
7. Changes to evidence or mappings update rankings in real-time
   **Plans**: 4 plans in 4 waves

Plans:

- [ ] 05-01-PLAN.md — Schema migration: vector embedding columns, HNSW indexes, evidence mapping tables, version constants, Zod schemas
- [ ] 05-02-PLAN.md — Matching engine: embedder, eligibility filters, vector similarity, LLM mapper, ranker, gap analyzer, pipeline orchestrator
- [ ] 05-03-PLAN.md — API routes: matching trigger, queue, brief, mapping CRUD + TanStack Query provider and hooks
- [ ] 05-04-PLAN.md — UI: Fresh Match Queue page with role cards, Role Brief page with proof mapping and mapping controls

### Phase 6: Tracking & Notifications

**Goal**: Users can track application progress and receive alerts for high-fit roles
**Depends on**: Phase 5
**Requirements**: SUPP-07, SUPP-08, SUPP-09, SUPP-10
**Success Criteria** (what must be TRUE):

1. User can mark role status (Ignore, Save, Apply, Applied)
2. User can filter queue by role status
3. User can export proof summary for a specific role
4. User receives email alert when new high-fit role appears in queue
5. System logs parser confidence and user corrections for audit
   **Plans**: 3 plans in 3 waves

Plans:

- [ ] 06-01-PLAN.md — Role status + audit schema, migration, Zod validation, CRUD queries
- [ ] 06-02-PLAN.md — Role status API routes, React Email template, notification worker, cron endpoint
- [ ] 06-03-PLAN.md — Queue status filters (nuqs), role card status buttons, print-optimized export page

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase                       | Plans Complete | Status      | Completed  |
| --------------------------- | -------------- | ----------- | ---------- |
| 1. Foundation Setup         | 2/2            | ✓ Complete  | 2026-03-09 |
| 2. Authentication           | 2/2            | ✓ Complete  | 2026-03-09 |
| 3. Evidence Foundation      | 4/4            | ✓ Complete  | 2026-03-12 |
| 4. Job Data Pipeline        | 5/5            | ✓ Complete  | 2026-03-14 |
| 5. Matching Core            | 0/?            | Not started | -          |
| 6. Tracking & Notifications | 0/?            | Not started | -          |
