---
phase: 03-evidence-foundation
plan: 01
subsystem: database
tags: [drizzle, postgres, zod, evidence, schema, crud]

# Dependency graph
requires:
  - phase: 01-foundation-setup
    provides: Database connection, Drizzle ORM setup, migration tooling
  - phase: 02-authentication
    provides: User table with text IDs for foreign key references

provides:
  - Evidence database schema with evidenceSource and evidenceItem tables
  - Zod validation schemas for resume parsing output and CRUD operations
  - Typed CRUD query functions for evidence sources and items
  - Foundation for evidence upload, parsing, and manual entry features

affects: [03-02-resume-upload-parsing, 03-03-evidence-ui, 03-04-manual-entry, 04-job-aggregation, 05-proof-graph]

# Tech tracking
tech-stack:
  added: [openai, zod, pdf-parse, mammoth, @types/pdf-parse]
  patterns:
    - Evidence storage pattern - sourceId links items to upload source, null for manual entries
    - User-scoped CRUD queries - all queries verify userId to prevent cross-user access
    - Metadata JSONB pattern - flexible structured data for skills, technologies, achievements
    - Parse status tracking - pending/processing/completed/failed lifecycle for async parsing

key-files:
  created:
    - src/lib/db/schema.ts (evidenceSource and evidenceItem tables)
    - src/lib/schemas/evidence.ts (Zod schemas for parsing and validation)
    - src/lib/db/queries/evidence.ts (CRUD query functions)
    - migrations/0002_material_mister_fear.sql (evidence tables migration)
  modified:
    - .env.example (added OPENAI_API_KEY)
    - package.json (added evidence parsing dependencies)

key-decisions:
  - "Use singular table names (evidence_source, evidence_item) for consistency with Better Auth convention (DEV-012)"
  - "Defer vector/embedding columns to Phase 5 - not needed until semantic search implementation"
  - "Use crypto.randomUUID() for ID generation (consistent with Better Auth text ID pattern from DEV-008)"
  - "Store metadata as JSONB for flexibility - skills, technologies, achievements, links, location, GPA"
  - "Track parse status (pending/processing/completed/failed) to support async resume parsing workflow"

patterns-established:
  - "Evidence source pattern: Track uploaded files separately from parsed items, allowing re-parsing and source provenance"
  - "Confidence scoring: 0.0-1.0 range for LLM extraction confidence, defaults to 1.0 for manual entries"
  - "User-scoped queries: All CRUD operations verify userId to prevent unauthorized access"
  - "Batch insert for parsed data: createManyEvidenceItems() for efficient bulk inserts from resume parsing"

# Metrics
duration: 3min
completed: 2026-03-12
---

# Phase 03 Plan 01: Evidence Foundation Data Layer Summary

**Evidence storage foundation with PostgreSQL tables, Zod validation, and user-scoped CRUD queries for resume parsing and manual entry**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-12T09:06:51Z
- **Completed:** 2026-03-12T09:09:46Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Created evidenceSource and evidenceItem tables with proper foreign keys and indexes
- Implemented Zod schemas for resume parsing output (experiences, projects, skills, education)
- Built typed CRUD query functions for evidence sources and items with user-scoping
- Installed OpenAI SDK and file parsing libraries (pdf-parse, mammoth) for Phase 03-02
- Applied migration successfully to PostgreSQL database

## Task Commits

Each task was committed atomically:

1. **Task 1: Create evidence database schema and run migration** - `d29b2b5` (feat)
2. **Task 2: Create Zod validation schemas and evidence CRUD queries** - `988c364` (feat)

## Files Created/Modified

- `src/lib/db/schema.ts` - Added evidenceSource and evidenceItem table definitions
- `src/lib/schemas/evidence.ts` - Zod schemas for resume parsing and CRUD validation
- `src/lib/db/queries/evidence.ts` - User-scoped CRUD functions for evidence management
- `migrations/0002_material_mister_fear.sql` - Database migration for evidence tables
- `.env.example` - Added OPENAI_API_KEY for resume parsing
- `package.json` - Added openai, zod, pdf-parse, mammoth, @types/pdf-parse

## Decisions Made

**DEV-013: Defer vector/embedding columns to Phase 5**

- Rationale: Evidence tables don't need embedding columns until semantic search is implemented. Adding them now would be premature optimization and increase schema complexity.
- Impact: Phase 5 will add embedding columns via migration when actually needed for proof graph search.

**Pattern: Evidence source linkage**

- Rationale: Separating evidence sources (uploaded files) from evidence items (parsed entries) allows re-parsing, tracking parse status, and maintaining source provenance.
- Implementation: evidenceItem.sourceId references evidenceSource.id with onDelete: 'set null' - manual entries have null sourceId.

## Deviations from Plan

None - plan executed exactly as written. Previous agent (a8105b9) had already completed schema modifications and package installations before encountering Docker checkpoint.

## Issues Encountered

**Authentication gate: Docker Desktop not running**

- **Found during:** Task 1 migration application (previous agent session)
- **Issue:** `npx drizzle-kit migrate` failed because Docker container was not running
- **Resolution:** Previous agent returned checkpoint, user started Docker Desktop, continuation agent (this session) verified Docker was running and completed migration successfully
- **Verification:** `npm run db:up` succeeded, migration applied cleanly, tables verified in database

## User Setup Required

**External services require manual configuration.** User must:

1. **OpenAI API Key** (for resume parsing in Plan 03-02)
   - Get API key: https://platform.openai.com/api-keys
   - Add to `.env.local`: `OPENAI_API_KEY=sk-your-key-here`
   - Used for LLM-based structured resume parsing

No dashboard configuration needed.

**Verification:**

```bash
# After adding OPENAI_API_KEY to .env.local
npm run build  # Should pass without errors
```

## Next Phase Readiness

**Ready for Plan 03-02 (Resume Upload & Parsing):**

- ✓ Database tables exist for storing evidence sources and items
- ✓ Zod schemas ready for validating parsed resume data
- ✓ CRUD queries available for creating sources and bulk inserting items
- ✓ OpenAI SDK installed for structured parsing
- ✓ File parsing libraries (pdf-parse, mammoth) installed
- ✓ OPENAI_API_KEY documented in .env.example

**Ready for Plan 03-03 (Evidence UI):**

- ✓ CRUD queries available for listing, viewing, editing, deleting evidence
- ✓ User-scoped queries prevent unauthorized access

**Ready for Plan 03-04 (Manual Entry):**

- ✓ CRUD queries support manual entry with isManual flag
- ✓ Zod validation schemas for form validation

**Blocker:** User must add OPENAI_API_KEY to .env.local before resume parsing will work in Plan 03-02.

## Self-Check: PASSED

✓ All key files exist:

- src/lib/db/schema.ts
- src/lib/schemas/evidence.ts
- src/lib/db/queries/evidence.ts
- migrations/0002_material_mister_fear.sql

✓ All commits exist:

- d29b2b5 (Task 1)
- 988c364 (Task 2)

✓ Database tables verified:

- evidence_source table exists in PostgreSQL
- evidence_item table exists in PostgreSQL

---

_Phase: 03-evidence-foundation_
_Completed: 2026-03-12_
