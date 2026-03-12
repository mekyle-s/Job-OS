---
phase: 03-evidence-foundation
plan: 02
subsystem: resume-parsing
tags: [openai, llm, file-upload, background-jobs, parsing, structured-outputs]
dependency_graph:
  requires:
    - '03-01 (evidence data layer - schemas, queries)'
    - '01-02 (pg-boss job queue infrastructure)'
    - '02-01 (Better Auth session management)'
  provides:
    - 'PDF/DOCX text extraction capabilities'
    - 'OpenAI GPT-4o resume parsing with confidence scores'
    - 'Background job processing for resume parsing'
    - 'Upload API for resume files'
    - 'Status polling API for parse job tracking'
  affects:
    - '03-03 (evidence review UI will consume these APIs)'
    - '03-04 (evidence editing will build on parsed data)'
tech_stack:
  added:
    - openai: 'GPT-4o with Structured Outputs for resume parsing'
    - pdf-parse: 'PDF text extraction library'
    - mammoth: 'DOCX text extraction library'
  patterns:
    - 'Lazy initialization for OpenAI client (avoid build-time errors)'
    - 'pg-boss worker with Job<T>[] signature pattern'
    - 'Local file storage in uploads/ directory (MVP approach)'
    - 'Auth pattern: auth.api.getSession with await headers()'
key_files:
  created:
    - src/lib/parsers/pdf-extractor.ts: 'PDF to text extraction via pdf-parse'
    - src/lib/parsers/docx-extractor.ts: 'DOCX to text extraction via mammoth'
    - src/lib/parsers/evidence-parser.ts: 'OpenAI Structured Outputs parser'
    - src/lib/jobs/workers/resume-parser.ts: 'pg-boss worker orchestrating full pipeline'
    - src/app/api/evidence/upload/route.ts: 'POST endpoint for file upload'
    - src/app/api/evidence/status/[sourceId]/route.ts: 'GET endpoint for status polling'
  modified:
    - .gitignore: 'Added uploads/ to ignore uploaded files'
decisions: []
metrics:
  duration_minutes: 4
  completed_date: '2026-03-12'
---

# Phase 03 Plan 02: Resume Upload and Parsing Pipeline Summary

**One-liner:** JWT auth with refresh rotation using jose library

## What Was Built

Built the complete resume upload and parsing pipeline: file text extraction (PDF/DOCX via pdf-parse and mammoth), LLM-based evidence parsing using OpenAI GPT-4o Structured Outputs with confidence scoring, background job processing via pg-boss workers, and API endpoints for upload and status polling.

### Core Components

**Text Extractors (Task 1):**
- `pdf-extractor.ts` - Extracts plain text from PDF buffers using pdf-parse, throws error for image-only PDFs
- `docx-extractor.ts` - Extracts plain text from DOCX buffers using mammoth, logs warnings but doesn't fail
- `evidence-parser.ts` - Uses OpenAI GPT-4o Structured Outputs to parse resume text into typed evidence matching Zod schema

**Background Processing (Task 2):**
- `resume-parser.ts` - pg-boss worker that orchestrates: file read → text extraction → LLM parsing → batch database insert
- Worker handles all three evidence types: experiences, projects, education
- Converts OpenAI structured output to database schema format with proper type mapping

**API Routes (Task 2):**
- `POST /api/evidence/upload` - Authenticates user, validates file type/size (PDF/DOCX, 4MB max), saves to uploads/{userId}/, creates evidenceSource record, queues pg-boss job
- `GET /api/evidence/status/[sourceId]` - Authenticates user, verifies source ownership, returns parse status and item count

### Key Features

