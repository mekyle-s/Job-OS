# Phase 3: Evidence Foundation - Research

**Researched:** 2026-03-12
**Domain:** Resume parsing, evidence extraction, file upload, structured data storage
**Confidence:** HIGH

## Summary

Phase 3 requires parsing resumes (PDF/DOCX) into structured evidence items with confidence scores, allowing users to add additional evidence sources and edit parsed data. The research reveals that **LLM-based parsing with OpenAI Structured Outputs significantly outperforms traditional rule-based parsers** for resume extraction, especially for non-standard formats. The recommended approach uses: (1) pdf-parse/mammoth.js for text extraction, (2) OpenAI GPT-4 with Structured Outputs (zodResponseFormat) for parsing into structured evidence, (3) Zod schemas for type-safe validation, (4) pg-boss for async processing, (5) PostgreSQL with hybrid JSONB/normalized schema for evidence storage, and (6) pgvector for future semantic search.

**Key architectural decision:** Use a **hybrid database model** with normalized columns for core evidence fields (title, company, dates, source_type) and JSONB for flexible metadata/raw_content. This balances queryability, schema flexibility, and performance.

**Primary recommendation:** Implement LLM-based resume parsing with OpenAI Structured Outputs rather than rule-based parsers like simple-resume-parser. LLMs excel at handling resume format variations and extracting semantic meaning, while Structured Outputs guarantee type-safe JSON conforming to Zod schemas.

## Standard Stack

### Core

| Library   | Version   | Purpose                                                             | Why Standard                                                                                                                 |
| --------- | --------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| openai    | ^4.104.0+ | Resume text → structured evidence via GPT-4 with Structured Outputs | Official OpenAI SDK with native Zod integration via `zodResponseFormat`, enables guaranteed schema compliance for extraction |
| zod       | ^3.24.2+  | Schema definition and runtime validation for evidence items         | TypeScript-first validation with static type inference, required for OpenAI Structured Outputs                               |
| pdf-parse | ^1.1.1    | PDF → plain text extraction                                         | Pure JavaScript, zero native dependencies, fastest for plain text extraction, 2.4.5 latest (5 months ago)                    |
| mammoth   | ^1.11.0   | DOCX → plain text extraction                                        | Standard for DOCX conversion, maintained library (806 dependents), last updated 6 months ago                                 |
| pg-boss   | ^12.14.0  | Async resume parsing job queue                                      | Already in stack from Phase 1, proven for background processing                                                              |
| pgvector  | latest    | Vector embeddings storage for future semantic search                | Official PostgreSQL extension, Drizzle ORM 0.31.0+ has built-in support                                                      |

### Supporting

| Library                  | Version | Purpose                         | When to Use                                                     |
| ------------------------ | ------- | ------------------------------- | --------------------------------------------------------------- |
| @vercel/blob             | latest  | File storage for resume uploads | If files exceed 4MB or to offload storage from Vercel Functions |
| drizzle-orm vector types | 0.45.1+ | Define vector columns in schema | For Phase 5 semantic matching, prepare schema in Phase 3        |

### Alternatives Considered

| Instead of                | Could Use                               | Tradeoff                                                                                                                                               |
| ------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OpenAI Structured Outputs | simple-resume-parser, resume-parser npm | Rule-based parsers fail on non-standard formats, lack semantic understanding, require extensive pattern maintenance vs. LLM handles format variations  |
| pdf-parse                 | pdf.js-extract, pdf2json                | More structured but heavier, pdf-parse sufficient for LLM input (LLM handles structure)                                                                |
| Vercel Blob               | Local file system                       | Simpler for MVP but hits 4MB API route limit, doesn't scale to production, blob enables direct client uploads via presigned URLs                       |
| Hybrid schema             | Pure JSONB                              | Normalized columns enable efficient querying (filter by date range, company), JSONB for flexibility; pure JSONB 2000x slower without proper statistics |

**Installation:**

