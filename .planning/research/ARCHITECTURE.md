# Architecture Research

**Domain:** Proof-First Job Application Platform with Evidence Parsing
**Researched:** 2026-03-08
**Confidence:** MEDIUM-HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE LAYER                             │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  Dashboard   │  │ Profile Mgmt │  │ Job Explorer │  │ Application │ │
│  │  (Rankings)  │  │ (Evidence)   │  │ (Watchlist)  │  │   Tracker   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                 │                 │                 │         │
├─────────┴─────────────────┴─────────────────┴─────────────────┴─────────┤
│                         API/SERVICE LAYER                                │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌──────────────────────┐  ┌─────────────────┐│
│  │ Profile Ingestion   │  │  Job Source Fetcher  │  │   Ranking       ││
│  │ Service (Parser)    │  │  (Polling Service)   │  │   Engine        ││
│  └──────────┬──────────┘  └──────────┬───────────┘  └────────┬────────┘│
│             │                        │                       │         │
│  ┌──────────▼──────────┐  ┌──────────▼───────────┐  ┌────────▼────────┐│
│  │ Evidence            │  │  Requirement         │  │  Evidence       ││
│  │ Normalization       │  │  Extraction Engine   │  │  Mapping Engine ││
│  │ Service             │  │  (LLM-based)         │  │  (with conf.)   ││
│  └──────────┬──────────┘  └──────────┬───────────┘  └────────┬────────┘│
│             │                        │                       │         │
├─────────────┴────────────────────────┴───────────────────────┴─────────┤
│                      ASYNC PROCESSING LAYER                             │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              Job Queue (BullMQ/Celery/Sidekiq)                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │   │
│  │  │Parse Worker │  │Fetch Worker │  │ Alert Worker│             │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────┤
│                         DATA LAYER                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ User/Profile │  │Evidence Store│  │  Role Store  │  │   Cache    │ │
│  │   Database   │  │  (Items,Tags)│  │ (Requirements│  │  (Redis)   │ │
│  │  (Postgres)  │  │   (Postgres) │  │  & Jobs)     │  │            │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│  ┌──────────────┐  ┌──────────────┐                                    │
│  │  Analytics/  │  │Vector Store  │                                    │
│  │Audit Database│  │(Embeddings)  │                                    │
│  │  (Postgres)  │  │(Pinecone/PG) │                                    │
│  └──────────────┘  └──────────────┘                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Profile Ingestion Service** | Resume parsing, extracting structured data from unstructured documents (PDF, DOCX), OCR processing | NLP/LLM-based parser (GPT-3.5/4, custom models), OCR engines, achieves 85-95% accuracy in 2026 |
| **Evidence Normalization Service** | Converts raw parsed data into standardized EvidenceItem entities with skills, tags, sources, confidence scores | Rule-based + ML classification, skill ontology mapping, taxonomy normalization |
| **Job Source Fetcher** | Polls supported job boards/APIs on schedule, extracts job postings, handles rate limits and auth | Async workers, scheduled cron jobs, adapters per source (Indeed, LinkedIn, company APIs) |
| **Requirement Extraction Engine** | Analyzes job descriptions with LLMs to extract structured requirements (skills, experience, certifications) | LLM API calls (GPT-3.5 Turbo achieves 85.1% accuracy when fine-tuned), prompt engineering, structured output |
| **Evidence Mapping Engine** | Matches user evidence to job requirements, assigns confidence scores to each mapping | Semantic similarity (embeddings), rule-based matching, confidence thresholding, hybrid vector+LLM approach |
| **Ranking Engine** | Scores and ranks jobs by fit quality + freshness + evidence coverage | ML-based scoring (XGBoost, gradient-boosted trees), multi-factor weighting, real-time recalculation |
| **Notification Worker** | Sends email alerts for new matching jobs, application deadlines, evidence gaps | Background job processing, email service integration (SendGrid, SES), template rendering |
| **Audit/Analytics Layer** | Tracks parser confidence, user corrections, application outcomes for feedback loop | Event logging, analytics database, ML model retraining pipeline |

## Recommended Project Structure

