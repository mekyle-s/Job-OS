# Project Research Summary

**Project:** Internship OS - Proof Queue
**Domain:** Proof-first internship application platform
**Researched:** 2026-03-08
**Confidence:** HIGH

## Executive Summary

This is a proof-first internship application platform that reverses the traditional resume-first approach. Instead of asking "do you claim this skill?", it asks "can you prove this skill?" The recommended approach uses LLM-based evidence extraction (parsing resumes, GitHub repos, portfolios into structured proof items), semantic matching (embeddings + LLM verification to map evidence to job requirements), and transparent scoring (showing users exactly where they have strong proof, partial proof, or gaps). This is fundamentally different from resume builders or job aggregators—it's a proof management system that helps students apply to fewer jobs with higher quality evidence.

The technical foundation is solid: Next.js 16 with Server Actions, PostgreSQL with pgvector for semantic search, Prisma ORM for type-safe data access, and Vercel AI SDK for LLM integration. Background job processing via BullMQ handles async operations (resume parsing, job fetching, requirement extraction). The architecture follows an async-first pattern with confidence scoring at every layer, creating an audit trail that builds trust through transparency rather than opacity.

The primary risk is AI hallucination—if the system confidently maps weak evidence to strong requirements, users lose trust immediately and never return. Prevention requires conservative confidence thresholds (85%+ for auto-mapping), human-in-loop verification for novel extractions, and explicit "we're not sure" indicators when confidence is medium (70-85%). Secondary risks include becoming "just another resume tool" through feature creep, source fetcher brittleness (GitHub API changes, OAuth token expiration), and the skills-based hiring execution gap (employers claim to want skills-first but still filter by GPA/pedigree). Mitigation: ruthlessly enforce anti-features list, design for failure visibility, and target "skills-first champions" employer segment rather than trying to change all hiring practices.

## Key Findings

### Recommended Stack

The stack is optimized for TypeScript full-stack development with AI/LLM integration and semantic search. Next.js 16 provides the full-stack framework (frontend + API routes + Server Actions), eliminating the need for a separate API framework. PostgreSQL 17 with pgvector extension handles both relational data and vector similarity search, avoiding the complexity and cost of a separate vector database. Prisma 7 ORM delivers type-safe database access with native pgvector support. The Vercel AI SDK unifies LLM integration across providers with structured output support via Zod schemas.

**Core technologies:**
- **Next.js 16:** Full-stack framework with App Router and Server Actions—industry standard for TypeScript apps, React 19 + Turbopack for fast builds
- **PostgreSQL 17 + pgvector:** Primary database with native vector search—best open-source relational DB, pgvector 0.8 adds iterative index scans and HNSW improvements, eliminates need for separate vector DB
- **Prisma ORM 7:** Type-safe database access—best TypeScript-first ORM, native pgvector Early Access support, Rust-free engine for faster cold starts
- **Vercel AI SDK 6:** LLM integration—unified API across providers, native structured outputs with Zod schemas, agent abstraction for reusable logic
- **BullMQ:** Redis-based job queue—best Node.js queue system for async document parsing, job fetching, and requirement extraction
- **Docling:** Resume/PDF parsing—97.9% accuracy on complex documents, runs locally for privacy, better than LlamaParse for accuracy
- **Playwright + Cheerio:** Web scraping—Playwright for JS-rendered job boards (LinkedIn, Indeed), Cheerio for static HTML (30-70% faster)
- **React Email + Resend:** Email delivery—React components compile to HTML emails, best DX for transactional email
- **Tailwind CSS 4 + shadcn/ui:** UI framework—industry standard, Tailwind 4 uses CSS-based config, shadcn/ui provides copy-paste components

**What NOT to use:**
- Separate vector database (Pinecone, Weaviate)—pgvector handles <1M vectors easily, separate DB adds complexity/cost
- LangChain—over-engineered for simple LLM tasks, poor TypeScript support compared to Vercel AI SDK
- Express.js for APIs—Next.js Server Actions + API routes are simpler and type-safe
- pdf-parse for complex resumes—only extracts raw text, loses structure; use Docling for structured extraction
- NextAuth.js—development team moved to Better Auth in Sept 2025, only security patches now

### Expected Features