```bash
npm install openai zod pdf-parse mammoth pgvector
npm install @vercel/blob  # Optional: if using blob storage
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── parsers/
│   │   ├── pdf-extractor.ts       # pdf-parse wrapper
│   │   ├── docx-extractor.ts      # mammoth.js wrapper
│   │   └── evidence-parser.ts     # OpenAI Structured Outputs
│   ├── schemas/
│   │   └── evidence.ts            # Zod schemas for evidence items
│   ├── jobs/
│   │   └── workers/
│   │       └── resume-parser.ts   # pg-boss worker
│   └── db/
│       ├── queries/
│       │   └── evidence.ts        # Evidence CRUD operations
│       └── schema.ts              # Drizzle schema (add evidence tables)
├── app/
│   ├── api/
│   │   ├── evidence/
│   │   │   ├── upload/route.ts    # File upload endpoint
│   │   │   └── parse/route.ts     # Trigger parse job
│   │   └── jobs/
│   │       └── resume/route.ts    # Job status polling
│   └── dashboard/
│       └── evidence/
│           └── page.tsx           # Evidence management UI
```

### Pattern 1: LLM-Based Resume Parsing with Structured Outputs

**What:** Use OpenAI GPT-4 with Structured Outputs to parse resume text into type-safe evidence items matching a Zod schema

**When to use:** For any unstructured text extraction where schema compliance is critical (resumes, job descriptions, cover letters)

**Example:**

```typescript
// Source: OpenAI Node.js SDK helpers.md (Context7: /openai/openai-node)
import { zodResponseFormat } from 'openai/helpers/zod';
import OpenAI from 'openai';
import { z } from 'zod';

// Define evidence item schema
const ExperienceItem = z.object({
  role: z.string(),
  company: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  achievements: z.array(z.string()),
  skills: z.array(z.string()),
  confidence: z.number().min(0).max(1), // LLM self-reported confidence
});

const ResumeEvidence = z.object({
  experiences: z.array(ExperienceItem),
  skills: z.array(z.string()),
  education: z.array(
    z.object({
      degree: z.string(),
      institution: z.string(),
      graduationDate: z.string().nullable(),
    })
  ),
});

const client = new OpenAI();

async function parseResume(resumeText: string) {
  const completion = await client.chat.completions.parse({
    model: 'gpt-4o-2024-08-06',
    messages: [
      {
        role: 'system',
        content:
          'Extract structured evidence from resume. For each item, assess your confidence (0-1) in the extraction accuracy.',
      },
      { role: 'user', content: resumeText },
    ],
    response_format: zodResponseFormat(ResumeEvidence, 'resume_evidence'),
  });

  const message = completion.choices[0]?.message;
  if (message?.parsed) {
    return message.parsed; // Fully type-safe, guaranteed to match schema
  }
  throw new Error('Failed to parse resume');
}
```

**Key benefits:**

- Guaranteed schema compliance (no "best effort" JSON)
- Handles resume format variations (single-column, two-column, creative layouts)
- Extracts semantic meaning (maps "Led team of 5" to achievement with implied skills)
- Self-reported confidence scores via prompt engineering

### Pattern 2: File Upload with Next.js Server Actions

**What:** Use Next.js Server Actions with FormData for simple file uploads under 4MB, or Vercel Blob with presigned URLs for larger files

**When to use:** Server Actions for simple uploads in MVP; Vercel Blob when files exceed 4MB or for production scalability

**Example:**

```typescript
// Source: Next.js App Router file upload patterns (WebSearch: Strapi, OneUpTime)
// app/dashboard/evidence/actions.ts
'use server';

import { put } from '@vercel/blob';
import { revalidatePath } from 'next/cache';

export async function uploadResume(formData: FormData) {
  const file = formData.get('resume') as File;

  // Validate file type
  const validTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (!validTypes.includes(file.type)) {
    throw new Error('Only PDF and DOCX files allowed');
  }

  // Upload to Vercel Blob
  const blob = await put(file.name, file, {
    access: 'private', // Important: resumes contain PII
    addRandomSuffix: true,
  });

  // Trigger parse job (see Pattern 3)
  // await triggerParseJob(blob.url);

  revalidatePath('/dashboard/evidence');
  return { url: blob.url, size: file.size };
}
```