```
src/
├── api/                    # API layer (REST/GraphQL endpoints)
│   ├── routes/            # Route handlers
│   ├── middleware/        # Auth, validation, error handling
│   └── controllers/       # Business logic orchestration
├── services/              # Core business services
│   ├── ingestion/        # Profile parsing & ingestion
│   │   ├── parsers/      # Format-specific parsers (PDF, DOCX)
│   │   └── normalizers/  # Evidence normalization
│   ├── jobs/             # Job source fetching
│   │   ├── fetchers/     # Per-source adapters
│   │   └── extractors/   # Requirement extraction
│   ├── matching/         # Evidence mapping & ranking
│   │   ├── mappers/      # Evidence-to-requirement matching
│   │   └── rankers/      # Ranking algorithms
│   └── notifications/    # Alert delivery
├── workers/               # Background job workers
│   ├── parse-worker.ts   # Resume parsing jobs
│   ├── fetch-worker.ts   # Job fetching jobs
│   └── alert-worker.ts   # Notification jobs
├── models/                # Domain entities and data models
│   ├── user.ts           # User, TargetProfile
│   ├── evidence.ts       # EvidenceItem, EvidenceSource, SkillTag
│   ├── role.ts           # Role, Requirement
│   └── application.ts    # ApplicationAction, OutcomeEvent
├── db/                    # Database layer
│   ├── migrations/       # Schema migrations
│   ├── repositories/     # Data access patterns
│   └── seeds/            # Seed data
├── ml/                    # ML/AI components
│   ├── embeddings/       # Vector embeddings generation
│   ├── llm/              # LLM integration (requirement extraction)
│   └── confidence/       # Confidence scoring models
├── lib/                   # Shared utilities
│   ├── queue/            # Job queue abstraction
│   ├── cache/            # Caching utilities
│   └── validators/       # Input validation schemas
└── config/                # Configuration management
    ├── database.ts       # DB connection config
    ├── queue.ts          # Queue config
    └── llm.ts            # LLM provider config
```

### Structure Rationale

- **services/:** Organized by business capability (ingestion, jobs, matching) for clear separation of concerns and independent scaling
- **workers/:** Separate worker processes for async job processing, enabling horizontal scaling of background tasks
- **ml/:** Isolated ML/AI components for easier experimentation, model versioning, and potential microservice extraction
- **models/:** Domain-driven design with entities matching the project's core concepts (User, EvidenceItem, Requirement)
- **db/repositories:** Repository pattern abstracts data access, making it easier to swap databases or add caching layers

## Architectural Patterns

### Pattern 1: Async Job Queue for Document Processing

**What:** Offload CPU-intensive tasks (resume parsing, requirement extraction) to background workers via job queues

**When to use:** Any operation taking >500ms or requiring external API calls (LLM, OCR)

**Trade-offs:**
- **Pros:** Non-blocking API, horizontal scalability, retry mechanisms, job prioritization
- **Cons:** Added complexity, eventual consistency, need for job monitoring

**Example:**
```typescript
// API endpoint queues the job
async function uploadResume(userId: string, file: File) {
  const jobId = await parseQueue.add('parse-resume', {
    userId,
    fileUrl: await storage.upload(file),
    priority: 'high'
  });

  return { jobId, status: 'queued' };
}

// Worker processes the job
parseQueue.process('parse-resume', async (job) => {
  const parsed = await resumeParser.parse(job.data.fileUrl);
  const normalized = await evidenceNormalizer.normalize(parsed);
  await db.evidenceItems.createMany(normalized);

  // Trigger dependent jobs
  await matchingQueue.add('recalculate-rankings', { userId: job.data.userId });
});
```

### Pattern 2: Hybrid Vector + LLM Matching

**What:** Combine semantic embeddings (fast, scalable) with LLM analysis (accurate, context-aware) for evidence-to-requirement matching

**When to use:** When you need both speed (filter candidates) and accuracy (final ranking)

**Trade-offs:**
- **Pros:** Balances cost/latency (embeddings are cheap) with quality (LLM for edge cases)
- **Cons:** Two-stage architecture complexity, need to tune cutoff thresholds

