# Job OS: Evidence-Backed Job Discovery

> An AI-powered job discovery platform that ranks opportunities by **provable fit** — mapping every job requirement to concrete evidence from your background, for full-time, part-time, and internship roles.

[![CI](https://github.com/mekyle-s/Job-OS/actions/workflows/ci.yml/badge.svg)](https://github.com/mekyle-s/Job-OS/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20%2B%20pgvector-blue.svg)](https://github.com/pgvector/pgvector)
[![OpenAI](https://img.shields.io/badge/OpenAI-gpt--4o--mini%20%2B%20embeddings-412991.svg)](https://platform.openai.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## 🎯 What It Does

Job seekers drown in postings but can't answer the two questions that matter: **"Which of these are actually worth my time?"** and **"How do I prove I'm qualified?"**

Job OS answers both with an evidence-first pipeline:

1. **Parse** your resume into a structured Evidence Bank (experiences, projects, skills, education — each with confidence scores and semantic embeddings)
2. **Monitor** job boards continuously and extract every posting's requirements verbatim with an LLM
3. **Match** requirements to your evidence with a two-stage retrieval + validation pipeline (pgvector similarity → LLM judgment with provenance)
4. **Rank** a Fresh Match Queue by fit × freshness, showing exactly which requirements you can prove and where your gaps are

No black-box scores. Every match shows the quoted source text from both the requirement and your evidence.

---

## 🧠 AI Engineering Highlights

This project is a working case study in production LLM system design — the parts that matter beyond the demo:

### Two-Stage Retrieval + Validation (cheap first, smart second)

Pure vector similarity produces false positives; pure LLM comparison doesn't scale. Job OS does both in the right order:

1. **pgvector HNSW cosine search** (<10ms, effectively free) retrieves top-5 evidence candidates per requirement
2. **LLM validation** (`gpt-4o-mini`, structured outputs) judges each candidate pair against explicit decision criteria: `match` / `weak_match` / `no_match` with `high`/`medium`/`low` confidence bands

### Cost Engineering — Bounded Worst-Case Spend

The system supports fully open discovery ("all companies, all functions") **without** unbounded API spend:

| Guardrail                   | Mechanism                                                                                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Top-K evaluation cap**    | All candidate pairs are scored by vector similarity first; only the top 25 unvalidated pairs per run reach the LLM. The rest queue for later runs. |
| **Extraction cap per poll** | New jobs land at `parseStatus='pending'`; each poll drains at most 25 extractions, freshest first — a self-healing backlog with no state machine.  |
| **Validation caching**      | Every validated requirement↔evidence pair is persisted; re-runs skip them entirely (zero repeat LLM calls).                                        |
| **Right-sized models**      | `gpt-4o-mini` for all high-volume extraction/validation (~20× cheaper than GPT-4-class models with no quality loss on structured tasks).           |
| **Token discipline**        | Condensed system prompts, input caps on resumes (15k chars) and job descriptions (16k chars), batched embedding calls.                             |

**Net result: worst-case ~50 mini calls (≈ a cent) per sync cycle, regardless of how wide the search criteria are.**

### Hallucination Prevention & Trust

- **Structured Outputs** (Zod schemas → OpenAI `response_format`) — extraction can't silently drift from the contract
- **Conservative prompting** — "when in doubt, `weak_match`"; verbatim extraction only, no inferred requirements
- **Provenance on every mapping** — quoted source excerpts from both sides, stored at write time
- **Version tracking** — embedding model, LLM model, and prompt version recorded per mapping for reproducibility
- **Human-in-the-loop** — `needsReview` flags on uncertain matches; manual overrides are never overwritten by re-runs
- **Full audit trail** — every parser output and user correction logged (a labeled dataset for future fine-tuning/evals)

---

## ✨ Product Features

- **📋 Evidence Bank** — AI resume parsing (PDF/DOCX → structured items), manual entry, automatic embedding of everything for semantic matching
- **🔎 Discover Mode** — leave company/function criteria empty to search everything, or target up to 15 specific companies; filter by job type (full-time / part-time / internship / contract)
- **🎯 Fresh Match Queue** — ranked by `0.7 × fit + 0.3 × freshness` with human-readable fit reasons, status tracking (New / Save / Apply / Applied / Ignore)
- **📊 Role Briefs** — requirement-by-requirement breakdown with mapped evidence, gap analysis, and a print-optimized proof summary export
- **🔔 Smart Alerts** — email digests when new high-fit roles appear (rate-limited, no spam)

---

## 🛠 Tech Stack

| Layer        | Technology                                                                                            |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| **Frontend** | Next.js 16 (App Router, RSC, Turbopack), React 19, TypeScript, Tailwind CSS v4, TanStack Query, nuqs  |
| **Backend**  | Next.js API routes, Drizzle ORM (type-safe SQL), pg-boss (background job queue), Better Auth, Resend  |
| **Data**     | PostgreSQL 16 + pgvector (HNSW indexes, 1536-dim), expression indexes for case-insensitive filtering  |
| **AI**       | OpenAI `gpt-4o-mini` (structured outputs for parsing/extraction/validation), `text-embedding-3-small` |
| **Infra**    | Docker Compose (local), Vercel (deploy + cron), GitHub Actions CI, Husky + lint-staged                |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│  Evidence Bank · Match Queue · Role Briefs · Status Tracking │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                     API Layer (Next.js)                      │
│   /api/evidence  /api/jobs  /api/matching  /api/roles        │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│              Background Workers (pg-boss queue)              │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │Resume Parser │  │Job Poller    │  │Matching Pipeline│    │
│  │(gpt-4o-mini) │  │(Greenhouse)  │  │(Vector → LLM)   │    │
│  └──────────────┘  └──────────────┘  └─────────────────┘    │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │Requirement   │  │Notification  │  │Gap Analyzer     │    │
│  │Extractor     │  │Dispatcher    │  │                 │    │
│  └──────────────┘  └──────────────┘  └─────────────────┘    │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│              PostgreSQL 16 + pgvector + pg-boss              │
│                                                              │
│  Evidence Items (embeddings)  ←→  Requirements (embeddings)  │
│         ↓                                    ↓               │
│  Evidence Mappings (validated, with provenance + versions)   │
└──────────────────────────────────────────────────────────────┘
```

### Matching Pipeline Flow

```
Resume upload → text extraction (pdf2json/mammoth)
             → gpt-4o-mini structured parsing → evidence items
             → batched embeddings → Evidence Bank

Hourly cron  → Greenhouse adapter fetches postings (discover mode = all boards)
             → new/updated jobs queue at parseStatus='pending'
             → capped drain: ≤25 requirement extractions per poll (gpt-4o-mini)
             → requirement embeddings

Matching run → per requirement: pgvector top-5 candidate evidence
             → global sort by similarity, hard cap: top-25 pairs to LLM
             → match/weak_match/no_match + confidence + quoted provenance
             → fit scoring → ranked Fresh Match Queue
```

---

## 📸 Screenshots

### Evidence Bank

AI-powered resume parsing extracts structured evidence with confidence scores — education, work experience, and projects with technologies.

![Evidence Bank](./screenshots/01-evidence-bank.png)

---

### Fresh Match Queue

Ranked opportunities by fit and freshness, with requirement coverage and gaps at a glance.

![Fresh Match Queue](./screenshots/02-match-queue.png)

---

### Role Brief

Requirement-level evidence mapping showing categories, gaps, and status indicators.

![Role Brief](./screenshots/03-role-brief.png)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Docker Desktop (for PostgreSQL + pgvector)
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))
- Resend API key (optional — email features degrade gracefully without it)

### Installation

```bash
git clone https://github.com/mekyle-s/Job-OS.git
cd Job-OS

npm install

cp .env.example .env.local
# Edit .env.local:
# - DATABASE_URL (default works for local Docker)
# - OPENAI_API_KEY
# - BETTER_AUTH_SECRET / CRON_SECRET (generate with: openssl rand -base64 32)

npm run db:up        # Start PostgreSQL with pgvector
npm run db:migrate   # Apply migrations
npm run dev          # Start dev server
```

Visit [http://localhost:3000](http://localhost:3000)

### Database Commands

```bash
npm run db:up          # Start PostgreSQL container
npm run db:down        # Stop PostgreSQL container
npm run db:generate    # Generate new migration
npm run db:migrate     # Run migrations
npm run db:studio      # Open Drizzle Studio (DB GUI)
```

### Cost-Guardrail Tuning (optional)

```bash
MAX_EVALUATIONS_PER_RUN=25    # LLM validation calls per matching run
MAX_EXTRACTIONS_PER_POLL=25   # requirement extractions per job poll
```

---

## 🎓 Key Technical Decisions

1. **Trust over automation** — conservative prompts, quoted provenance, manual overrides, and a full audit trail. The AI proposes; the user stays in control.
2. **Cheap retrieval before expensive judgment** — vector search does the fan-out, the LLM only sees a hard-capped shortlist. This is the pattern that keeps LLM products economically viable at scale.
3. **Hard caps over budget trackers** — a per-run cap with a self-draining backlog bounds worst-case spend with zero added state. Simpler beats clever.
4. **Structured outputs everywhere** — Zod schemas drive both runtime validation and the OpenAI response format, so prompt changes can't silently break the data contract.
5. **Index-backed everything** — HNSW for vectors, expression indexes (`lower(company)`) for case-insensitive filters, btree on role type / parse status. Query plans stay flat as data grows.
6. **Versioned AI artifacts** — every mapping records its embedding model, LLM model, and prompt version, making results reproducible and A/B-able.

---

## 📦 Project Structure

```
job-os/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Sign-in / sign-up / password reset
│   │   ├── dashboard/          # Evidence, jobs, queue, role briefs
│   │   └── api/                # REST endpoints + Vercel cron
│   ├── components/             # React components
│   ├── lib/
│   │   ├── db/                 # Drizzle schema + query layer
│   │   ├── jobs/               # Polling pipeline
│   │   │   ├── sources/        # Job board adapters (Greenhouse; extensible)
│   │   │   ├── parsers/        # LLM requirement extraction
│   │   │   └── workers/        # pg-boss background workers
│   │   ├── matching/           # Matching engine
│   │   │   ├── embedder.ts     # Embedding generation (batched)
│   │   │   ├── similarity.ts   # pgvector cosine search
│   │   │   ├── mapper.ts       # LLM validation w/ decision bands
│   │   │   ├── ranker.ts       # Fit × freshness scoring
│   │   │   └── pipeline.ts     # Orchestrator + cost guardrails
│   │   ├── parsers/            # Resume parsing (PDF/DOCX + LLM)
│   │   └── schemas/            # Zod validation schemas
│   └── middleware.ts           # Auth middleware
├── migrations/                 # Drizzle migrations (incl. HNSW indexes)
├── .github/workflows/ci.yml    # Lint + build CI
├── docker-compose.yml          # PostgreSQL + pgvector
└── vercel.json                 # Cron schedules
```

---

## 🚧 Roadmap

- [ ] Additional job sources (Lever, Ashby, LinkedIn)
- [ ] Offline eval harness for the matching pipeline (using the audit-trail corrections as labels)
- [ ] Prompt-caching + OpenAI Batch API for the extraction backlog
- [ ] GitHub activity enrichment for the Evidence Bank
- [ ] Outcome-based ranking (which mappings led to interviews)
- [ ] Chrome extension for save-to-queue

---

## 🤝 Contributing

Primarily a portfolio project, but feedback and PRs are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).

## 📄 License

MIT — see [LICENSE](./LICENSE).

---

## 📧 Contact

Built by **Mekyle Siddiqi** | [GitHub](https://github.com/mekyle-s) | [LinkedIn](https://linkedin.com/in/m-siddiqi)

_Open to roles in AI Engineering, Solutions / Forward-Deployed Engineering, Analytics Engineering, and Software Engineering._

---

**Star ⭐ this repo if you find it helpful!**