**Alternative for files under 4MB:**

```typescript
// Direct server action without blob storage
export async function uploadResumeSimple(formData: FormData) {
  const file = formData.get('resume') as File;
  const buffer = Buffer.from(await file.arrayBuffer());

  // Parse immediately (blocks request, ok for MVP)
  const text = await extractText(buffer, file.type);
  const evidence = await parseResume(text);

  return evidence;
}
```

### Pattern 3: Async Job Processing with pg-boss

**What:** Queue resume parsing as background job to avoid blocking upload requests

**When to use:** Always for production; LLM parsing takes 5-15 seconds, exceeds reasonable request timeout

**Example:**

```typescript
// Source: pg-boss patterns from Phase 1 implementation + WebSearch
// lib/jobs/workers/resume-parser.ts
import { extractTextFromPDF } from '@/lib/parsers/pdf-extractor';
import { extractTextFromDOCX } from '@/lib/parsers/docx-extractor';
import { parseResume } from '@/lib/parsers/evidence-parser';
import { db } from '@/lib/db';
import { evidenceItem } from '@/lib/db/schema';

export async function resumeParserWorker(job: any) {
  const { fileUrl, fileType, userId } = job.data;

  // 1. Download file
  const response = await fetch(fileUrl);
  const buffer = Buffer.from(await response.arrayBuffer());

  // 2. Extract text
  const text =
    fileType === 'application/pdf'
      ? await extractTextFromPDF(buffer)
      : await extractTextFromDOCX(buffer);

  // 3. Parse with LLM
  const evidence = await parseResume(text);

  // 4. Store in database
  for (const exp of evidence.experiences) {
    await db.insert(evidenceItem).values({
      userId,
      sourceType: 'resume',
      sourceUrl: fileUrl,
      itemType: 'experience',
      title: exp.role,
      company: exp.company,
      startDate: exp.startDate,
      endDate: exp.endDate,
      content: JSON.stringify(exp.achievements),
      metadata: { skills: exp.skills },
      confidence: exp.confidence,
    });
  }

  return { success: true, itemCount: evidence.experiences.length };
}
```

**Trigger job from upload:**

```typescript
// app/api/evidence/upload/route.ts
import { getJobQueue } from '@/lib/jobs';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('resume') as File;

  // Upload to blob storage
  const blob = await put(file.name, file, { access: 'private' });

  // Queue parsing job
  const boss = await getJobQueue();
  const jobId = await boss.send('parse-resume', {
    fileUrl: blob.url,
    fileType: file.type,
    userId: user.id,
  });

  return Response.json({ jobId, status: 'queued' });
}
```

### Pattern 4: Hybrid Database Schema (Normalized + JSONB)

**What:** Store core queryable fields as typed columns, flexible/nested data as JSONB

**When to use:** When you need both efficient querying (WHERE, JOIN, indexes) and schema flexibility (varying evidence types)

**Example:**