**Example:**
```typescript
async function matchEvidenceToRequirements(evidence: EvidenceItem[], requirements: Requirement[]) {
  // Stage 1: Fast vector similarity for initial filtering
  const evidenceEmbeddings = await embeddings.batch(evidence.map(e => e.description));
  const reqEmbeddings = await embeddings.batch(requirements.map(r => r.text));

  const candidates = cosineSimilarity(evidenceEmbeddings, reqEmbeddings)
    .filter(match => match.score > 0.7); // Threshold

  // Stage 2: LLM verification for high-stakes matches
  const verified = await llm.batchAnalyze(
    candidates.map(c => ({
      prompt: `Does this evidence satisfy this requirement? Evidence: ${c.evidence.description}. Requirement: ${c.requirement.text}`,
      schema: { match: 'boolean', confidence: 'number', reasoning: 'string' }
    }))
  );

  return verified.map((v, i) => ({
    ...candidates[i],
    confidence: v.confidence,
    reasoning: v.reasoning
  }));
}
```

### Pattern 3: Confidence-Scored Output with Audit Trail

**What:** All ML/AI outputs include confidence scores (0-1) and are logged for audit, enabling trust-building and feedback loops

**When to use:** Privacy-first, trust-first systems where users need to understand and verify AI decisions

**Trade-offs:**
- **Pros:** User trust, enables human correction loop, improves model over time
- **Cons:** Storage overhead, UI complexity (showing confidence), need for threshold management

**Example:**
```typescript
interface EvidenceItem {
  id: string;
  description: string;
  source: EvidenceSource;
  confidence: number; // 0-1, from parser
  verifiedBy?: 'user' | 'admin'; // Human verification flag
  metadata: {
    parsedAt: Date;
    parserVersion: string;
    rawExtraction: any; // Original parser output
  };
}

async function createEvidenceWithAudit(userId: string, parsed: ParsedData) {
  const evidenceItem = await db.evidenceItems.create({
    userId,
    description: parsed.text,
    confidence: parsed.confidence,
    metadata: {
      parsedAt: new Date(),
      parserVersion: 'gpt-3.5-turbo-20240129',
      rawExtraction: parsed.raw
    }
  });

  // Audit log for analytics
  await db.auditLog.create({
    eventType: 'evidence_created',
    userId,
    entityId: evidenceItem.id,
    confidence: parsed.confidence,
    needsReview: parsed.confidence < 0.8 // Flag low-confidence for review
  });

  return evidenceItem;
}
```

### Pattern 4: Incremental Ranking with Freshness Decay

**What:** Combine multiple signals (fit quality, evidence coverage, job freshness) with time-based decay for ranking

**When to use:** Job matching systems where recency matters and user profiles evolve

**Trade-offs:**
- **Pros:** Balanced recommendations, prevents stale jobs from dominating
- **Cons:** Need to tune decay parameters, recalculation overhead

**Example:**
```typescript
function calculateRankingScore(job: Role, profile: TargetProfile, evidenceLinks: EvidenceLink[]) {
  // Fit quality: average confidence of evidence-to-requirement matches
  const fitScore = evidenceLinks.length > 0
    ? evidenceLinks.reduce((sum, link) => sum + link.confidence, 0) / evidenceLinks.length
    : 0;

  // Evidence coverage: percentage of requirements with evidence
  const coverageScore = job.requirements.length > 0
    ? evidenceLinks.length / job.requirements.length
    : 0;

  // Freshness: exponential decay based on job age
  const ageInDays = (Date.now() - job.postedAt.getTime()) / (1000 * 60 * 60 * 24);
  const freshnessScore = Math.exp(-0.1 * ageInDays); // Half-life ~7 days

  // Weighted combination
  return (
    0.5 * fitScore +
    0.3 * coverageScore +
    0.2 * freshnessScore
  );
}
```

## Data Flow

### Request Flow: Resume Upload to Evidence Creation

