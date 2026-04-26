# Internship OS: Proof Queue

> A proof-first internship application platform that helps college students identify the best opportunities and prove they're qualified - requirement by requirement.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## 🎯 The Problem

College students applying to internships face three critical failures:

1. **Can't prioritize**: Too many job postings, no clear signal on which are worth their time
2. **Can't prove fit**: Don't know which projects, skills, and experiences actually prove each requirement
3. **Fragmented workflow**: Scattered across job boards, spreadsheets, resume versions, and browser tabs

**Internship OS solves this** by building a ranked queue of fresh opportunities with requirement-level evidence mapping—showing exactly what proof supports each job requirement, where gaps exist, and what to do next.

---

## ✨ Key Features

### 📋 **Evidence Bank**

- **AI-powered resume parsing**: Upload PDF/DOCX, get structured evidence extraction via GPT-4
- **Evidence items**: Experiences, projects, skills, education with confidence scores
- **Manual entry**: Add projects, achievements, and artifacts not in your resume
- **Semantic embeddings**: Each evidence item vectorized for intelligent matching

### 🎯 **Fresh Match Queue**

- **Smart job monitoring**: Hourly polling of job boards (Greenhouse adapter, extensible to others)
- **Ranked by fit**: Combines evidence coverage, job freshness, and requirement alignment
- **Eligibility filtering**: Visa sponsorship, remote policy, role type, season, graduation window
- **Status tracking**: Mark roles as Ignore / Save / Apply / Applied

### 🔍 **Requirement → Evidence Mapping**

- **Two-stage matching pipeline**:
  1. **Vector similarity search**: pgvector + HNSW indexes find top candidates (<10ms)
  2. **LLM validation**: GPT-4 validates each match with conservative prompting
- **Decision bands**: `match` (high/medium/low confidence), `weak_match`, or `no_match`
- **Gap analysis**: Instantly see which requirements lack supporting evidence
- **Manual overrides**: Edit or remove any AI-generated mapping
- **Provenance tracking**: Every mapping shows quoted source texts from both requirement and evidence

### 🔔 **Smart Notifications**

- **Email alerts**: Notified when new high-fit roles appear in your queue
- **No spam**: Respects last notification timestamp, sends digest of new matches
- **Export proof summaries**: Print-optimized page with all evidence for a specific role

### 📊 **Audit Trail**

- **Parser confidence tracking**: Every AI extraction logged with confidence scores
- **User corrections**: All manual edits captured for model improvement
- **Version tracking**: Embedding model, LLM model, and prompt versions stored with each mapping
- **Hallucination prevention**: Source grounding, confidence bands, manual review flags

---

## 🛠 Tech Stack

### **Frontend**

- **Next.js 16** (App Router, React Server Components, Turbopack)
- **React 19** + TypeScript
- **Tailwind CSS v4** (modern @import syntax)
- **TanStack Query** (client state management)
- **nuqs** (URL-based filters)

### **Backend**

- **Node.js** / TypeScript
- **PostgreSQL 16** + **pgvector extension** (vector similarity search)
- **Drizzle ORM** (type-safe queries)
- **pg-boss** (job queue for background workers)
- **Better Auth** (authentication)
- **Resend** (transactional email)

### **AI/LLM**

- **OpenAI GPT-4** (gpt-4o-2024-08-06)
  - Resume parsing with Structured Outputs
  - Job requirement extraction
  - Evidence-to-requirement validation
- **OpenAI text-embedding-3-small** (1536-dim semantic embeddings)
- **pgvector HNSW indexes** (fast similarity search)

### **Infrastructure**

- **Docker Compose** (local PostgreSQL)
- **Vercel** (deployment + cron jobs)
- **Husky + lint-staged** (pre-commit hooks)

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│  Evidence Bank · Job Queue · Role Briefs · Status Tracking  │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                     API Layer (Next.js)                      │
│   /api/evidence  /api/jobs  /api/matching  /api/roles       │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                    Business Logic Layer                      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │Resume Parser │  │Job Poller    │  │Matching Pipeline│  │
│  │(GPT-4)       │  │(Greenhouse)  │  │(Vector + LLM)   │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │Requirement   │  │Notification  │  │Gap Analyzer     │  │
│  │Extractor     │  │Dispatcher    │  │                 │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                    Data Layer (Drizzle ORM)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│              PostgreSQL 16 + pgvector + pg-boss              │
│                                                              │
│  Evidence Items (embeddings)  ←→  Requirements (embeddings) │
│         ↓                                    ↓               │
│  Evidence Mappings (validated matches with provenance)      │
└──────────────────────────────────────────────────────────────┘
```

### **Matching Pipeline Flow**

```
1. User uploads resume
   ↓