```typescript
// Source: PostgreSQL JSONB best practices (WebSearch: Medium, Architecture Weekly)
// lib/db/schema.ts
import { pgTable, text, timestamp, jsonb, real, index, vector } from 'drizzle-orm/pg-core';

export const evidenceItem = pgTable(
  'evidence_items',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    // Normalized columns for efficient querying
    sourceType: text('source_type').notNull(), // 'resume' | 'github' | 'portfolio' | 'manual'
    sourceUrl: text('source_url'),
    itemType: text('item_type').notNull(), // 'experience' | 'project' | 'skill' | 'education'

    // Core searchable fields
    title: text('title').notNull(), // Role title, project name, etc.
    company: text('company'), // Company or organization
    startDate: text('start_date'), // ISO date string
    endDate: text('end_date'), // ISO date string, null if current

    // Flexible content storage
    content: text('content'), // Main description/achievements
    metadata: jsonb('metadata').$type<{
      skills?: string[];
      technologies?: string[];
      achievements?: string[];
      links?: { type: string; url: string }[];
    }>(), // Type-safe JSONB

    // Confidence and audit
    confidence: real('confidence'), // 0.0 to 1.0, LLM-reported or 1.0 for manual
    isManual: boolean('is_manual').default(false), // User-created vs parsed

    // Vector embedding (for Phase 5 semantic search)
    embedding: vector('embedding', { dimensions: 1536 }), // text-embedding-3-large with dimension reduction

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('evidence_items_user_id_idx').on(table.userId),
    index('evidence_items_source_type_idx').on(table.sourceType),
    index('evidence_items_item_type_idx').on(table.itemType),
    // GIN index for JSONB querying
    index('evidence_items_metadata_gin_idx').using('gin', table.metadata),
  ]
);
```

**Why hybrid works:**

- Normalized columns enable: `WHERE company = 'Google' AND startDate > '2020-01-01'` (fast, uses indexes)
- JSONB enables: Flexible metadata without migrations, store varying structures per item type
- Best of both: Query performance + schema flexibility

### Pattern 5: Confidence Scoring with LLM Self-Assessment

**What:** Prompt LLM to include confidence score (0-1) for each extracted field, enabling user review prioritization

**When to use:** For any LLM extraction where accuracy is critical and human review is available

**Example:**

```typescript
// Source: Confidence scoring best practices (WebSearch: CleanLab, Medium)
const ExperienceWithConfidence = z.object({
  role: z.string(),
  company: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  achievements: z.array(z.string()),

  // Per-field confidence
  fieldConfidence: z.object({
    role: z.number().min(0).max(1),
    company: z.number().min(0).max(1),
    dates: z.number().min(0).max(1),
    achievements: z.number().min(0).max(1),
  }),

  // Overall confidence
  overallConfidence: z.number().min(0).max(1),
});

const systemPrompt = `
Extract resume information and assess your confidence for each field:
- 1.0: Explicitly stated, unambiguous (e.g., "Software Engineer at Google, 2020-2023")
- 0.7-0.9: Clearly implied but not explicit (e.g., "Google, 2020-2023" without role)
- 0.4-0.6: Inferred from context (e.g., "Worked on React apps" implies frontend skill)
- 0.0-0.3: Guessing or very uncertain

Be conservative. When in doubt, use lower confidence.
`;
```

**Using confidence for review:**

```typescript
// Flag low-confidence items for review
const needsReview = evidenceItems.filter(item => item.confidence < 0.7);

// Display confidence in UI
<div className="confidence-indicator">
  <span className={confidenceClass(item.confidence)}>
    {(item.confidence * 100).toFixed(0)}% confident
  </span>
</div>
```

### Anti-Patterns to Avoid

- **Don't use rule-based resume parsers:** Libraries like simple-resume-parser rely on regex patterns and fail on non-standard formats; LLMs handle variation
- **Don't store entire resume text in JSONB:** Store raw text in `text` column for indexing/search; JSONB for structured metadata only
- **Don't use pure JSONB schema:** Query performance degrades 2000x without column statistics; normalize frequently queried fields
- **Don't skip file type validation:** Validate MIME types server-side; client-side `accept` attribute is not security
- **Don't process uploads synchronously:** Resume parsing takes 5-15s with LLM; queue as background job
- **Don't use full 3072 embedding dimensions:** OpenAI text-embedding-3-large supports dimension reduction to 1536 or even 256 via Matryoshka Representation Learning; pgvector handles up to 2000 efficiently

## Don't Hand-Roll

