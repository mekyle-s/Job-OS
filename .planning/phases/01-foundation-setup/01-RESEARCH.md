# Phase 1: Foundation Setup - Research

**Researched:** 2026-03-09
**Domain:** Full-stack Next.js application infrastructure with PostgreSQL database, job queue, and deployment
**Confidence:** HIGH

## Summary

Phase 1 establishes a modern Next.js 15 development environment with TypeScript, PostgreSQL database with pgvector for embeddings, a PostgreSQL-backed job queue, and Vercel deployment infrastructure. The recommended stack leverages Next.js's built-in capabilities for API routes and server actions, Drizzle ORM for type-safe database operations with schema-first migrations, and pg-boss for reliable job processing without requiring separate infrastructure like Redis.

The architecture prioritizes developer experience with hot module reload, type safety end-to-end, and minimal infrastructure complexity by using PostgreSQL as both the primary database and job queue backend. This "single database" approach simplifies operations, backups, and local development while providing production-grade reliability through PostgreSQL's ACID guarantees.

**Primary recommendation:** Use Next.js 15 App Router with TypeScript, Drizzle ORM for PostgreSQL with pgvector extension, pg-boss for job queue (PostgreSQL-backed, no Redis), and deploy to Vercel with environment-based staging/preview/production workflows.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x (latest) | Full-stack React framework | Official Vercel framework, best DX, built-in API routes, server actions, optimal Vercel deployment |
| TypeScript | 5.x | Type safety | Industry standard, catches errors at compile time, excellent IDE support |
| Drizzle ORM | Latest | Database ORM and migrations | Type-safe, SQL-like API, best-in-class PostgreSQL support, schema-first migrations |
| node-postgres (pg) | Latest | PostgreSQL driver | Official Node.js PostgreSQL client, connection pooling, used by Drizzle |
| pg-boss | 12.x | Job queue | PostgreSQL-backed (no Redis), SKIP LOCKED for reliability, exactly-once delivery |
| pgvector | 0.8.x | Vector embeddings | Official PostgreSQL extension for vector similarity search, supports up to 2000 dimensions indexed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-kit | Latest | Migration CLI tool | Schema generation, migration management, database introspection |
| ESLint | Latest | Code linting | Enforce code quality, Next.js includes eslint-config-next |
| Prettier | Latest | Code formatting | Consistent formatting, pair with eslint-config-prettier |
| Husky | Latest | Git hooks | Pre-commit linting, prevent broken commits |
| lint-staged | Latest | Staged file linting | Run linters only on changed files for performance |
| dotenv | Latest | Environment management | Load .env files, built into Next.js but useful for drizzle-kit config |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Drizzle ORM | Prisma | Prisma has larger community but slower performance, less SQL-like, migration model differs |
| pg-boss | BullMQ + Redis | BullMQ faster (8300 vs 4400 jobs/sec peak) but requires Redis infrastructure, operational complexity |
| pgvector | Pinecone/Weaviate | External vector DB has better scale (billions) but adds cost, latency, complexity; pgvector sufficient for millions |
| Vercel | Self-hosted Docker | More control but lose zero-config deploys, preview URLs, edge network, requires DevOps maintenance |

**Installation:**
```bash
# Core dependencies
npm install next@latest react@latest react-dom@latest
npm install drizzle-orm pg
npm install pg-boss

# Dev dependencies
npm install -D typescript @types/node @types/react @types/react-dom
npm install -D drizzle-kit
npm install -D eslint eslint-config-next prettier eslint-config-prettier
npm install -D husky lint-staged

# Initialize Next.js project (alternative to manual install)
npx create-next-app@latest my-app --typescript --tailwind --eslint --app --turbopack
```

## Architecture Patterns

