# Roadmap: Internship OS - Proof Queue

## Overview

This roadmap delivers a proof-first internship application platform through six phases: foundation setup, authentication infrastructure, evidence extraction and storage, job data pipeline, intelligent matching engine, and application tracking with notifications. Each phase builds on the previous, following the critical dependency path from user identity to proof assembly to requirement mapping to actionable insights.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation Setup** - Project scaffolding and infrastructure
- [ ] **Phase 2: Authentication** - User accounts and session management
- [ ] **Phase 3: Evidence Foundation** - Resume parsing and evidence extraction
- [ ] **Phase 4: Job Data Pipeline** - Job monitoring and requirement extraction
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
   **Plans**: TBD

Plans:

- [ ] 02-01: [TBD during planning]

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
   **Plans**: TBD

Plans:

- [ ] 03-01: [TBD during planning]

### Phase 4: Job Data Pipeline

**Goal**: System monitors job sources and extracts structured requirements
**Depends on**: Phase 2
**Requirements**: SUPP-04, SUPP-05, SUPP-06, CORE-05
**Success Criteria** (what must be TRUE):

1. User can define target criteria (function, location, visa status, companies)
2. System fetches roles from supported sources matching user criteria
3. User can view job listings with title, company, location, and freshness indicator
4. Job postings display extracted requirements with confidence scores
   **Plans**: TBD

Plans:

- [ ] 04-01: [TBD during planning]

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
   **Plans**: TBD

Plans:

- [ ] 05-01: [TBD during planning]

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
   **Plans**: TBD

Plans:

- [ ] 06-01: [TBD during planning]

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase                       | Plans Complete | Status      | Completed  |
| --------------------------- | -------------- | ----------- | ---------- |
| 1. Foundation Setup         | 2/2            | ✓ Complete  | 2026-03-09 |
| 2. Authentication           | 0/?            | Not started | -          |
| 3. Evidence Foundation      | 0/?            | Not started | -          |
| 4. Job Data Pipeline        | 0/?            | Not started | -          |
| 5. Matching Core            | 0/?            | Not started | -          |
| 6. Tracking & Notifications | 0/?            | Not started | -          |