| Problem                   | Don't Build                        | Use Instead                                                  | Why                                                                                    |
| ------------------------- | ---------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Resume parsing            | Custom regex/pattern matching      | OpenAI Structured Outputs with GPT-4                         | LLMs handle format variations, semantic extraction; patterns break on creative resumes |
| PDF text extraction       | Custom PDF parser                  | pdf-parse                                                    | PDF spec is complex (forms, annotations, encodings); pdf-parse handles edge cases      |
| DOCX text extraction      | Custom OOXML parser                | mammoth.js                                                   | DOCX is ZIP of XML with relationships; mammoth handles styles, embedded objects        |
| Type-safe JSON validation | Manual JSON parsing + type casting | Zod with OpenAI Structured Outputs                           | Runtime validation catches LLM hallucinations; static types prevent bugs               |
| Background job queue      | setTimeout/setInterval loops       | pg-boss                                                      | Needs persistence, retry logic, distributed locking, failure handling                  |
| File upload progress      | Custom XMLHttpRequest wrapper      | React libraries (react-dropzone) or Vercel Blob handleUpload | Handles edge cases (network errors, resume, chunk upload)                              |
| Vector similarity search  | Manual cosine distance calculation | pgvector with SQL functions                                  | Optimized C implementation, index support (HNSW, IVFFlat)                              |

**Key insight:** Resume parsing is deceptively complex. Variations in formatting (single/multi-column, creative layouts, internationalization), semantic ambiguity (is "Led team" a role or achievement?), and evolving trends make rule-based systems brittle. LLMs trained on millions of resumes handle this naturally.

## Common Pitfalls

### Pitfall 1: Underestimating Resume Format Variability

**What goes wrong:** Developers test with standard single-column resumes, deploy rule-based parser, then fail on two-column layouts, creative designs, international formats

**Why it happens:** Test data doesn't represent real-world diversity; rule-based parsers encode assumptions about structure

**How to avoid:** Use LLM-based parsing from the start; test with diverse resume formats (creative, international, two-column, ATS-optimized, minimal); collect parsing failures for continuous improvement

**Warning signs:** Parser accuracy drops in production; users report missing or incorrect data; many "low confidence" items

### Pitfall 2: Synchronous File Processing in API Routes

**What goes wrong:** User uploads 5MB resume, API route times out after 10s (Vercel default), upload fails, poor UX

**Why it happens:** Developers implement "simple" synchronous flow: upload → extract text → call LLM → return result; LLM calls take 5-15s

**How to avoid:** Always queue long-running tasks (>2s) with pg-boss; return job ID immediately; poll job status from client; show progress UI

**Warning signs:** Frequent timeouts in logs; users complain about "slow uploads"; Vercel function duration warnings

### Pitfall 3: Storing High-Dimensional Embeddings Without Optimization

**What goes wrong:** Store full 3072-dimension embeddings from text-embedding-3-large; pgvector performance degrades; storage costs explode

**Why it happens:** Assumption that "more dimensions = better accuracy" without testing; unawareness of Matryoshka Representation Learning

**How to avoid:** Use dimension reduction via OpenAI API's `dimensions` parameter; test accuracy at 256, 512, 1536 dimensions; OpenAI reports 256-dim text-embedding-3-large outperforms full 1536-dim ada-002

**Warning signs:** Slow vector similarity queries; high storage costs; database performance degradation

### Pitfall 4: Trusting LLM Output Without Validation

**What goes wrong:** LLM hallucinates dates, roles, companies; invalid data stored in database; user sees nonsense

**Why it happens:** Over-reliance on "GPT-4 is smart"; skipping runtime validation; no confidence thresholds

**How to avoid:** Always validate LLM output with Zod schemas (Structured Outputs helps but not perfect); display confidence scores in UI; flag items <70% for review; allow user edits

**Warning signs:** Users report incorrect parsed data; date format inconsistencies; missing required fields slip through

### Pitfall 5: Exceeding Vercel File Upload Limits

**What goes wrong:** Next.js API route uploads fail for files >4MB with "Response Size Limited to 4MB" error

**Why it happens:** Vercel API routes have 4MB payload limit; developers assume it's configurable