### Recommended Project Structure
```
my-app/
├── src/
│   ├── app/                 # Next.js App Router (pages and API routes)
│   │   ├── api/            # API route handlers (route.ts files)
│   │   ├── (auth)/         # Route groups for organization
│   │   └── layout.tsx      # Root layout
│   ├── lib/                # Shared utilities and core logic
│   │   ├── db/             # Database client and utilities
│   │   │   ├── index.ts    # Drizzle client instance
│   │   │   └── schema.ts   # Drizzle schema definitions
│   │   ├── jobs/           # Job queue setup and workers
│   │   │   ├── index.ts    # pg-boss instance
│   │   │   └── workers/    # Worker implementations
│   │   └── env.ts          # Environment variable validation (optional)
│   ├── components/         # React components
│   └── actions/            # Server Actions
├── migrations/             # Drizzle migration files
├── drizzle.config.ts       # Drizzle Kit configuration
├── docker-compose.yml      # Local PostgreSQL (optional)
└── .env.local              # Local environment variables (not committed)
```

### Pattern 1: Database Connection with Drizzle
**What:** Initialize Drizzle ORM client with node-postgres connection pool
**When to use:** Application startup, import in API routes and server actions
**Example:**
```typescript
// Source: https://github.com/drizzle-team/drizzle-orm-docs
// src/lib/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                      // maximum number of clients in the pool
  idleTimeoutMillis: 30000,     // close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // return error after 2 seconds if no connection
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const db = drizzle({ client: pool, schema });
```

### Pattern 2: Database Schema Definition with pgvector
**What:** Define TypeScript-first database schema with vector column support
**When to use:** Initial schema design, when adding new tables or columns
**Example:**
```typescript
// src/lib/db/schema.ts
import { pgTable, text, timestamp, uuid, vector, real } from 'drizzle-orm/pg-core';

export const evidence = pgTable('evidence', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  content: text('content').notNull(),
  source: text('source').notNull(),
  // Vector embeddings - pgvector supports up to 2000 dimensions with indexing
  // For OpenAI text-embedding-3-large (3072 dims), use dimension reduction or half-precision
  embedding: vector('embedding', { dimensions: 1536 }), // text-embedding-ada-002
  confidenceScore: real('confidence_score'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Pattern 3: Database Migrations with Drizzle Kit
**What:** Generate and apply schema migrations from TypeScript schema
**When to use:** After schema changes, deployment
**Example:**
```typescript
// drizzle.config.ts
// Source: https://github.com/drizzle-team/drizzle-orm-docs
import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

config({ path: '.env.local' });

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Apply migrations (can also be done programmatically)
npx drizzle-kit migrate
```

### Pattern 4: Job Queue Setup with pg-boss
**What:** Initialize pg-boss for background job processing using PostgreSQL
**When to use:** Application startup, for async tasks like parsing, API polling
**Example:**
```typescript
// Source: https://github.com/timgit/pg-boss
// src/lib/jobs/index.ts
import { PgBoss } from 'pg-boss';

export const jobQueue = new PgBoss({
  connectionString: process.env.DATABASE_URL,
  max: 20, // connection pool size
});

jobQueue.on('error', console.error);

export async function startJobQueue() {
  await jobQueue.start();
  console.log('pg-boss started');

  // Register workers
  await jobQueue.work('parse-resume',
    { batchSize: 5 },
    async (jobs) => {
      for (const job of jobs) {
        await parseResumeJob(job.data);
      }
    }
  );
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await jobQueue.stop({ graceful: true, timeout: 30000 });
});
```

### Pattern 5: Next.js API Routes (App Router)
**What:** Define HTTP endpoints using route handlers in App Router
**When to use:** External API endpoints, webhooks, client-side data fetching
**Example:**
```typescript
// Source: https://github.com/vercel/next.js
// src/app/api/evidence/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { evidence } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  const results = await db
    .select()
    .from(evidence)
    .where(eq(evidence.userId, userId));

  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const newEvidence = await db
    .insert(evidence)
    .values(body)
    .returning();

  return NextResponse.json(newEvidence[0], { status: 201 });
}
```

### Pattern 6: Server Actions for Mutations
**What:** Define server-side functions callable from client components
**When to use:** Form submissions, mutations from client components
**Example:**
```typescript
// Source: https://github.com/vercel/next.js
// src/actions/evidence.ts
'use server'