```
[User uploads resume]
    ↓
[API: POST /profile/resume] → Queue job → Return jobId
    ↓
[Parse Worker picks job from queue]
    ↓
[Resume Parser (LLM/OCR)] → Extract text, identify sections
    ↓
[Evidence Normalizer] → Map to SkillTag ontology, create EvidenceItems with confidence
    ↓
[Database: Insert EvidenceItems] → Audit log created
    ↓
[Trigger: Recalculate Rankings] → Queue matching job
    ↓
[Matching Worker] → Update evidence-to-requirement links, recalculate scores
    ↓
[WebSocket notification to user] → "Profile updated, X new job matches"
```

### Request Flow: Job Fetching to User Notification

```
[Cron trigger: Poll job sources]
    ↓
[Job Fetcher Worker] → Fetch from Indeed/LinkedIn APIs
    ↓
[Requirement Extraction Engine (LLM)] → Parse job description, extract structured requirements
    ↓
[Database: Insert Role + Requirements] → Audit log created
    ↓
[Matching Worker: For each active user]
    ↓
[Evidence Mapping Engine] → Match user evidence to new requirements (vector + LLM)
    ↓
[Ranking Engine] → Calculate fit + coverage + freshness scores
    ↓
[Filter: Score > threshold & user watchlist criteria]
    ↓
[Notification Worker] → Queue email/push notification
    ↓
[User receives alert] → "New job matching your profile: Senior Engineer at Company X (92% match)"
```

### State Management: Evidence Lifecycle

```
[Raw Resume Upload]
    ↓ (parse)
[Parsed Data with confidence: 0.85]
    ↓ (normalize)
[EvidenceItem (unverified)]
    ↓ (user review)
[EvidenceItem (verified)] → confidence: 1.0
    ↓ (used in matching)
[EvidenceLink to Requirements] → mapping confidence: 0.75-0.95
    ↓ (outcome tracking)
[ApplicationAction: Applied] → OutcomeEvent: Interviewed/Rejected
    ↓ (feedback loop)
[Analytics: Model retraining data]
```

### Key Data Flows

1. **Ingestion Flow:** Resume file → Parser (OCR/LLM) → Normalization (skill ontology mapping) → Structured evidence with confidence → Database + audit log
2. **Matching Flow:** Job posting → Requirement extraction (LLM) → Evidence mapping (embeddings + LLM) → Confidence-scored links → Ranking calculation
3. **Notification Flow:** New job → Batch match against users → Filter by score threshold + watchlist → Queue notifications → Email/push delivery
4. **Feedback Loop:** User edits evidence → Audit log records correction → Analytics layer aggregates → Model retraining pipeline improves parser/matcher

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **0-1k users** | Monolith with async workers is sufficient. Single Postgres instance, Redis for queue/cache. LLM API calls are the bottleneck (cost, not throughput). |
| **1k-100k users** | Horizontal scaling of workers (parsing, matching, fetching). Add read replicas for Postgres. Introduce vector database (Pinecone/pgvector) for faster semantic search. Cache job listings and embeddings. Batch LLM calls to reduce API costs. |
| **100k+ users** | Consider microservices for ingestion, matching, and job fetching. Dedicated embedding service. Event-driven architecture (Kafka/RabbitMQ) for inter-service communication. Partition database by user cohorts. Use cheaper embedding models and reserve LLM for final verification only. |

### Scaling Priorities

1. **First bottleneck (10k-50k users):** LLM API costs and rate limits for requirement extraction and evidence mapping. **Fix:** Fine-tune smaller models, use embeddings for 90% of matching, reserve LLM for edge cases. Cache requirement extractions per job posting.

2. **Second bottleneck (50k-100k users):** Database query performance for ranking calculations across large evidence/requirement tables. **Fix:** Denormalize ranking scores, use materialized views, implement incremental recalculation (only update when evidence/jobs change), leverage caching heavily.

## Anti-Patterns

### Anti-Pattern 1: Synchronous LLM Calls in API Endpoints

**What people do:** Call LLM APIs directly in HTTP request handlers for resume parsing or requirement extraction

**Why it's wrong:**
- Slow response times (LLM calls take 2-10+ seconds)
- Timeouts in production
- No retry mechanism on API failures
- Blocks other requests