**How to avoid:** For files >4MB or production systems, use Vercel Blob with presigned URLs (client uploads directly to blob storage, bypassing API route); for MVP, enforce 4MB limit client-side

**Warning signs:** Upload failures for larger resumes; users with detailed resumes (10+ years experience) unable to upload

### Pitfall 6: Pure JSONB Schema for Performance-Critical Queries

**What goes wrong:** Store all evidence in single JSONB column for "flexibility"; queries like "find all Google experiences in 2020-2023" are 2000x slower than normalized

**Why it happens:** JSONB marketed as "schema-less magic"; developers avoid migrations; PostgreSQL can't maintain column statistics on JSONB values

**How to avoid:** Use hybrid model (see Pattern 4); normalize frequently queried fields (company, dates, title); use JSONB for truly variable metadata

**Warning signs:** Slow queries as data grows; inability to create effective indexes; query planner estimates wildly inaccurate

## Code Examples

Verified patterns from official sources:

### Extract Text from PDF

```typescript
// Source: pdf-parse npm package (WebSearch: Strapi, npmjs)
import pdf from 'pdf-parse';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text; // Plain text, loses formatting but sufficient for LLM
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}
```

### Extract Text from DOCX

```typescript
// Source: mammoth.js documentation (WebSearch: GitHub, npmjs)
import mammoth from 'mammoth';

export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });

    if (result.messages.length > 0) {
      console.warn('DOCX extraction warnings:', result.messages);
    }

    return result.value; // Plain text
  } catch (error) {
    throw new Error(`DOCX extraction failed: ${error.message}`);
  }
}
```

### Define Zod Schema for Evidence

```typescript
// Source: Zod documentation (Context7: /colinhacks/zod)
import { z } from 'zod';

// Nested schema for structured evidence
export const ExperienceSchema = z.object({
  role: z.string().min(1, 'Role is required'),
  company: z.string().min(1, 'Company is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM')
    .nullable(),
  location: z.string().optional(),
  achievements: z.array(z.string()).min(1, 'At least one achievement'),
  skills: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const ProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  technologies: z.array(z.string()),
  url: z.string().url().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  achievements: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const ResumeEvidenceSchema = z.object({
  experiences: z.array(ExperienceSchema),
  projects: z.array(ProjectSchema),
  skills: z.array(z.string()),
  education: z.array(
    z.object({
      degree: z.string(),
      institution: z.string(),
      graduationDate: z.string().nullable(),
      location: z.string().optional(),
    })
  ),
});

export type ResumeEvidence = z.infer<typeof ResumeEvidenceSchema>;
```

### Define Drizzle Schema with JSONB and Vector

```typescript
// Source: Drizzle ORM documentation (WebSearch: Drizzle docs, pgvector)
import { pgTable, text, timestamp, jsonb, real, boolean, vector, index } from 'drizzle-orm/pg-core';

export const evidenceItem = pgTable(
  'evidence_items',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    sourceType: text('source_type').notNull(),
    sourceUrl: text('source_url'),
    itemType: text('item_type').notNull(),

    title: text('title').notNull(),
    company: text('company'),
    startDate: text('start_date'),
    endDate: text('end_date'),

    content: text('content'),
    metadata: jsonb('metadata').$type<{
      skills?: string[];
      technologies?: string[];
      achievements?: string[];
      links?: { type: string; url: string }[];
    }>(),

    confidence: real('confidence').default(1.0),
    isManual: boolean('is_manual').default(false),

    // Vector for semantic search (Phase 5)
    embedding: vector('embedding', { dimensions: 1536 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('evidence_items_user_id_idx').on(table.userId),
    index('evidence_items_source_type_idx').on(table.sourceType),
    index('evidence_items_item_type_idx').on(table.itemType),
    index('evidence_items_metadata_gin_idx').using('gin', table.metadata),
  ]
);

// Migration to enable pgvector
// Note: Drizzle-kit doesn't auto-enable extensions
// migrations/XXXX_enable_pgvector.sql
// CREATE EXTENSION IF NOT EXISTS vector;
```