import { db } from '@/lib/db';
import { evidence } from '@/lib/db/schema';
import { revalidatePath } from 'next/cache';

export async function createEvidence(formData: FormData) {
  const content = formData.get('content') as string;
  const source = formData.get('source') as string;

  await db.insert(evidence).values({
    content,
    source,
    userId: 'user-id', // Get from auth session
  });

  revalidatePath('/dashboard');
}
```

### Pattern 7: Environment Variable Management
**What:** Organize environment variables by environment with type safety
**When to use:** Local dev, staging, production deployments
**Example:**
```bash
# .env (committed - defaults, documentation)
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
NEXT_PUBLIC_APP_URL=http://localhost:3000

# .env.local (not committed - local overrides, secrets)
DATABASE_URL=postgresql://user:password@localhost:5432/mydb_dev
OPENAI_API_KEY=sk-...

# .env.production (production values, can be committed if non-secret)
NEXT_PUBLIC_APP_URL=https://myapp.com
```

```typescript
// src/lib/env.ts (optional type-safe validation)
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
```

### Anti-Patterns to Avoid
- **Mixing Pages Router and App Router:** Stick to App Router for new projects (Next.js 15 default), avoid hybrid unless migrating
- **Client-side database queries:** Never expose database credentials or query logic to client, use API routes or server actions
- **Manual SQL migrations:** Let Drizzle Kit generate migrations from schema to avoid drift and human error
- **Blocking API routes with long tasks:** Enqueue long-running jobs (parsing, fetching) in pg-boss, return immediately
- **Committing .env.local:** Contains secrets, should be .gitignored, use .env for documentation only
- **Over-indexing vectors:** pgvector indexes limited to 2000 dimensions; use dimensionality reduction or half-precision for larger embeddings

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Database migrations | Custom SQL file runner with version tracking | Drizzle Kit | Handles schema drift, rollbacks, type generation; manual migrations break on concurrent changes |
| Job retries and scheduling | setTimeout loops or cron with manual retry logic | pg-boss | Built-in exponential backoff, dead letter queues, cron scheduling, exactly-once delivery via SKIP LOCKED |
| Connection pooling | Manual client management with reuse tracking | node-postgres Pool | Handles connection lifecycle, timeouts, reconnection, max pool size automatically |
| Environment variable validation | Runtime checks scattered across codebase | Zod + centralized env.ts | Type-safe, fails fast on startup, single source of truth for required vars |
| Vector similarity search | Custom embedding comparison loops | pgvector with indexes | Optimized HNSW/IVFFlat indexes, parallel query execution, handles millions of vectors |
| API authentication | Custom JWT parsing and validation | NextAuth.js or Clerk | Session management, OAuth providers, CSRF protection, secure cookies out of the box |

**Key insight:** PostgreSQL + proven libraries handle 95% of infrastructure needs. Don't reimplement database-backed queues, retry logic, or migration systems—these have subtle bugs (race conditions, connection leaks, data loss) that take months to surface and fix. Use battle-tested tools and invest time in domain logic instead.

## Common Pitfalls

### Pitfall 1: pgvector Dimension Limits and Performance
**What goes wrong:** Using OpenAI text-embedding-3-large (3072 dimensions) directly hits pgvector's 2000-dimension indexing limit, causing unindexed queries (full scans) or errors.
**Why it happens:** Embeddings providers optimize for quality (more dimensions), but pgvector indexes trade dimensionality for speed. Developers don't realize the limit until production.
**How to avoid:**
- Use text-embedding-ada-002 (1536 dims) or text-embedding-3-small (512-1536 dims) for indexed performance
- For 3072-dim embeddings: use half-precision (`halfvec` type) to index up to 4000 dims, or apply dimensionality reduction (PCA)
- Set appropriate `lists` parameter for IVFFlat index: `CREATE INDEX ON evidence USING ivfflat (embedding vector_cosine_ops) WITH (lists = 1000)` where lists ≈ rows/1000
**Warning signs:** Queries taking >1s for thousands of vectors, Postgres logs showing sequential scans on vector columns

**Sources:**
- [pgvector dimension limits and optimization](https://learn.microsoft.com/en-us/azure/cosmos-db/postgresql/howto-optimize-performance-pgvector)
- [pgvector GitHub - dimension issue](https://github.com/pgvector/pgvector/issues/461)

### Pitfall 2: Drizzle ORM Relationship and Join Mistakes
**What goes wrong:** Missing foreign key constraints, incorrect `.leftJoin()` usage causing unexpected nulls, or forgetting to define relationships in schema leads to runtime errors or incorrect data.
**Why it happens:** Drizzle is SQL-like but not plain SQL—developers assume SQL knowledge transfers directly without reading Drizzle's relational API patterns.
**How to avoid:**
- Define relationships explicitly using `relations()` from drizzle-orm
- Use Drizzle's query API (`.query.table.findMany({ with: { relation: true } })`) instead of manual joins for type-safe relational queries
- Add foreign key constraints in schema: `userId: uuid('user_id').references(() => users.id).notNull()`
- Test joins with null cases to verify left join behavior
**Warning signs:** TypeScript not catching missing fields, null values where not expected, N+1 query patterns

**Sources:**
- [3 Biggest Mistakes with Drizzle ORM](https://medium.com/@lior_amsalem/3-biggest-mistakes-with-drizzle-orm-1327e2531aff)
- [Drizzle ORM Best Practices Guide](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717)

### Pitfall 3: Migration Snapshot Drift
**What goes wrong:** Migration history gets out of sync between environments (dev has 10 migrations, staging has 8), causing deployment failures or schema inconsistencies.
**Why it happens:** Developers generate migrations locally but don't commit immediately, or manually edit migration files after generation.
**How to avoid:**
- Commit migration files immediately after `npx drizzle-kit generate`
- Never manually edit generated migration files; change schema and regenerate
- Run `npx drizzle-kit check` before deployment to verify consistency
- Use a single source of truth: schema.ts → generate migrations → apply to all environments in order
**Warning signs:** Migration errors on deployment, schema differences between dev/staging/prod, foreign key constraint failures

**Sources:**
- [3 Biggest Mistakes with Drizzle ORM - Migration Management](https://medium.com/@lior_amsalem/3-biggest-mistakes-with-drizzle-orm-1327e2531aff)

### Pitfall 4: Docker Hot Reload Issues with Next.js 15
**What goes wrong:** File changes in Docker containers don't trigger hot module reload, or HMR takes 30+ seconds, making local dev frustrating.
**Why it happens:** Docker filesystem events don't propagate like native OS events; Next.js 15 Turbopack has polling issues in containers; volume mount performance on Mac/Windows is slow.
**How to avoid:**
- For local dev, run Next.js directly (`npm run dev`), not in Docker—Docker is for production builds
- If Docker required: configure watchOptions with polling in next.config.js (performance hit), use bind mounts carefully, ensure .next is not in volume
- Consider Turbopack limitations with Docker polling as of late 2024/early 2025
**Warning signs:** Changes not appearing, HMR taking >10 seconds, .next/server/chunks not updating

**Sources:**
- [Next.js Hot Reload Docker Issues](https://github.com/vercel/next.js/issues/71622)
- [Enabling Hot Reloading for Next.js in Docker](https://dev.to/yuvraajsj18/enabling-hot-reloading-for-nextjs-in-docker-4k39)
- [Next.js Docker Hot Reload Guide](https://medium.com/@hitesh.jangra01/next-js-local-development-with-docker-hot-reload-working-9f78a41fe229)

### Pitfall 5: pg-boss Job Queue Table Bloat
**What goes wrong:** Job tables grow unbounded (millions of completed jobs), causing slow queries and disk space issues.
**Why it happens:** pg-boss archives completed jobs by default but doesn't auto-delete; developers forget to configure retention or run cleanup.
**How to avoid:**
- Set `removeOnComplete: true` in job options for ephemeral jobs
- Use `archiveCompletedAfterSeconds` in queue config to auto-archive
- Schedule periodic cleanup: `await boss.clean(3600 * 24 * 7, 100, 'completed')` (remove completed jobs >7 days old)
- Monitor job table size in production, set up alerts for unexpected growth
**Warning signs:** Slow job fetching (>1s), disk usage growing without data growth, table scans on job status queries

**Sources:**
- [pg-boss Production Best Practices](https://talent500.com/blog/nodejs-job-queue-postgresql-pg-boss/)

### Pitfall 6: Environment Variable Confusion Between Build and Runtime
**What goes wrong:** NEXT_PUBLIC_ variables expected to change at runtime but they're baked into build; server variables accessed in client components causing undefined errors.
**Why it happens:** Next.js inlines NEXT_PUBLIC_ vars at build time; confusion between server/client execution contexts in App Router.
**How to avoid:**
- Use NEXT_PUBLIC_ only for truly public, build-time values (API URLs, feature flags)
- For runtime server values, read directly in server components or API routes (they re-read process.env on each request)
- Never access non-NEXT_PUBLIC_ vars in client components—they're undefined in browser
- Use `VERCEL_ENV` system variable to detect production/preview/development in Vercel deployments
**Warning signs:** Undefined environment variables in browser console, stale values after redeployment, sensitive keys exposed in client bundle

**Sources:**
- [Next.js Environment Variables Guide](https://nextjs.org/docs/pages/guides/environment-variables)
- [Mastering Environment Variables in Next.js 15](https://medium.com/@sehouli.hamza/mastering-environment-variables-in-next-js-15-a2d065e4a038)

### Pitfall 7: Missing Index on Foreign Keys in PostgreSQL
**What goes wrong:** Queries joining on foreign keys (e.g., evidence.userId) run slowly even with "small" datasets (10k+ rows).
**Why it happens:** PostgreSQL doesn't automatically index foreign keys (unlike some databases); developers assume foreign key = indexed.
**How to avoid:**
- Explicitly create indexes on foreign key columns: `CREATE INDEX idx_evidence_user_id ON evidence(user_id);`
- In Drizzle schema, add index definitions: `index('idx_evidence_user_id').on(evidence.userId)`
- Review query plans with `EXPLAIN ANALYZE` for join-heavy queries during development
**Warning signs:** Queries slowing down as data grows, sequential scans in EXPLAIN output on foreign key columns

**Sources:**
- [Drizzle ORM Best Practices - Missing Indexes](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717)

## Code Examples

Verified patterns from official sources:

### Local PostgreSQL Setup with Docker Compose
```yaml
# docker-compose.yml
# Source: https://dev.to/saiful7778/setting-up-postgresql-with-docker-compose-for-development-and-production-45j8
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: internship-os-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: internship_os_dev
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