**Do this instead:** Always queue LLM jobs for background processing. Return a job ID immediately, provide status polling endpoint or WebSocket updates.

```typescript
// BAD: Blocks for 5-10 seconds
async function uploadResume(req, res) {
  const parsed = await llm.parseResume(req.file); // 5-10s
  res.json({ parsed });
}

// GOOD: Returns immediately
async function uploadResume(req, res) {
  const jobId = await queue.add('parse', { file: req.file });
  res.json({ jobId, status: 'processing' });
}
```

### Anti-Pattern 2: Treating All Confidence Scores as Binary (Pass/Fail)

**What people do:** Use a single hard threshold (e.g., confidence > 0.8) to accept/reject all parsed evidence without nuance

**Why it's wrong:**
- Loses valuable information in the 0.6-0.8 range (could be valid but needs review)
- No differentiation between high-confidence matches (0.95) and marginal ones (0.81)
- User sees no indication of uncertainty

**Do this instead:** Use tiered confidence levels with different UX treatments.

```typescript
// BAD: Binary threshold
if (evidence.confidence > 0.8) {
  await db.save(evidence);
}

// GOOD: Tiered handling
if (evidence.confidence > 0.9) {
  await db.save(evidence); // Auto-accept
} else if (evidence.confidence > 0.7) {
  await db.save({ ...evidence, needsReview: true }); // Flag for user review
  await notifications.send(userId, 'Review low-confidence evidence');
} else {
  await db.saveToQuarantine(evidence); // Quarantine, don't use in matching
}
```

### Anti-Pattern 3: Recalculating All Rankings on Every Change

**What people do:** Run full ranking recalculation across all users and jobs whenever a single piece of evidence or job is added

**Why it's wrong:**
- O(users × jobs × requirements) complexity leads to massive compute waste
- Most rankings don't change meaningfully
- Kills database with reads/writes at scale

**Do this instead:** Incremental updates. Only recalculate rankings for affected users/jobs. Use change detection and queues to batch updates.

```typescript
// BAD: Recalculate everything
async function onNewJob(job: Role) {
  const allUsers = await db.users.findAll();
  for (const user of allUsers) {
    await recalculateRankings(user.id); // Expensive!
  }
}

// GOOD: Incremental, queued updates
async function onNewJob(job: Role) {
  // Only queue rankings for users matching job criteria
  const relevantUsers = await db.users.findWhere({
    targetRoles: { overlaps: [job.category] },
    isActive: true
  });

  await queue.addBatch(
    relevantUsers.map(u => ({
      name: 'update-rankings',
      data: { userId: u.id, jobId: job.id }
    }))
  );
}
```

### Anti-Pattern 4: Storing Raw LLM Prompts and Responses Without Structure

**What people do:** Log LLM interactions as plain text blobs without structured metadata