2. Text extraction (pdf2json/mammoth)
   ↓
3. GPT-4 Structured Outputs → Evidence items
   ↓
4. Generate embeddings (OpenAI text-embedding-3-small)
   ↓
5. Store in evidence_item table with vector column

---

6. Background cron polls job sources (hourly)
   ↓
7. Greenhouse adapter fetches new jobs
   ↓
8. GPT-4 extracts requirements from job descriptions
   ↓
9. Generate requirement embeddings
   ↓
10. Store in requirement table

---

11. User triggers matching for a job
   ↓
12. For each requirement:
    - pgvector similarity search (top 10 candidates)
    - GPT-4 validates each candidate (match/weak_match/no_match)
    - Store valid mappings with confidence + provenance
   ↓
13. Calculate fit score, coverage %, gaps
   ↓
14. Rank jobs by fit + freshness + coverage
   ↓
15. Display in Fresh Match Queue UI
```

---

## 🚀 Getting Started

### **Prerequisites**

- Node.js 18+
- Docker Desktop (for PostgreSQL)
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))
- Resend API key ([get one here](https://resend.com/api-keys))

### **Installation**

```bash
# Clone the repository
git clone https://github.com/mekyle-s/Internship-OS.git
cd Internship-OS

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your API keys:
# - DATABASE_URL (default works for local Docker)
# - OPENAI_API_KEY
# - RESEND_API_KEY
# - BETTER_AUTH_SECRET (generate with: openssl rand -base64 32)
# - CRON_SECRET (generate with: openssl rand -base64 32)

# Start PostgreSQL with pgvector
npm run db:up

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### **Database Commands**

```bash
npm run db:up          # Start PostgreSQL container
npm run db:down        # Stop PostgreSQL container
npm run db:generate    # Generate new migration
npm run db:migrate     # Run migrations
npm run db:studio      # Open Drizzle Studio (DB GUI)
```

---

## 📸 Screenshots

### Evidence Bank

AI-powered resume parsing extracts structured evidence with confidence scores, including education, work experiences, and projects with technologies.

![Evidence Bank](./screenshots/01-evidence-bank.png)

---

### Fresh Match Queue

Ranked job opportunities by fit, freshness, and evidence coverage. Shows requirement gaps and fit scores at a glance.

![Fresh Match Queue](./screenshots/02-match-queue.png)

---

### Role Brief

Requirement-level evidence mapping showing gaps, requirement categories (experience, soft skills, education), and status indicators.

![Role Brief](./screenshots/03-role-brief.png)

---

## 🎓 Key Technical Decisions

### **1. Trust Over Automation**

- Conservative LLM prompting: "When in doubt, use weak_match"
- Every mapping shows **source excerpts** from both requirement and evidence
- Users can **manually override** any AI decision
- Comprehensive **audit trail** for all parser outputs and corrections

### **2. Two-Stage Matching Pipeline**

Instead of relying solely on vector similarity or LLM:

1. **Vector search** (pgvector HNSW) retrieves top 10 candidates per requirement
2. **LLM validation** (GPT-4) refines with structured decision criteria

This approach balances **speed** (vector search is <10ms) with **accuracy** (LLM prevents false positives).

### **3. Hallucination Prevention**

- **Source grounding**: Every mapping stores quoted texts
- **Confidence bands**: Multi-level trust indicators (high/medium/low)
- **Manual review flags**: `needsReview=true` for uncertain matches
- **Version tracking**: Log embedding model, LLM model, prompt version
- **Low temperature** (0.1) for consistent validation

### **4. Performance Optimizations**

- **pgvector HNSW indexes**: <10ms vector search on thousands of items
- **Circuit breakers**: Max 500 LLM calls per matching run
- **Background workers**: Resume parsing, job polling, notifications run async
- **Batch operations**: Store evidence mappings in bulk