The feature landscape divides into three categories: table stakes (users expect these or product feels incomplete), differentiators (competitive advantage, not expected but valued), and anti-features (deliberately NOT building despite market presence).

**Must have (table stakes):**
- **Resume Upload/Storage:** Starting point for evidence extraction—users expect to upload and store their resume (PDF/DOCX)
- **Application Status Tracking:** Track Not Started, In Progress, Submitted, Responded—users need to know what they've applied to
- **Basic Profile Creation:** Name, education, contact info—functional only, not a social profile
- **Job Listing Display:** Available positions with title, company, location, deadline—simple list/card view with filtering
- **Job Search/Filter:** Find positions by keyword, location, role type—standard search, NOT the differentiator (others have more volume)

**Should have (differentiators):**
- **Evidence Bank (Structured Resume Parsing):** Parse resume/projects into atomic evidence pieces reusable across applications—goes beyond standard resume parsing that just fills forms
- **Requirement-Level Proof Mapping:** Map each job requirement to specific evidence, showing coverage + gaps—revolutionary approach (most platforms stop at job-level matching)
- **Fresh Match Queue:** Roles ranked by requirement fit + posting freshness + evidence coverage—NOT about volume, about showing "you have proof for 8/10 requirements, posted 2 days ago"
- **Role Brief with Gap Visualization:** For each role, show requirement → evidence mapping with confidence levels—visual representation (Strong: 6 requirements, Partial: 2, Missing: 2)
- **Evidence Confidence Scoring:** Each evidence piece gets quality/relevance score for specific requirements—transparency builds trust
- **Application Readiness Indicator:** Show readiness score based on evidence coverage before applying—prevents weak applications

**Defer (v2+):**
- **Project Import from GitHub/Portfolio:** Auto-extract evidence from public repos, portfolio sites—requires significant parsing logic
- **Collaborative Evidence Review:** Peer/mentor feedback on evidence quality—requires user network, wait for critical mass
- **Employer-Facing Portal:** Show employers applicants with high proof coverage—different product surface, wait until V1 proves student value
- **Evidence Templates by Role Type:** Common requirement categories per role—requires domain expertise, build after observing V1 patterns

**Anti-features (explicitly NOT building):**
- **Mass Application Automation:** Tools like LazyApply reduce response rates by 39%, create quality issues, contradict proof-first philosophy
- **Social Networking Features:** LinkedIn owns this space, diverts from core value (proof assembly)
- **Resume Builder/Pretty Templates:** Commodity feature, doesn't align with evidence-first positioning
- **Cover Letter Generation:** AI-generated letters are detectable and generic, contradicts building authentic proof
- **Generic Job Aggregation at Scale:** Indeed has 59M+ job seekers, can't win on volume—curate quality over quantity

### Architecture Approach

The architecture follows an async-first pattern with confidence scoring and audit trails at every layer. Document processing (resume parsing, requirement extraction) happens in background workers via job queues, not synchronously in API endpoints. Evidence matching uses a hybrid vector + LLM approach: embeddings provide fast initial filtering (cosine similarity >0.7), then LLM verification for high-stakes matches to balance cost/latency with accuracy. All AI outputs include confidence scores (0-1) and are logged for audit, enabling trust-building and feedback loops. The ranking engine combines multiple signals (fit quality, evidence coverage, job freshness) with time-based decay to surface best matches.

**Major components:**
1. **Profile Ingestion Service:** Resume parsing with NLP/LLM (85-95% accuracy in 2026), evidence normalization to standardized entities with confidence scores
2. **Job Source Fetcher:** Polls job boards/APIs on schedule, requirement extraction engine (LLM-based, 85.1% accuracy when fine-tuned)
3. **Evidence Mapping Engine:** Matches user evidence to job requirements using semantic similarity + LLM verification, assigns confidence scores to each mapping
4. **Ranking Engine:** Scores and ranks jobs by fit quality + freshness + evidence coverage using ML-based scoring (XGBoost)
5. **Background Workers:** Parse worker (resume processing), fetch worker (job polling), alert worker (email notifications)—async job queue (BullMQ) enables horizontal scaling