```sql
-- init.sql
CREATE EXTENSION IF NOT EXISTS vector;
```

```bash
# Start local database
docker-compose up -d

# Connect to verify
psql postgresql://postgres:postgres@localhost:5432/internship_os_dev
```

### Complete Job Worker Implementation
```typescript
// src/lib/jobs/workers/parse-resume.ts
// Source: https://context7.com/timgit/pg-boss/llms.txt
import { Job } from 'pg-boss';
import { db } from '@/lib/db';
import { evidence } from '@/lib/db/schema';

interface ParseResumePayload {
  userId: string;
  resumeUrl: string;
}

export async function parseResumeWorker(jobs: Job<ParseResumePayload>[]) {
  for (const job of jobs) {
    try {
      console.log(`Processing resume for user ${job.data.userId}`);

      // Simulate parsing (replace with actual parsing logic)
      const parsedData = await parseResume(job.data.resumeUrl);

      // Store extracted evidence
      await db.insert(evidence).values({
        userId: job.data.userId,
        content: parsedData.content,
        source: `resume:${job.data.resumeUrl}`,
        confidenceScore: parsedData.confidence,
      });

      console.log(`Completed job ${job.id}`);
    } catch (error) {
      // Temporary failures get retried automatically
      if (error instanceof NetworkError) {
        throw error;
      }
      // Permanent failures logged and moved to DLQ
      console.error(`Permanent failure for job ${job.id}:`, error);
      throw error;
    }
  }
}

async function parseResume(url: string) {
  // Placeholder for actual parsing logic (Docling, pdf-parse, etc.)
  return {
    content: 'Extracted resume text...',
    confidence: 0.95,
  };
}
```