### **5. Schema Design**

- **Vector columns nullable**: Gradual embedding generation
- **Text columns + Zod validation**: Flexible enums without schema migrations
- **Composite unique indexes**: Prevent duplicate job fetches
- **Audit tables**: Separate tables for requirement and mapping edits

---

## 📦 Project Structure

```
internship-os/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth pages (sign-in, sign-up, etc.)
│   │   ├── dashboard/         # Main application UI
│   │   │   ├── evidence/      # Evidence bank pages
│   │   │   ├── jobs/          # Job listings
│   │   │   ├── queue/         # Fresh Match Queue
│   │   │   └── roles/         # Role briefs
│   │   └── api/               # API routes
│   │       ├── evidence/      # Resume upload, CRUD
│   │       ├── jobs/          # Job management
│   │       ├── matching/      # Matching pipeline
│   │       ├── roles/         # Status tracking
│   │       └── cron/          # Vercel cron endpoints
│   ├── components/            # React components
│   │   ├── auth/              # Auth forms
│   │   └── evidence/          # Evidence UI components
│   ├── lib/
│   │   ├── db/                # Database layer
│   │   │   ├── schema.ts      # Drizzle schema
│   │   │   └── queries/       # Query functions
│   │   ├── jobs/              # Job pipeline
│   │   │   ├── sources/       # Job source adapters
│   │   │   ├── parsers/       # Requirement extraction
│   │   │   └── workers/       # Background workers
│   │   ├── matching/          # Matching engine
│   │   │   ├── embedder.ts    # Embedding generation
│   │   │   ├── similarity.ts  # Vector search
│   │   │   ├── mapper.ts      # LLM validation
│   │   │   ├── ranker.ts      # Scoring algorithm
│   │   │   └── pipeline.ts    # Orchestrator
│   │   ├── schemas/           # Zod validation schemas
│   │   └── hooks/             # React hooks
│   └── middleware.ts          # Auth middleware
├── migrations/                # Database migrations
├── scripts/                   # Utility scripts
├── .planning/                 # Project planning docs
│   ├── PROJECT.md             # Requirements & context
│   ├── ROADMAP.md             # Phase breakdown
│   └── phases/                # Execution plans & summaries
├── docker-compose.yml         # PostgreSQL + pgvector
├── drizzle.config.ts          # Drizzle ORM config
└── vercel.json                # Vercel cron jobs
```

---

## 🔐 Environment Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/internship_os_dev

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Authentication (Better Auth)
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=Internship OS <onboarding@resend.dev>

# AI (OpenAI)
OPENAI_API_KEY=sk-your-openai-api-key

# Cron Security
CRON_SECRET=your-cron-secret-key
```

---

## 🚧 Roadmap

### ✅ **V1 Complete** (Current)

- Evidence bank with resume parsing
- Job monitoring (Greenhouse)
- Requirement extraction
- Two-stage matching pipeline
- Fresh Match Queue UI
- Role briefs with evidence mapping
- Application tracking
- Email notifications

### 🔮 **Future Enhancements**

- [ ] Chrome extension for save-to-queue
- [ ] Additional job sources (Indeed, LinkedIn)
- [ ] GitHub activity enrichment
- [ ] Automatic brag doc / story bank generation
- [ ] Outcome-based ranking (which mappings led to interviews)
- [ ] Recruiter outreach suggestions
- [ ] Mobile app with push notifications
- [ ] Collaborative features for career coaches

---

## 🤝 Contributing

This project is primarily a portfolio piece, but I'm open to feedback and suggestions! If you find a bug or have an idea:

1. Open an issue describing the problem/feature
2. Feel free to fork and submit a PR
3. Follow the existing code style (ESLint + Prettier)

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenAI** for GPT-4 and text-embedding-3-small
- **pgvector** team for the excellent PostgreSQL vector extension
- **Vercel** for seamless Next.js deployment
- **Better Auth** for the auth framework
- **Drizzle ORM** for type-safe database queries

---

## 📧 Contact

Built by **Mekyle** | [GitHub](https://github.com/mekyle-s) | [LinkedIn](linkedin.com/in/m-siddiqi)

_Looking for Summer 2026 internships in Data Engineering, Analytics, and AI/Agentic Development._

---

**Star ⭐ this repo if you find it helpful!**
