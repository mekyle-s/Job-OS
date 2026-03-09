# Stack Research

**Domain:** Proof-first internship application platform
**Researched:** 2026-03-08
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.1.x | Full-stack framework (frontend + API routes + server actions) | Industry standard for TypeScript full-stack apps. App Router with Server Actions eliminates need for separate API framework. React 19 + Turbopack for fast builds. [Next.js 16.1.6 latest stable](https://nextjs.org/blog/next-15-5) |
| PostgreSQL | 17.x | Primary database with vector search | Best open-source relational database. Native pgvector support for similarity search eliminates need for separate vector DB. [PostgreSQL 17 docs](https://www.postgresql.org/docs/17/) |
| Prisma ORM | 7.2.x | Type-safe database access | Best TypeScript-first ORM. Native pgvector support (Early Access) with TypedSQL for vector queries. Rust-free engine = faster cold starts. [Prisma 7.2.0 release](https://www.prisma.io/blog/announcing-prisma-orm-7-2-0) |
| TypeScript | 5.7.x | Type safety across entire stack | Standard for production apps. Catches errors before runtime, required for Prisma/Zod. |
| Zod | 4.3.x | Runtime schema validation | TypeScript-first validation. 14x faster than v3. Required for AI SDK structured outputs. [Zod v4 release](https://www.infoq.com/news/2025/08/zod-v4-available/) |

### AI & Document Processing

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| Vercel AI SDK | 6.x | LLM integration for requirement extraction & evidence mapping | Best TypeScript AI library. Unified API across providers. Native structured outputs with Zod schemas. Agent abstraction for reusable logic. [AI SDK 6 release](https://vercel.com/blog/ai-sdk-6) |
| OpenAI API | Latest | LLM provider (GPT-4.5 Turbo + text-embedding-3-large) | GPT-4.5 Turbo for structured extraction. text-embedding-3-large for embeddings (3072 dimensions, 54.9% MIRACL score). $0.00013/1k tokens. [OpenAI embeddings docs](https://platform.openai.com/docs/models/text-embedding-3-large) |
| Docling | Latest | Resume/PDF parsing | 97.9% accuracy on complex documents. Runs locally (privacy). Better than LlamaParse for accuracy, though slower. [Docling benchmark](https://procycons.com/en/blogs/pdf-data-extraction-benchmark/) |
| pgvector | 0.8.x | PostgreSQL vector extension | Native Postgres extension for similarity search. v0.8.0 adds iterative index scans (prevents overfiltering), HNSW index improvements. [pgvector 0.8.0 release](https://www.postgresql.org/about/news/pgvector-080-released-2952/) |

### Background Jobs & Async Processing

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| BullMQ | 5.70.x | Redis-based job queue | Best Node.js queue system. Handles job polling, retry logic, scheduling, priority. Used by thousands of companies processing billions of jobs. [BullMQ docs](https://bullmq.io/) |
| Upstash Redis | Cloud | Redis hosting for BullMQ | Serverless Redis with pay-per-request pricing. REST API for edge functions. Free tier: 500K commands/month. Instant persistence (use as primary queue storage). [Upstash Redis](https://upstash.com) |
| node-cron | 3.x | Cron job scheduling | Simple cron syntax for scheduling recurring tasks (job board polling). Works with BullMQ for persistent scheduled jobs. [node-cron npm](https://www.npmjs.com/package/node-cron) |

### Email & Notifications

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| React Email | 5.x | Email template components | Best TypeScript email framework. React components compile to HTML emails. Dark mode support. Tailwind 4 compatible. [React Email 5.0](https://resend.com/blog/react-email-5) |
| Resend | Latest | Email delivery service | Best DX for developers. Native React Email integration. Generous free tier. Built by Vercel ecosystem. [Resend docs](https://resend.com) |

### Job Source Integration

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| Playwright | Latest | Dynamic web scraping (job boards with JS rendering) | Microsoft-backed browser automation. Auto-wait, multi-browser, headless. Best for LinkedIn, Indeed, etc. [Playwright scraping guide](https://blog.apify.com/playwright-web-scraping/) |
| Cheerio | Latest | Static HTML parsing (simple job boards) | Fast, lightweight jQuery-like parser. 30-70% faster than browser automation for static sites. Use with Axios. [Cheerio guide](https://strapi.io/blog/7-best-javascript-pdf-parsing-libraries-nodejs-2025) |
| Octokit | Latest | GitHub API integration (portfolio/project evidence) | Official GitHub SDK. Full TypeScript support. REST + GraphQL APIs. 100% test coverage. [Octokit.js](https://github.com/octokit/octokit.js/) |

### UI & Styling

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| Tailwind CSS | 4.x | Utility-first CSS framework | Industry standard. v4 uses CSS-based config, OKLCH colors, better dark mode. [Tailwind v4 shadcn](https://ui.shadcn.com/docs/tailwind-v4) |
| shadcn/ui | Latest | UI component library | Copy-paste components (not npm dependency). Tailwind 4 + React 19 ready. Radix UI primitives. [shadcn/ui](https://ui.shadcn.com/) |
| Radix UI | Latest | Accessible component primitives | Used by shadcn/ui. WAI-ARIA compliant, unstyled primitives. |

### Development Tools

| Tool | Purpose | Why Recommended |
|------|---------|-----------------|
| Biome | Linting + Formatting | 20x faster than ESLint+Prettier. Single config file. Rust-based. Type inference (85% of typescript-eslint coverage). [Biome vs ESLint 2025](https://medium.com/@harryespant/biome-vs-eslint-the-ultimate-2025-showdown-for-javascript-developers-speed-features-and-3e5130be4a3c) |
| Vitest | Testing framework | 30-70% faster than Jest. Zero-config for TypeScript/ESM. Native Vite integration. Watch mode. [Vitest vs Jest 2025](https://medium.com/@ruverd/jest-vs-vitest-which-test-runner-should-you-use-in-2025-5c85e4f2bda9) |
| Prisma Studio | Database GUI | Built into Prisma CLI. Visual relationship explorer. Remote DB inspection via --url flag. |

## Installation

```bash
# Core framework
npm install next@latest react@latest react-dom@latest

# Database
npm install @prisma/client prisma
npm install -D @prisma/extension-accelerate

# Validation
npm install zod

# AI & embeddings
npm install ai openai
npm install @ai-sdk/openai

# Background jobs
npm install bullmq ioredis
npm install node-cron @types/node-cron

# Document parsing
npm install pdf-parse  # For basic PDF text extraction
# Use Docling via API or separate Python service for complex documents

# Email
npm install react-email resend
npm install @react-email/components

# Scraping & APIs
npm install playwright cheerio axios
npm install octokit

# UI
npm install tailwindcss postcss autoprefixer
npm install @radix-ui/react-*  # Install specific primitives as needed

# Dev dependencies
npm install -D @biomejs/biome vitest @vitest/ui
npm install -D typescript @types/node @types/react @types/react-dom
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js 16 | Remix, Astro | Remix if you need fine-grained control over streaming. Astro if mostly static content. Next.js is best for full-stack apps. |
| Prisma 7 | Drizzle ORM | Drizzle if you need maximum SQL control or edge runtime (Cloudflare Workers). Prisma has better DX and type safety. |
| pgvector in Postgres | Pinecone, Weaviate | Separate vector DBs only if you need >1M vectors or sub-10ms queries. pgvector is simpler and cheaper for most apps. |
| Vercel AI SDK | LangChain | LangChain if you need complex agent chains or many integrations. AI SDK has cleaner API and better TypeScript support. |
| BullMQ | Inngest, Trigger.dev | Managed platforms (Inngest/Trigger.dev) if you want zero queue ops. BullMQ gives more control and lower cost. |
| Docling | LlamaParse | LlamaParse if speed > accuracy (6s vs Docling's slower processing). Docling has 97.9% accuracy vs LlamaParse's lower fidelity. |
| Playwright | Puppeteer, Crawlee | Puppeteer if you only need Chrome. Crawlee if you need full crawling framework with queue management. Playwright is best balance. |
| Biome | ESLint + Prettier | ESLint if you need 100% typescript-eslint parity or many custom plugins. Biome is 20x faster and simpler. |
| Resend | SendGrid, Postmark | SendGrid/Postmark if you need SMS or advanced deliverability analytics. Resend has best DX for transactional email. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Separate vector database (Pinecone, Weaviate) | Adds complexity, cost, and latency. pgvector in Postgres handles <1M vectors easily. | pgvector extension in PostgreSQL |
| Express.js for API routes | Next.js Server Actions + API routes are simpler and type-safe. Express adds unnecessary complexity. | Next.js App Router with Server Actions |
| pdf-parse for complex resumes | Only extracts raw text, no structure. Loses tables, formatting, sections. | Docling for structured extraction |
| LangChain | Over-engineered for simple LLM tasks. Poor TypeScript support. Vercel AI SDK is cleaner. | Vercel AI SDK with structured outputs |
| Jest | Slow for TypeScript projects. Vitest has zero-config and 30-70% faster. | Vitest |
| ESLint + Prettier | Requires 127+ npm packages, 4 config files. Biome is 20x faster with 1 config. | Biome |
| Firebase/Firestore | No vector search, weak querying, vendor lock-in. Postgres is more flexible. | PostgreSQL with Prisma |
| MongoDB | No vector similarity search without Atlas (vendor lock-in). Postgres + pgvector is better. | PostgreSQL with pgvector |
| NextAuth.js (Auth.js) | Development team moved to Better Auth in Sept 2025. Only security patches now. | Better Auth (recommended by NextAuth team) |
| node-schedule | Less battle-tested than node-cron. BullMQ handles scheduling better. | BullMQ with repeatable jobs + node-cron |

## Stack Patterns by Variant

**If you need MAXIMUM privacy (no external LLM calls):**
- Replace OpenAI with local Llama 3.3 via Ollama
- Use Docling locally for document parsing
- Trade speed for privacy (local inference is 10-100x slower)

**If you need EDGE deployment (Cloudflare Workers, Vercel Edge):**
- Replace Prisma with Drizzle ORM (edge-compatible)
- Use Upstash Redis (REST API, no TCP)
- Replace BullMQ with Cloudflare Queues or Inngest
- Use edge-compatible LLM providers (OpenAI works, Anthropic works)

**If you're on a tight budget (< $50/month):**
- Use Vercel free tier (100GB bandwidth, unlimited deployments)
- Use Supabase Postgres free tier (500MB database, includes pgvector)
- Use Upstash Redis free tier (500K commands/month)
- Use OpenAI text-embedding-3-small instead of large (5x cheaper)
- Use Resend free tier (100 emails/day)

**If you need offline-first capabilities:**
- Add PGlite (WASM Postgres) for local database
- Use Comlink for Web Workers (parse documents off main thread)
- IndexedDB for local-first evidence bank

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 16.x | React 19.x | React 19 required for Next.js 16 |
| Prisma 7.x | PostgreSQL 12+ | PostgreSQL 12+ required for pgvector 0.8.x |
| Vercel AI SDK 6.x | Zod 4.x | Zod 4 required for structured outputs |
| BullMQ 5.x | ioredis 5.x | ioredis is peer dependency |
| Tailwind 4.x | PostCSS 8.x | PostCSS required for Tailwind 4 |
| shadcn/ui latest | Tailwind 4.x + React 19 | Legacy docs available for Tailwind 3 + React 18 |
| pgvector 0.8.x | PostgreSQL 12+ | Requires PostgreSQL 12 or higher |

## Confidence Assessment

| Technology Area | Confidence | Source |
|-----------------|------------|--------|
| Core Framework (Next.js) | HIGH | Context7 + Official docs + WebSearch verified |
| Database (Postgres + Prisma) | HIGH | Context7 + Official docs + WebSearch verified |
| AI/LLM (Vercel AI SDK) | HIGH | Context7 + Official docs + WebSearch verified |
| Vector Search (pgvector) | HIGH | Official docs + WebSearch verified |
| Background Jobs (BullMQ) | HIGH | Context7 + WebSearch verified |
| Document Parsing (Docling) | MEDIUM | WebSearch benchmarks (no official Context7 entry) |
| Web Scraping (Playwright) | HIGH | WebSearch verified with multiple sources |
| Email (Resend + React Email) | HIGH | Official docs + WebSearch verified |
| Testing (Vitest) | HIGH | WebSearch verified with benchmarks |
| Linting (Biome) | MEDIUM | WebSearch verified, but newer tool (less battle-tested than ESLint) |

## Sources

- [Next.js Documentation](https://nextjs.org/docs) — Core framework, Server Actions, App Router
- [Vercel AI SDK Documentation](https://ai-sdk.dev/) — LLM integration, structured outputs
- [Prisma Documentation](https://www.prisma.io/docs) — ORM, pgvector integration
- [PostgreSQL pgvector Extension](https://github.com/pgvector/pgvector) — Vector similarity search
- [BullMQ Documentation](https://bullmq.io/) — Background job processing
- [React Email Documentation](https://react.email/) — Email templates
- [Playwright Documentation](https://playwright.dev/) — Web scraping automation
- [Docling Benchmark (2025)](https://procycons.com/en/blogs/pdf-data-extraction-benchmark/) — PDF parsing comparison
- [Zod v4 Release](https://www.infoq.com/news/2025/08/zod-v4-available/) — Schema validation
- [Biome vs ESLint (2025)](https://medium.com/@harryespant/biome-vs-eslint-the-ultimate-2025-showdown-for-javascript-developers-speed-features-and-3e5130be4a3c) — Linting performance

---
*Stack research for: Internship OS - Proof Queue*
*Researched: 2026-03-08*