### Enqueuing Jobs from API Routes
```typescript
// src/app/api/resume/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { jobQueue } from '@/lib/jobs';

export async function POST(request: NextRequest) {
  const { userId, resumeUrl } = await request.json();

  // Enqueue async parsing job
  const jobId = await jobQueue.send(
    'parse-resume',
    { userId, resumeUrl },
    {
      retryLimit: 3,
      retryDelay: 30, // 30 seconds
      retryBackoff: true, // exponential backoff
      expireInSeconds: 300, // 5 minute timeout
    }
  );

  return NextResponse.json({
    message: 'Resume parsing started',
    jobId
  });
}
```

### Vector Similarity Search with pgvector
```typescript
// src/lib/db/queries/evidence.ts
import { db } from '@/lib/db';
import { evidence } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export async function findSimilarEvidence(
  queryEmbedding: number[],
  userId: string,
  limit: number = 5
) {
  // Using cosine distance for similarity (<=> operator)
  const results = await db.execute(sql`
    SELECT
      id,
      content,
      source,
      confidence_score,
      1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
    FROM evidence
    WHERE user_id = ${userId}
    ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT ${limit}
  `);

  return results.rows;
}
```

### ESLint + Prettier + Husky Setup
```json
// .eslintrc.json
// Source: https://dev.to/joshchu/how-to-setup-prettier-eslint-husky-and-lint-staged-with-a-nextjs-and-typescript-project-i7b
{
  "extends": ["next/core-web-vitals", "prettier"]
}
```