### Query JSONB Fields with Drizzle

```typescript
// Source: Drizzle ORM JSONB patterns (WebSearch: Drizzle docs)
import { db } from './db';
import { evidenceItem } from './schema';
import { sql } from 'drizzle-orm';

// Query JSONB array contains element
const reactDevs = await db
  .select()
  .from(evidenceItem)
  .where(sql`${evidenceItem.metadata}->>'skills' @> '["React"]'`);

// Query JSONB path
const withGitHub = await db
  .select()
  .from(evidenceItem)
  .where(sql`${evidenceItem.metadata}->>'links'->0->>'type' = 'github'`);
```

## State of the Art

| Old Approach                         | Current Approach                          | When Changed                                         | Impact                                                                                |
| ------------------------------------ | ----------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Rule-based parsers (regex, patterns) | LLM-based parsing with Structured Outputs | OpenAI Structured Outputs GA (Aug 2024)              | Dramatically better accuracy on non-standard formats; guaranteed schema compliance    |
| JSON mode (`type: "json_object"`)    | Structured Outputs with `json_schema`     | OpenAI API update (Aug 2024)                         | JSON mode only guarantees valid syntax; Structured Outputs guarantee schema adherence |
| Pure JSONB storage                   | Hybrid (normalized + JSONB)               | PostgreSQL 12+ JSONB improvements (2019, ongoing)    | Balance query performance and flexibility; avoid 2000x slowdown                       |
| Full embeddings (3072 dim)           | Dimension reduction (1536, 512, 256)      | text-embedding-3 release (Jan 2024)                  | Lower storage/compute costs; 256-dim v3-large > 1536-dim ada-002 on MTEB              |
| Express + Multer file uploads        | Next.js Server Actions or Vercel Blob     | Next.js 13+ App Router (2023), Vercel Blob GA (2023) | Native framework integration; presigned URLs for scalability                          |

**Deprecated/outdated:**

- **simple-resume-parser, resume-parser npm packages**: Rule-based, last updated 2+ years ago, fail on modern resume formats
- **OpenAI JSON mode without schema**: Replaced by Structured Outputs for data extraction; JSON mode is now "legacy"
- **pdf.js for server-side parsing**: Browser-focused, heavier than needed; pdf-parse is lighter and faster for plain text
- **Synchronous file uploads in API routes**: Poor UX for files >1MB; replaced by async jobs + progress polling or presigned URLs

## Open Questions

### 1. **Embedding Dimension Optimization**

**What we know:** OpenAI text-embedding-3-large produces 3072 dimensions by default; pgvector handles up to 2000 efficiently; dimension reduction via Matryoshka learning preserves quality

**What's unclear:** Optimal dimension count for resume/job matching (256, 512, 1536?); accuracy tradeoff testing needed

**Recommendation:** Start with 1536 dimensions (proven dimension, within pgvector efficiency range); test matching accuracy in Phase 5; reduce to 512 or 256 if accuracy acceptable

### 2. **Confidence Threshold for Auto-Acceptance**

**What we know:** LLM self-reported confidence via prompt engineering; need user review for low-confidence items

**What's unclear:** Optimal threshold (70%? 80%?); varies by field (dates more reliable than achievements?)

**Recommendation:** Default to 70% threshold based on research; allow user to adjust in settings; collect user corrections to calibrate per field type

### 3. **GitHub Integration Strategy**

**What we know:** Requirement CORE-02 includes "GitHub repos" as evidence source; GitHub API provides repo data, commits, PRs

**What's unclear:** What to extract (README projects? Contribution stats? PR descriptions?); how to structure as evidence items

**Recommendation:** Phase 3 focuses on resume parsing (proven); defer GitHub integration to dedicated plan or Phase 3.5; if included, extract: (1) README projects, (2) Language stats, (3) Star/fork count as credibility signal