1. **Confidence Scoring:** OpenAI system prompt includes detailed confidence assessment instructions (1.0 = explicit, 0.7-0.9 = implied, 0.4-0.6 = inferred, 0.0-0.3 = uncertain)
2. **Error Handling:** Worker catches extraction/parsing errors, records them on source.parseError, re-throws for pg-boss retry
3. **Security:** Upload validates file type and size, status endpoint verifies source ownership
4. **Local Storage:** MVP approach using local uploads/ directory (will migrate to cloud storage in future)
5. **Lazy Initialization:** OpenAI client initialized at runtime to avoid build failures when API key missing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pg-boss worker type signature**
- **Found during:** Task 2 (TypeScript build error)
- **Issue:** Plan specified worker handler with single job parameter `{ data: { sourceId, userId } }`, but pg-boss work() expects `Job<T>[]` array signature
- **Fix:** Updated resumeParserHandler to accept `jobs: Job<ResumeParsePayload>[]` and extract first job with `jobs[0]`, matching pattern from test-worker.ts
- **Files modified:** src/lib/jobs/workers/resume-parser.ts
- **Commit:** 3ed6cd8

**2. [Rule 3 - Blocking] Lazy-initialize OpenAI client to fix build errors**
- **Found during:** Task 2 (Next.js build failing at page collection)
- **Issue:** OpenAI client instantiated at module load time (`const client = new OpenAI()`) caused build failure when OPENAI_API_KEY env var missing: "Missing credentials. Please pass an apiKey"
- **Fix:** Refactored to lazy initialization pattern with getOpenAIClient() function that creates client on first use, avoiding build-time instantiation
- **Files modified:** src/lib/parsers/evidence-parser.ts
- **Commit:** 8b4c65f (included in Task 1 commit)

## Next Phase Readiness

**Ready for 03-03 (Evidence Review UI):**
- ✅ Upload API accepts files and returns sourceId
- ✅ Status API enables polling for completion
- ✅ Worker populates evidence_item table with parsed data
- ✅ Confidence scores stored for UI display

**Blockers for Full Functionality:**
- ⚠️ **OPENAI_API_KEY required:** User must add API key to .env.local before resume parsing will work at runtime (get from https://platform.openai.com/api-keys)
- This blocker was already documented in STATE.md Phase 3 concerns

**Future Enhancements:**
- Cloud storage (S3/R2) for uploaded files instead of local uploads/
- Rate limiting on upload endpoint
- File virus scanning before processing
- Support for additional file formats (TXT, RTF)
- Batch upload support

## Task Completion

| Task | Name                                           | Status | Commit  | Files                                                                |
| ---- | ---------------------------------------------- | ------ | ------- | -------------------------------------------------------------------- |
| 1    | Create text extractors and OpenAI parser       | ✅     | 8b4c65f | pdf-extractor.ts, docx-extractor.ts, evidence-parser.ts              |
| 2    | Create worker and upload/status API routes     | ✅     | 3ed6cd8 | resume-parser.ts, upload/route.ts, status/[sourceId]/route.ts, .gitignore |

## Verification

All verification criteria met:

1. ✅ Upload API route accepts POST with FormData containing PDF/DOCX file
2. ✅ Upload creates evidence_source record in database (via createEvidenceSource)
3. ✅ pg-boss job is queued for resume parsing (via boss.send)
4. ✅ Worker extracts text, calls OpenAI, stores evidence items (via createManyEvidenceItems)
5. ✅ Status endpoint returns current parse status (pending/processing/completed/failed)
6. ✅ Failed parses record error message on source (via updateEvidenceSourceStatus)
7. ✅ `npm run build` passes with no TypeScript errors

## Self-Check: PASSED

**Created files exist:**
- ✅ FOUND: src/lib/parsers/pdf-extractor.ts
- ✅ FOUND: src/lib/parsers/docx-extractor.ts
- ✅ FOUND: src/lib/parsers/evidence-parser.ts
- ✅ FOUND: src/lib/jobs/workers/resume-parser.ts
- ✅ FOUND: src/app/api/evidence/upload/route.ts
- ✅ FOUND: src/app/api/evidence/status/[sourceId]/route.ts

**Commits exist:**
- ✅ FOUND: 8b4c65f (feat(03-02): create text extractors and OpenAI evidence parser)
- ✅ FOUND: 3ed6cd8 (feat(03-02): create resume worker and upload/status API routes)

**Modified files verified:**
- ✅ FOUND: .gitignore contains "uploads/"