```json
// .prettierrc.json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

```json
// package.json
{
  "scripts": {
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

```bash
# Initialize Husky
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router | App Router with React Server Components | Next.js 13+ (2022), stable in 14/15 | Better performance, streaming, simplified data fetching, server actions replace API routes for mutations |
| Prisma | Drizzle ORM | 2023-2024 shift | Faster queries, SQL-like syntax, better control, smaller bundle, schema-first vs migration-first |
| Redis-based queues (BullMQ) | PostgreSQL queues (pg-boss) | 2024-2025 simplification trend | Single database, simpler ops, ACID guarantees, sufficient for <100k jobs/day, lose peak throughput |
| Serial columns | Identity columns (GENERATED ALWAYS AS IDENTITY) | PostgreSQL 10+ (2017), Drizzle default 2024 | SQL standard compliance, better concurrency, avoids sequence gaps |
| Manual .env management | Typed environment validation (Zod) | 2023+ best practice | Fail fast on startup, type-safe access, prevents runtime "undefined" errors |
| Docker for local Next.js dev | Native npm/pnpm dev server | Next.js team recommendation | 10x faster HMR, no filesystem event issues, Docker only for production builds |

**Deprecated/outdated:**
- **getServerSideProps/getStaticProps:** Replaced by async server components in App Router
- **API routes in /pages/api:** Still work but server actions preferred for mutations, route handlers for external APIs
- **next/image unoptimized prop:** Automatic optimization is stable and recommended since Next.js 13
- **Serial type for IDs:** Use `uuid` or `identity` instead for new schemas

## Open Questions

1. **Docling integration for PDF parsing**
   - What we know: Docling is a newer tool (2024) for document parsing with limited production case studies
   - What's unclear: Performance at scale, accuracy for resume/job description parsing, memory usage
   - Recommendation: Test Docling in Phase 3 (evidence parsing) with fallback to pdf-parse for basic extraction or manual entry for complex cases. Track parsing confidence scores to identify failures early.

2. **pgvector dimension reduction strategy for OpenAI embeddings**
   - What we know: text-embedding-3-large produces 3072 dims, pgvector indexes max 2000 dims standard or 4000 with half-precision
   - What's unclear: Which reduction method (PCA, half-precision, switch to smaller model) gives best accuracy vs performance tradeoff
   - Recommendation: Start with text-embedding-3-small (configurable 512-1536 dims) for V1 to avoid issue. If 3-large required, test half-precision `halfvec` type (4000 dim limit) before considering PCA. Measure recall@10 for similarity searches to validate quality.

3. **Job board API access and rate limits**
   - What we know: Indeed and LinkedIn have strict API requirements, may not grant access to new apps
   - What's unclear: Which job boards offer public APIs, rate limits, cost structure
   - Recommendation: Phase 4 (job monitoring) should validate API access during planning. V1 fallback: start with smaller boards (Greenhouse, Lever public listings) or user-submitted URLs. Don't block V1 launch on Indeed/LinkedIn access.

4. **Staging environment strategy on Vercel**
   - What we know: Vercel has production/preview/development environments; preview auto-created for PRs
   - What's unclear: Whether to use preview deployments as staging, or set up a separate staging project/branch
   - Recommendation: Use Vercel preview deployments (automatic per-branch) as staging for V1. They have separate environment variables, databases can be Neon branches. Only create dedicated staging project if preview limits (e.g., different auth setup) become blocking.

## Sources

### Primary (HIGH confidence)
- [Context7: Next.js](https://github.com/vercel/next.js) - App Router patterns, environment variables, API routes
- [Context7: Drizzle ORM](https://github.com/drizzle-team/drizzle-orm-docs) - Schema definition, migrations, configuration
- [Context7: node-postgres](https://github.com/brianc/node-postgres) - Connection pooling, client setup
- [Context7: pg-boss](https://github.com/timgit/pg-boss) - Job queue setup, worker patterns, error handling
- [Context7: BullMQ](https://github.com/taskforcesh/bullmq) - Comparison research for queue alternatives
- [Vercel Documentation](https://vercel.com/docs) - Deployment, environment variables, preview deployments

### Secondary (MEDIUM confidence)
- [GitHub: pgvector](https://github.com/pgvector/pgvector) - Verified with official docs
- [Microsoft Learn: pgvector performance optimization](https://learn.microsoft.com/en-us/azure/cosmos-db/postgresql/howto-optimize-performance-pgvector) - Azure-specific but principles apply
- [Instaclustr: pgvector 2026 guide](https://www.instaclustr.com/education/vector-database/pgvector-key-features-tutorial-and-pros-and-cons-2026-guide/) - Verified with GitHub docs
- [Medium: 3 Biggest Mistakes with Drizzle ORM](https://medium.com/@lior_amsalem/3-biggest-mistakes-with-drizzle-orm-1327e2531aff) - Cross-referenced with Drizzle docs
- [Medium: PostgreSQL Job Queue with pg-boss](https://talent500.com/blog/nodejs-job-queue-postgresql-pg-boss/) - Verified with pg-boss docs
- [DEV Community: Next.js Docker Hot Reload](https://dev.to/yuvraajsj18/enabling-hot-reloading-for-nextjs-in-docker-4k39) - Multiple sources confirm issue

### Tertiary (LOW confidence - flagged for validation)
- [Medium: Replacing BullMQ with PostgreSQL](https://medium.com/@Iggy01/i-replaced-bull-bullmq-with-60-lines-of-postgresql-and-you-should-too-cad77c8ffdc6) - Single source, anecdotal, needs testing
- Next.js 15 + Turbopack in Docker specific behavior - reported in GitHub issues but evolving rapidly, test in Phase 1

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries from official Context7 docs, widely used in 2025-2026 production apps
- Architecture: HIGH - Patterns from official Next.js, Drizzle, pg-boss documentation with verified examples
- Pitfalls: MEDIUM-HIGH - Mix of official warnings (pgvector limits), community-verified issues (Drizzle relationships), and recent reports (Docker HMR)
- pgvector specifics: MEDIUM - Official docs for basics, but production optimization patterns from cloud provider guides (Azure, Supabase)

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (30 days - stack is stable, but Next.js and Drizzle update frequently; revalidate if using after this date)
