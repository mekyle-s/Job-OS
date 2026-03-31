# Phase 4: Job Data Pipeline — Context

**Phase goal:** System monitors job sources and extracts structured requirements

**Dependencies:** Phase 2 (Authentication)

**Success criteria:**

1. User can define target criteria (function, location, visa status, companies)
2. System fetches roles from supported sources matching user criteria
3. User can view job listings with title, company, location, freshness indicator
4. Job postings display extracted requirements with simple review states

---

## Decisions

### Target Criteria Setup

**When:** During onboarding, immediately after sign-up

**Profile model:** One active profile in V1

- No multi-profile support in initial version
- Design data model to allow future expansion

**Editability:** Anytime

- Users can modify criteria at any point
- Changes trigger new polling cycle

**Company list:**

- Autocomplete with freeform fallback
- Cap: 10-15 companies per profile
- Balance between signal quality and realistic API load

---

### Job Source Strategy

**V1 source:** Greenhouse only

- Public read API
- Structured data format
- Lowest integration risk
- Well-documented endpoints

**Architecture:** Thin source adapter pattern

- Design interface day one
- Prepare for Lever as next source
- Each source adapter normalizes to canonical job model

**Multi-source roadmap:**

1. Greenhouse (V1)
2. Lever (V2)
3. Defer LinkedIn (partner-restricted, not accepting new partnerships)
4. Defer Indeed (partner/OAuth-oriented, access restrictions)

**Transparency:** Explicit coverage disclosure

- Show "We currently monitor Greenhouse roles"
- Do NOT imply full-web coverage
- Build trust through honesty about limitations

**Polling frequency:** Hourly batches

- Fresh enough for internship timelines
- Avoids overbuilding real-time infrastructure
- Track `first_seen_at` and `updated_at` from Greenhouse API
- Label jobs as "New" or "Updated" based on timestamps

**Data architecture:**

- Store raw source records separately (source-specific schema)
- Transform to canonical job model for application use
- Design for future duplicate merging across sources
- Keep source lineage for debugging

---

### Requirement Extraction

**Extraction approach:** Conservative

- Extract ONLY clearly stated requirements
- Do NOT infer implicit requirements in Phase 4
- Job descriptions mix responsibilities, qualifications, skills, education, experience
- Aggressive inference creates false requirements too early
- Structured Outputs enforces schema shape, not truth of inferred content

**Requirement structure:** Grouped, normalized with source preservation

Schema per requirement:

```
{
  category: "technical_skill" | "experience" | "education" | "soft_skill" | "other",
  priority: "required" | "preferred" | "unknown",
  normalized_text: string,  // cleaned, standardized phrasing
  source_text: string,       // verbatim from posting
  source_span?: string       // excerpt/context if available
}
```

Rationale: Google job-posting guidance treats responsibilities, qualifications, skills, education, and experience as distinct content types. Grouped extraction aligns with industry best practices.

**Confidence display:** Simple review states, not numeric scores

- States: `parsed` | `needs_review` | `unparsed`
- No user-facing confidence percentages in Phase 4
- Rationale: NN/g usability heuristics emphasize visibility of system status, user control, error prevention, minimalist design
- Simple states fit better than premature precision

**Manual editing:** Yes, fully editable

- Users can:
  - Remove wrong extractions
  - Change priority (required ↔ preferred)
  - Add missing requirements
  - Edit normalized phrasing
- Must keep original source text visible for reference
- Rationale: User control and error recovery matter; structured extraction guarantees schema adherence, not perfect interpretation

**Audit trail:**

- Track all manual overrides
- Log: user_id, requirement_id, action, timestamp, before/after values
- Enable future quality improvements from user corrections

---

## Implementation Constraints

**Source adapter pattern:**

- Build thin adapter interface from day one
- Each adapter implements: `fetchJobs()`, `normalizeJob()`, `getUpdates()`
- Canonical job model independent of source schema

**Data preservation:**

- Store raw source records in separate table
- Never lose original posting content
- Preserve both normalized requirement and verbatim source text

**Extraction principles:**

- Never infer a requirement unless explicitly stated
- Treat extraction output as editable draft data, not canonical truth
- Keep manual override audit trail

**UI priorities:**

- Delay fancy confidence UI until matching quality is proven
- Focus on clear review states and edit controls
- Show system status (last polled, new job count)

**Performance:**

- Design for hourly batch processing (not real-time)
- Optimize for read-heavy workload (users browse jobs frequently)
- Index on: user_id, created_at, updated_at, source

---

## Deferred Ideas

None captured during this discussion.

---

_Context gathered: 2026-03-12_
_Ready for: Research and Planning_