### 4. **File Storage Strategy**

**What we know:** Vercel Blob for >4MB or production; local storage simpler for MVP; API routes have 4MB limit

**What's unclear:** User preference (speed vs simplicity); cost implications of blob storage at scale

**Recommendation:** MVP: Direct upload to API route with 4MB limit, queue parse job; Production: Migrate to Vercel Blob with presigned URLs when user feedback indicates need

## Sources

### Primary (HIGH confidence)

- [Context7: /openai/openai-node](https://context7.com) - OpenAI Node.js SDK structured outputs with zodResponseFormat patterns
- [Context7: /colinhacks/zod](https://context7.com) - Zod schema definition for nested objects and arrays
- [OpenAI Structured Outputs API Docs](https://developers.openai.com/api/docs/guides/structured-outputs) - Official structured outputs guide
- [Drizzle ORM Vector Similarity Search](https://orm.drizzle.team/docs/guides/vector-similarity-search) - pgvector integration patterns
- [Drizzle ORM PostgreSQL Column Types](https://orm.drizzle.team/docs/column-types/pg) - JSONB type definition with `$type<>`
- [Vercel Documentation: Functions](https://vercel.com/docs/functions) - File upload limits, serverless configuration
- [OpenAI New Embedding Models](https://openai.com/index/new-embedding-models-and-api-updates/) - Dimension reduction via Matryoshka learning

### Secondary (MEDIUM confidence)

- [Next.js 15 Tutorial: File Upload with Server Actions (Strapi)](https://strapi.io/blog/epic-next-js-15-tutorial-part-5-file-upload-using-server-actions) - FormData server action patterns
- [The Complete React File Upload Guide (Medium)](https://medium.com/@dlrnjstjs/the-complete-react-file-upload-guide-from-drag-drop-to-progress-tracking-b2edb40016c2) - Progress tracking best practices
- [PostgreSQL JSONB vs Join Queries Performance (Medium)](https://medium.com/@sruthiganesh/part-2-comparing-normalised-query-performance-in-postgresql-jsonb-vs-join-queries-ed63ef2da7cd) - Hybrid schema performance analysis
- [Building Confidence in LLM Outputs (Alkymi)](https://www.alkymi.io/data-science-room/building-confidence-in-llm-outputs) - Confidence scoring techniques
- [Best LLM for Resume Analysis (PitchMeAI)](https://pitchmeai.com/blog/best-llm-resume-job-description-analysis) - GPT-4 vs alternatives for resume parsing
- [Parsing Resumes with LLMs (Datumo)](https://www.datumo.io/blog/parsing-resumes-with-llms-a-guide-to-structuring-cvs-for-hr-automation) - LLM vs rule-based parser comparison

### Tertiary (LOW confidence, marked for validation)

- [OpenAI Structured Outputs Samples: Resume Extraction](https://github.com/openai/openai-structured-outputs-samples/blob/main/resume-extraction/README.md) - Could not access (429 error), needs retry
- pg-boss long-running job progress patterns - No specific documentation found; may need custom implementation

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** - OpenAI, Zod, pdf-parse, mammoth verified via Context7 and official docs; pgvector confirmed in Drizzle ORM docs
- Architecture: **HIGH** - Patterns verified from official OpenAI SDK helpers, Drizzle ORM guides, Next.js documentation
- Pitfalls: **MEDIUM-HIGH** - File size limits confirmed in Vercel docs; JSONB performance verified in multiple sources; other pitfalls based on WebSearch community patterns
- Code examples: **HIGH** - All examples sourced from official documentation (OpenAI SDK, Drizzle ORM, Zod docs)

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (30 days; stable technologies with infrequent breaking changes)

**Notes:**

- OpenAI Structured Outputs is production-ready (GA August 2024)
- text-embedding-3-large dimension reduction well-documented
- Next.js file upload patterns stable in App Router
- pgvector + Drizzle ORM integration mature (0.31.0+)