**Why it's wrong:**
- No versioning of prompts (can't compare performance across prompt changes)
- Hard to debug failures or low-quality outputs
- Can't retrain models on historical data
- No way to track which prompt version produced which result

**Do this instead:** Structured LLM request/response logging with versioning and metadata.

```typescript
// BAD: Unstructured logging
const result = await llm.call(promptText);
logger.info(`LLM response: ${result}`);

// GOOD: Structured audit trail
const llmRequest = {
  promptVersion: 'requirement-extraction-v2.1',
  promptTemplate: templates['requirement-extraction-v2.1'],
  inputs: { jobDescription: job.description },
  model: 'gpt-3.5-turbo-20240129',
  temperature: 0.3,
  timestamp: new Date()
};

const result = await llm.call(llmRequest);

await db.llmAuditLog.create({
  ...llmRequest,
  response: result,
  tokensUsed: result.usage.total_tokens,
  latencyMs: result.latency,
  outputSchema: 'Requirement[]',
  validationPassed: validateRequirements(result.data)
});
```

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **LLM APIs (OpenAI, Anthropic)** | Async queue-based, retry logic with exponential backoff | Rate limits are strict. Use batch APIs when available. Fine-tune on 20k+ examples for 85%+ accuracy (per 2026 research). |
| **Job Boards (Indeed, LinkedIn)** | Polling adapters with per-source rate limiting | Each source has different rate limits, auth mechanisms (API keys, OAuth). Build adapter pattern for extensibility. |
| **Email Service (SendGrid, SES)** | Background worker with template rendering | Queue email jobs, handle bounces/unsubscribes. Use transactional templates for consistency. |
| **Vector Database (Pinecone, Weaviate, pgvector)** | Batch embedding generation, async upserts | Batch embeddings to reduce API calls. Consider pgvector for simpler ops (no separate service). |
| **OCR Services (optional)** | Used only for scanned PDFs, async processing | Most modern resumes are digital. OCR adds cost/latency, only invoke when needed. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **API ↔ Workers** | Job queue (Redis-backed: BullMQ, Sidekiq, Celery) | Ensure job idempotency. Use unique job IDs to prevent duplicate processing. |
| **Workers ↔ Database** | Direct database access via repositories | Workers write results, API reads. Consider eventual consistency for rankings. |
| **Ingestion Service ↔ Matching Service** | Event-driven (queue or pub/sub) | When evidence is created/updated, trigger ranking recalculation via event. |
| **Ranking Engine ↔ Notification Service** | Threshold-based triggering | Only notify when ranking score crosses threshold (e.g., >80% match). Debounce to avoid spam. |
| **Analytics Layer ↔ All Services** | Write-only event logging | All services emit audit events. Analytics layer aggregates for dashboards, retraining. No read dependencies. |

## Component Build Order

Based on dependencies and incremental value delivery:

### Phase 1: Core Ingestion (Weeks 1-3)
**Components:**
1. User model + database schema
2. Profile Ingestion Service (basic resume parsing)
3. Evidence Normalization Service (simple skill extraction)
4. Job queue infrastructure (BullMQ/Celery setup)

**Why first:** Must have user data to build anything else. Establishes data foundation and async processing pattern.

**Validation:** User can upload resume, see parsed evidence items (even with low accuracy initially).

### Phase 2: Job Data Pipeline (Weeks 4-5)
**Components:**
1. Role/Requirement models
2. Job Source Fetcher (start with 1-2 sources)
3. Requirement Extraction Engine (LLM-based)

**Why second:** Need job data to enable matching. Can build and test extraction quality before matching complexity.

**Validation:** System can fetch real jobs, extract structured requirements with confidence scores.

### Phase 3: Matching Core (Weeks 6-8)
**Components:**
1. Evidence Mapping Engine (vector embeddings + LLM verification)
2. Ranking Engine (fit + freshness + coverage)
3. API endpoints for viewing ranked jobs

**Why third:** Requires both evidence and requirements data. Core value proposition.

**Validation:** User sees ranked job list based on their evidence. Can adjust evidence, see rankings update.

### Phase 4: Notifications & Feedback (Weeks 9-10)
**Components:**
1. Notification Worker (email alerts)
2. Watchlist functionality
3. Application tracking (ApplicationAction, OutcomeEvent)

**Why fourth:** Enhances core matching with alerts. Application tracking enables feedback loop.

**Validation:** User receives email when high-match jobs appear. Can track applications, provide outcome feedback.

### Phase 5: Audit & Trust (Weeks 11-12)
**Components:**
1. Audit logging infrastructure
2. Confidence score UI display
3. User evidence verification flow
4. Analytics dashboard (parser/matcher performance)

**Why last:** Trust features are differentiators but build on proven core. Analytics requires data volume.

**Validation:** User can see confidence scores, verify/edit evidence. Admin sees parser accuracy metrics, user correction patterns.

**Suggested Deferred (Post-MVP):**
- Multi-source evidence aggregation (GitHub, LinkedIn profiles)
- Advanced ML model training pipeline
- Skills gap analysis and recommendations
- Team/org features

## Build Order Dependencies

```
Phase 1 (Ingestion) → Phase 2 (Job Pipeline) → Phase 3 (Matching)
         ↓                                           ↓
         └──────────────────────────────────> Phase 4 (Notifications)
                                                      ↓
                                               Phase 5 (Audit/Trust)
```

**Critical path:** Ingestion → Job Pipeline → Matching. Everything else builds on this foundation.

**Parallel opportunities:**
- Notification infrastructure can be built alongside Phase 3 (use mock data)
- Audit logging can be added incrementally to each phase

## Sources

**Architecture & Components:**
- [How to Build an Applicant Tracking System](https://ascendixtech.com/how-to-build-applicant-tracking-system/) (MEDIUM confidence - industry case study)
- [ATS Workflow Guide](https://recruitbpm.com/blog/ats-workflow-comprehensive-guide) (MEDIUM confidence - comprehensive workflow)
- [Microsoft ATS API Documentation](https://learn.microsoft.com/en-us/dynamics365/human-resources/hr-admin-integration-ats-api-introduction) (HIGH confidence - official documentation)

**Resume Parsing & Document Extraction:**
- [Parsing Resumes with LLMs](https://www.datumo.io/blog/parsing-resumes-with-llms-a-guide-to-structuring-cvs-for-hr-automation) (HIGH confidence - 2024 technical guide)
- [Width.ai Resume Parser - 94% Accuracy](https://www.width.ai/post/resume-parser-software) (MEDIUM confidence - vendor case study with technical details)
- [Smart-Hiring: CV Information Extraction](https://arxiv.org/html/2511.02537v1) (HIGH confidence - academic paper)

**Job Matching & Ranking:**
- [Skill-Matching Algorithms in Staffing](https://www.icreatives.com/iblog/skill-matching-algorithms/) (MEDIUM confidence - industry overview)
- [Torre's Job-Matching Model](https://torre.ai/jobmatchingmodel) (MEDIUM confidence - production system explanation)
- [Predictive Job Matching Components](https://x0pa.com/glossary/predictive-job-matching/) (MEDIUM confidence - technical glossary)

**LLM-Based Requirement Extraction:**
- [Best LLM for Resume Analysis](https://pitchmeai.com/blog/best-llm-resume-job-description-analysis) (MEDIUM confidence - 2026 comparison)
- [AI Job Matching with LLMs](https://tusharlaad.medium.com/how-ai-can-transform-job-matching-using-llms-to-understand-what-jobs-really-offer-ab7ab4a171c9) (MEDIUM confidence - technical blog post, Feb 2026)
- [Zero-Shot Resume-Job Matching with LLMs](https://www.mdpi.com/2079-9292/14/24/4960) (HIGH confidence - peer-reviewed paper)

**Async Job Queue Architecture:**
- [BullMQ Documentation](https://bullmq.io/) (HIGH confidence - official docs, widely used in production)
- [Sidekiq Background Jobs](https://dev.to/sgchris/designing-a-job-queue-system-sidekiq-and-background-processing-2oln) (MEDIUM confidence - practical guide)
- [Task Queues - Full Stack Python](https://www.fullstackpython.com/task-queues.html) (HIGH confidence - comprehensive overview)

**Confidence Scoring & Verification:**
- [Confidence Scores in ML - Ultralytics](https://www.ultralytics.com/glossary/confidence) (HIGH confidence - technical documentation)
- [Understanding Confidence Scores - Mindee](https://www.mindee.com/blog/how-use-confidence-scores-ml-models) (MEDIUM confidence - practical guide)
- [Fact-Checking with LLMs (2026)](https://www.arxiv.org/pdf/2601.02574) (HIGH confidence - recent research on verification architectures)

**Evidence-Based Matching:**
- [Job Architecture with AI Skill Matching](https://www.getbridge.com/blog/talent-mobility/how-to-build-job-architecture-ai-skill-matching/) (MEDIUM confidence - enterprise approach)
- [Skills Mapping Software Solutions](https://fuel50.com/2025/05/skills-mapping-software-solutions/) (MEDIUM confidence - market overview)

---
*Architecture research for: Internship OS (Proof Queue)*
*Researched: 2026-03-08*
*Overall confidence: MEDIUM-HIGH (verified architecture patterns, some vendor-specific claims require validation)*