**Key architectural patterns:**
- **Async Job Queue for Document Processing:** All CPU-intensive tasks (resume parsing, requirement extraction) offloaded to background workers, API returns job ID immediately with status polling or WebSocket updates
- **Hybrid Vector + LLM Matching:** Stage 1 fast vector similarity for filtering (cheap), Stage 2 LLM analysis for accuracy (edge cases only)
- **Confidence-Scored Output with Audit Trail:** All ML/AI outputs include confidence (0-1) and are logged with parser version, timestamp, raw extraction for debugging and model retraining
- **Incremental Ranking with Freshness Decay:** Combine fit score (average evidence-to-requirement confidence), coverage score (% requirements with evidence), and freshness (exponential decay, half-life ~7 days)

**Anti-patterns to avoid:**
- Synchronous LLM calls in API endpoints (causes 5-10s timeouts, no retry)
- Treating all confidence scores as binary pass/fail (loses nuance, prevents user review of uncertain matches)
- Recalculating all rankings on every change (O(users × jobs × requirements) kills database at scale)
- Storing raw LLM prompts/responses without structure (can't debug, version, or retrain)

### Critical Pitfalls

1. **AI Hallucination in Matching:** LLMs infer non-existent connections ("worked on team project" becomes "demonstrated leadership"). One bad experience destroys trust permanently. **Prevention:** Conservative thresholds (85%+ confidence for auto-mapping), human-in-loop for novel skills, explicit "we're not sure" indicators at 70-85% confidence, user feedback loop to flag bad mappings. **Phase 1 critical.**

2. **Resume Parser Syndrome:** Platform gradually adds resume editing, templates, downloads—users skip proof submission, treat it like Resume.io with extra steps. Differentiator evaporates. **Prevention:** Ruthlessly enforce anti-features list, product positioning "not a resume builder", make proof submission easier than resume upload (if resume is 3 clicks, proof link must be 1), track % users completing apps without resume. **Phase 0 critical.**

3. **Source Fetcher Brittleness:** GitHub API changes, LinkedIn blocks scrapers, OAuth tokens expire. Proof fetchers fail silently, users assume they're unqualified when platform is broken. **Prevention:** Design for failure visibility (surface "couldn't fetch from X" prominently), fallback chains (API → scraping → manual upload prompt), health monitoring with alerts when success rate <95%, graceful degradation. **Phase 1 critical.**

4. **Portfolio Fraud Escalation:** AI makes fraud trivial (GPT-generated repos, Midjourney portfolios). System confidently maps fabricated work, employers lose trust. **Prevention:** Multi-signal verification (check commit history patterns, reverse image search, cross-reference LinkedIn dates), "proof authenticity score" shown to employers, fraud detection ML trained on synthetic portfolios, community reporting + rapid takedown. **Phase 2 before employer launch.**

5. **Skills-Based Hiring Execution Gap:** 81% of employers claim skills-based hiring, but still filter by degree/GPA/pedigree. Platform promises revolution, delivers incremental improvement. Students submit proof, get rejected for "traditional qualifications." **Prevention:** Don't promise to change employer behavior, target "skills-first champions" segment, provide employer training, make traditional filters optional not removed, gradual migration path (10% skills-first postings, expand from there). **Phase 0 positioning, Phase 3 employer onboarding.**

6. **Job Requirement Extraction Inconsistency:** Postings vary wildly (bullets vs. paragraphs, tech vs. marketing), NLP extractors fail across domains. System extracts "5 years Python" from "Familiarity with Python a plus." **Prevention:** Requirement normalization layer, confidence scoring per extraction, allow employers to review/edit before posting goes live, train separate extractors per industry, fallback to manual input when confidence <70%. **Phase 1 critical.**

7. **Ranking Opacity Breeds Distrust and Gaming:** Black-box scoring makes users distrust recommendations and try to game the system (keyword stuffing, fake evidence). Employers can't audit rankings. **Prevention:** Explainable scoring by default ("You ranked 12/50 because: 8/10 requirements matched with high-confidence evidence"), scoring components public (requirement match 60%, evidence quality 25%, recency 15%), per-match explanations, gaming resistance through multi-signal verification not opacity. **Phase 2 critical.**

8. **Network Effects Trap:** LinkedIn has 1 billion users, 20-year network graphs. New platform has none. Classic cold-start problem—students ask "Are employers here?", employers ask "Where are candidates?" **Prevention:** Don't compete with LinkedIn directly, serve distinct use case (proof-first internships), niche-first (own "internship applications" before full-time), value before network (must work with 100 users not 100k), target "LinkedIn doesn't serve us" segments. **Phase 0 strategy.**

## Implications for Roadmap

Based on research, suggested phase structure follows the critical path: **Ingestion → Job Pipeline → Matching → Notifications → Trust/Audit**. Evidence Bank is foundational—almost all differentiating features depend on structured evidence. Requirement-Level Proof Mapping requires job requirements (parse JD or manual entry acceptable for V1). Fresh Match Queue requires fit scoring (simple requirement count initially, sophisticate later).

### Phase 1: Evidence Foundation
**Rationale:** Must have user data and evidence before building anything else. Establishes data foundation and async processing pattern. Without Evidence Bank, we're just another job board.

**Delivers:**
- User model + database schema (PostgreSQL + Prisma)
- Profile Ingestion Service (resume parsing with Docling)
- Evidence Normalization Service (skill extraction with confidence scores)
- Job queue infrastructure (BullMQ setup)
- Resume Upload/Storage (table stakes feature)

**Addresses:**
- Evidence Bank (core differentiator from FEATURES.md)
- Resume Upload/Storage (table stakes from FEATURES.md)
- Basic Profile Creation (table stakes from FEATURES.md)

**Avoids:**
- AI hallucination (build conservative extractors from day one—technical debt here is catastrophic)
- Source fetcher brittleness (design for failure visibility, health monitoring when adding source integrations)
- Requirement extraction inconsistency (establish confidence scoring and normalization patterns early)

**Research flags:** Likely needs deeper research on Docling integration (newer tool, MEDIUM confidence), resume parsing accuracy benchmarks, skill taxonomy mapping strategies.

### Phase 2: Job Data Pipeline
**Rationale:** Need job data to enable matching. Can build and test requirement extraction quality before matching complexity. Establishes second data source (roles/requirements) needed for core value prop.

**Delivers:**
- Role/Requirement models (database schema)
- Job Source Fetcher (start with 1-2 sources: Indeed, LinkedIn APIs)
- Requirement Extraction Engine (LLM-based with Vercel AI SDK + structured outputs)
- Job Listing Display (table stakes feature)
- Job Search/Filter (table stakes feature)

**Addresses:**
- Job Listing Display (table stakes from FEATURES.md)
- Job Search/Filter (table stakes from FEATURES.md)
- Lays groundwork for Fresh Match Queue (differentiator)

**Avoids:**
- Job requirement extraction inconsistency (normalization layer, confidence scoring, employer review step)
- Source fetcher brittleness (health monitoring for all fetchers, fallback chains)

**Uses:**
- Playwright for dynamic job boards (LinkedIn, Indeed with JS rendering)
- Cheerio for static HTML parsing (30-70% faster)
- Vercel AI SDK for requirement extraction with structured outputs
- BullMQ for polling workers

**Research flags:** May need phase-specific research on job board API terms of service, rate limits, authentication requirements. Well-documented scraping patterns (Playwright) suggest standard approach works.

### Phase 3: Matching Core
**Rationale:** Requires both evidence and requirements data. Core value proposition—this is what makes the platform proof-first instead of resume-first. Users see ranked job list based on their evidence, can adjust evidence and see rankings update.

**Delivers:**
- Evidence Mapping Engine (vector embeddings + LLM verification)
- Ranking Engine (fit + freshness + coverage calculation)
- API endpoints for viewing ranked jobs
- Fresh Match Queue (differentiator feature)
- Role Brief with Gap Visualization (differentiator feature)
- Evidence Confidence Scoring (differentiator feature)
- Application Readiness Indicator (differentiator feature)

**Addresses:**
- Requirement-Level Proof Mapping (core differentiator from FEATURES.md)
- Fresh Match Queue (core differentiator from FEATURES.md)
- Role Brief with Gap Visualization (core differentiator from FEATURES.md)
- Evidence Confidence Scoring (differentiator from FEATURES.md)
- Application Readiness Indicator (differentiator from FEATURES.md)

**Avoids:**
- AI hallucination (conservative matching > aggressive, false negatives better than false positives)
- Ranking opacity (explainable scoring by default, show why rankings happened)

**Implements:**
- Hybrid Vector + LLM Matching pattern (embeddings for filtering, LLM for verification)
- Incremental Ranking with Freshness Decay pattern (fit + coverage + time-based decay)
- Confidence-Scored Output with Audit Trail pattern (all matches include confidence, logged)

**Uses:**
- pgvector for semantic similarity search (cosine similarity on embeddings)
- OpenAI text-embedding-3-large for embeddings (3072 dimensions, 54.9% MIRACL score)
- Vercel AI SDK for LLM verification in high-stakes matches

**Research flags:** This is the most complex phase—may need deeper research on embedding strategies (dimension reduction, indexing strategies for pgvector HNSW), confidence threshold tuning, ranking algorithm weights. Consider `/gsd:research-phase` before building.

### Phase 4: Notifications & Feedback
**Rationale:** Enhances core matching with alerts. Application tracking enables feedback loop (user edits evidence based on outcomes, system learns). Can be built in parallel with Phase 3 infrastructure.

**Delivers:**
- Notification Worker (email alerts via React Email + Resend)
- Watchlist functionality (save interesting roles)
- Application Status Tracking (table stakes feature)
- Application tracking models (ApplicationAction, OutcomeEvent)

**Addresses:**
- Application Status Tracking (table stakes from FEATURES.md)
- Enables future Evidence Reuse Tracking (track which evidence is most effective)

**Avoids:**
- User fatigue from notification spam (threshold-based triggering, debouncing, preference management)

**Uses:**
- React Email for template components (dark mode support, Tailwind 4 compatible)
- Resend for email delivery (generous free tier, native React Email integration)
- BullMQ for notification worker scheduling

**Research flags:** Standard patterns for email notifications—no phase-specific research needed. React Email + Resend are well-documented.

### Phase 5: Audit & Trust
**Rationale:** Trust features are differentiators but build on proven core. Analytics requires data volume (need completed applications, user corrections to evidence). This phase makes the "proof-first" positioning credible through transparency.

**Delivers:**
- Audit logging infrastructure (all parser/matcher/ranker events logged with metadata)
- Confidence score UI display (show users why certain/uncertain matches happened)
- User evidence verification flow (review low-confidence extractions, provide corrections)
- Analytics dashboard (parser accuracy, matcher performance, user correction patterns)

**Addresses:**
- Trust Through Transparency principle from FEATURES.md
- Enables continuous improvement (feedback loop for model retraining)

**Avoids:**
- Portfolio fraud escalation (multi-signal verification, authenticity scores shown to employers—build before employer-side launch)
- Ranking opacity (users can see confidence scores, employers can audit rankings)

**Uses:**
- Audit logging with structured LLM request/response metadata (prompt version, model, temperature, validation results)
- Tiered confidence handling (>0.9 auto-accept, 0.7-0.9 flag for review, <0.7 quarantine)

**Research flags:** Fraud detection ML may need phase-specific research (adversarial training on synthetic portfolios, anomaly detection patterns). Multi-signal verification strategies need design.

### Phase 6: Employer Onboarding (Post-MVP)
**Rationale:** Defer until V1 proves student value. Two-sided marketplace is significantly harder than single-sided. Need proven proof-first approach before bringing employers on platform.

**Delivers:**
- Employer-facing portal (view high-proof applicants)
- Employer analytics (candidate source attribution, skills-first hire outcomes)
- Employer training materials ("How to evaluate proof-based applications")

**Addresses:**
- Skills-based hiring execution gap (education and change management, target "skills-first champions")
- Network effects trap (bring employers on AFTER student value is proven)

**Avoids:**
- Becoming an ATS (don't build full applicant tracking system—focus on surfacing high-proof applicants)

**Research flags:** May need market research on "skills-first champion" employer segment, case study collection, employer onboarding UX patterns.

### Phase Ordering Rationale

- **Evidence Foundation first** because Evidence Bank is foundational—all differentiators depend on structured evidence extraction. Building on top of weak evidence parsing creates cascading quality issues.
- **Job Pipeline second** because matching requires both evidence AND requirements. Can test requirement extraction quality independently before combining with evidence.
- **Matching Core third** because it requires data from both previous phases. This is the core value prop—users must see proof-based ranking to validate concept.
- **Notifications & Feedback fourth** because it enhances proven core loop (Evidence → Match → Apply) with alerts and tracking. Can be built in parallel with Phase 3 infrastructure.
- **Audit & Trust fifth** because trust features require data volume (need corrections, outcomes) to be meaningful. Analytics dashboard needs completed applications to analyze.
- **Employer Onboarding last** because two-sided marketplace adds significant complexity. Prove student value first, then expand to employers with proven proof-first approach.

This ordering follows the critical dependency path from ARCHITECTURE.md: **Ingestion → Job Pipeline → Matching → Notifications → Audit/Trust**. Parallel opportunities exist (notification infrastructure can be built alongside Phase 3 using mock data, audit logging can be added incrementally to each phase).

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 1 (Evidence Foundation):** Docling integration patterns (newer tool, MEDIUM confidence), resume parsing accuracy benchmarks for different resume formats, skill taxonomy mapping strategies
- **Phase 3 (Matching Core):** Embedding dimension strategies for pgvector, confidence threshold tuning methodology, ranking algorithm weight optimization, hybrid vector+LLM architecture patterns—consider `/gsd:research-phase` before building
- **Phase 5 (Audit & Trust):** Fraud detection ML patterns (adversarial training, synthetic portfolio generation), multi-signal verification architecture, anomaly detection strategies
- **Phase 6 (Employer Onboarding):** Market research on "skills-first champion" employer segment identification, employer onboarding UX patterns in two-sided marketplaces

**Phases with standard patterns (skip research-phase):**
- **Phase 2 (Job Pipeline):** Web scraping with Playwright/Cheerio is well-documented, LLM-based extraction with Vercel AI SDK has established patterns, job board integration is standard
- **Phase 4 (Notifications & Feedback):** Email notification patterns with React Email + Resend are well-documented, watchlist/tracking features are standard CRUD operations

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core framework (Next.js), database (Postgres + Prisma), AI/LLM (Vercel AI SDK), vector search (pgvector) all verified with official docs + WebSearch. BullMQ and email stack (React Email + Resend) are battle-tested. Only MEDIUM confidence on Docling (newer tool, vendor benchmarks). |
| Features | HIGH | Feature landscape verified through multiple platform analyses (LinkedIn, Handshake, Indeed, Simplify, Teal), competitor research, and proof-based assessment literature. Clear distinction between table stakes, differentiators, and anti-features. MVP recommendation aligned with research dependencies. |
| Architecture | MEDIUM-HIGH | Architecture patterns verified across multiple sources (resume parsing, job matching, async job queues, confidence scoring). Component responsibilities and build order based on standard ATS/recruiting platform architectures. MEDIUM on some vendor-specific claims (Width.ai 94% accuracy, Torre's matching model). Async-first and confidence-scored patterns are established best practices. |
| Pitfalls | MEDIUM | Comprehensive WebSearch across 30+ sources covering startup failures, ATS integration issues, AI screening bias, skills-based hiring challenges, network effects, fraud detection. Sources are mix of industry reports (Fortune, SHRM), vendor blogs (medium confidence), and academic papers (high confidence). Real-world examples validated across multiple domains. |

**Overall confidence:** HIGH

Research is comprehensive across all four areas with verified patterns, official documentation, and real-world case studies. Stack choices are validated by production usage at scale (Next.js, Postgres, Prisma, BullMQ). Feature landscape is informed by competitor analysis and user research. Architecture follows established patterns from ATS/recruiting platform domain. Pitfalls are documented with recovery strategies.

### Gaps to Address

**During planning/execution:**

- **Docling integration specifics:** Newer tool (2024-2025) with limited production case studies. May need experimentation during Phase 1 to validate 97.9% accuracy claim on real internship resumes. Fallback: Use pdf-parse for basic extraction, manual entry for complex cases, upgrade to Docling when validated.

- **Embedding dimension optimization:** pgvector supports up to 2000 dimensions efficiently, but OpenAI text-embedding-3-large produces 3072 dimensions. May need dimension reduction strategy or different embedding model. Research during Phase 3 planning.

- **Confidence threshold calibration:** Research suggests 85%+ for auto-accept, 70-85% for review, <70% for quarantine, but these thresholds need validation with real data. Plan A/B testing during Phase 1-3 to tune thresholds based on user feedback ("Was this match accurate?").

- **Skills-first employer segment identification:** How to identify and target "skills-first champions" vs. employers who claim skills-based but still filter traditionally? May need market research or early customer interviews during Phase 6 planning.

- **Fraud detection training data:** Need synthetic portfolio generation strategy (GPT-generated repos, Midjourney portfolios) for adversarial training. Consider partnership with fraud detection vendors or academic research groups during Phase 5.

- **Job board API access:** Indeed and LinkedIn have strict API access requirements and rate limits. May need to start with smaller boards (Intern-List, Handshake via university partnerships) or rely more on user-submitted job URLs in V1. Validate API access during Phase 2 planning.

## Sources

### Primary (HIGH confidence)

**Official Documentation:**
- [Next.js Documentation](https://nextjs.org/docs) — Core framework, Server Actions, App Router, React 19 integration
- [Vercel AI SDK Documentation](https://ai-sdk.dev/) — LLM integration, structured outputs, agent abstraction
- [Prisma Documentation](https://www.prisma.io/docs) — ORM, TypeScript support, pgvector integration (Early Access)
- [PostgreSQL pgvector Extension](https://github.com/pgvector/pgvector) — Vector similarity search, v0.8.0 features (iterative index scans, HNSW improvements)
- [BullMQ Documentation](https://bullmq.io/) — Background job processing, queue patterns, Redis integration
- [React Email Documentation](https://react.email/) — Email template components, dark mode, Tailwind 4 compatibility
- [Playwright Documentation](https://playwright.dev/) — Browser automation, web scraping, multi-browser support
- [Biome Documentation](https://biomejs.dev/) — Linting + formatting, 20x faster than ESLint+Prettier

**Verified Technical Sources:**
- [Next.js 16.1.6 Release](https://nextjs.org/blog/next-15-5) — Latest stable version, App Router features
- [PostgreSQL 17 Docs](https://www.postgresql.org/docs/17/) — Database features, performance characteristics
- [Prisma 7.2.0 Release](https://www.prisma.io/blog/announcing-prisma-orm-7-2-0) — Rust-free engine, TypedSQL, pgvector support
- [Zod v4 Release](https://www.infoq.com/news/2025/08/zod-v4-available/) — 14x faster than v3, TypeScript-first validation
- [AI SDK 6 Release](https://vercel.com/blog/ai-sdk-6) — Unified LLM API, structured outputs, agent abstraction
- [OpenAI Embeddings Docs](https://platform.openai.com/docs/models/text-embedding-3-large) — text-embedding-3-large (3072 dimensions, 54.9% MIRACL score)
- [pgvector 0.8.0 Release](https://www.postgresql.org/about/news/pgvector-080-released-2952/) — Iterative index scans, HNSW improvements

### Secondary (MEDIUM confidence)

**Industry Research & Benchmarks:**
- [Docling PDF Parsing Benchmark (2025)](https://procycons.com/en/blogs/pdf-data-extraction-benchmark/) — 97.9% accuracy on complex documents
- [Biome vs ESLint 2025 Comparison](https://medium.com/@harryespant/biome-vs-eslint-the-ultimate-2025-showdown-for-javascript-developers-speed-features-and-3e5130be4a3c) — 20x speed improvement
- [Vitest vs Jest 2025](https://medium.com/@ruverd/jest-vs-vitest-which-test-runner-should-you-use-in-2025-5c85e4f2bda9) — 30-70% faster test execution
- [Playwright Web Scraping Guide](https://blog.apify.com/playwright-web-scraping/) — Browser automation best practices
- [Job Matching Algorithms: AI in Talent Acquisition](https://www.mokahr.io/myblog/job-matching-algorithms/) — Cosine similarity, skill matching patterns
- [Resume Parsing with LLMs (2024)](https://www.datumo.io/blog/parsing-resumes-with-llms-a-guide-to-structuring-cvs-for-hr-automation) — 85-95% accuracy technical guide
- [Width.ai Resume Parser](https://www.width.ai/post/resume-parser-software) — 94% accuracy claim (vendor case study)
- [Skills-Based Hiring Report 2026](https://www.candycv.com/reports/the-skills-based-hiring-report-what-it-is-and-how-it-will-reshape-work-in-2026-32) — Trends, risks, key players
- [Fortune: Skills-Based Hiring Follow-Through Problem](https://fortune.com/2026/03/02/skills-based-hiring-was-an-hr-mantra-execution-never-followed/) — 81% claim skills-based but execution gap exists
- [AI Resume Screening: Accuracy, Bias (2026)](https://www.articsledge.com/post/ai-resume-screening) — Accuracy and bias concerns
- [AI Hallucination Statistics Report 2026](https://suprmind.ai/hub/insights/ai-hallucination-statistics-research-report-2026/) — Hallucination rates and prevention

**Platform Analysis:**
- [Simplify Copilot: Autofill Job Applications](https://simplify.jobs/copilot) — Competitor feature analysis, autofill patterns
- [Handshake vs LinkedIn vs Indeed Comparison](https://slashdot.org/software/comparison/Handshake-Recruit-vs-Indeed-vs-LinkedIn/) — Platform feature comparison
- [Teal: Autofill Job Applications](https://www.tealhq.com/tools/autofill-job-applications) — Resume parsing for form-filling
- [LazyApply Review 2026](https://www.wobo.ai/blog/lazyapply-review/) — Mass automation concerns
- [The Real Problem with Automated Job Applications](https://scale.jobs/blog/real-problem-automated-job-applications) — 39% response rate reduction
- [LinkedIn Growth Case Study](https://growthcasestudies.com/p/linkedin-case-study) — Network effects analysis
- [Why LinkedIn Has No Competitors](https://theundercoverrecruiter.com/linkedin-competitors/) — Metcalfe's Law, network effects

**Architecture & Patterns:**
- [How to Build an Applicant Tracking System](https://ascendixtech.com/how-to-build-applicant-tracking-system/) — Industry case study, component architecture
- [ATS Workflow Guide](https://recruitbpm.com/blog/ats-workflow-comprehensive-guide) — Comprehensive workflow patterns
- [Torre's Job-Matching Model](https://torre.ai/jobmatchingmodel) — Production system explanation
- [BullMQ Production Usage](https://bullmq.io/) — Battle-tested queue system, billions of jobs processed
- [Task Queues - Full Stack Python](https://www.fullstackpython.com/task-queues.html) — Comprehensive async pattern overview

**Pitfalls & Failures:**
- [Resume Fraud Detection: AI-Driven Hiring Abuse](https://seon.io/resources/resume-fraud-detection-fake-job-applicants/) — Fraud detection patterns
- [The Hiring Hoax: 3,000 Manager Survey](https://checkr.com/resources/articles/hiring-hoax-manager-survey-2025) — 31% interviewed fake candidates, 60% caught lies
- [Freelancer Fraud in the Age of AI](https://www.veremark.com/blog/freelancer-fraud-in-the-age-of-ai-how-to-hire-without-getting-burned) — AI-generated fraud patterns
- [483 Startup Failure Post-Mortems](https://www.cbinsights.com/research/startup-failure-post-mortem/) — Common failure patterns
- [Top 20 Reasons Startups Fail](https://s3-us-west-2.amazonaws.com/cbi-content/research-reports/The-20-Reasons-Startups-Fail.pdf) — CB Insights research report

### Tertiary (LOW confidence - needs validation)

**Academic Papers:**
- [Smart-Hiring: CV Information Extraction](https://arxiv.org/html/2511.02537v1) — Academic paper on resume parsing
- [Zero-Shot Resume-Job Matching with LLMs](https://www.mdpi.com/2079-9292/14/24/4960) — Peer-reviewed LLM matching research
- [Skill-LLM: Repurposing LLMs for Skill Extraction](https://arxiv.org/html/2410.12052v1) — Technical language extraction challenges
- [Fact-Checking with LLMs (2026)](https://www.arxiv.org/pdf/2601.02574) — Verification architecture research

**Vendor Claims (require validation):**
- [Best LLM for Resume Analysis](https://pitchmeai.com/blog/best-llm-resume-job-description-analysis) — 2026 LLM comparison (vendor perspective)
- [Understanding Confidence Scores - Mindee](https://www.mindee.com/blog/how-use-confidence-scores-ml-models) — Practical guide (vendor)
- [Job Architecture with AI Skill Matching](https://www.getbridge.com/blog/talent-mobility/how-to-build-job-architecture-ai-skill-matching/) — Enterprise approach (vendor)

---
*Research completed: 2026-03-08*
*Ready for roadmap: yes*
