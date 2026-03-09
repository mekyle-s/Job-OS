# FINAL_PRD.md

## Decision

Build **Internship OS: Proof Queue**.

This is a narrowed synthesis of:

- **Kept from #1 Internship OS:** ranked personal opportunity queue, next-best-action workflow.
- **Kept from #2 Internship Notifier:** freshness and speed on newly opened roles.
- **Kept from #4 Evidence Mapper:** requirement → proof mapping as the core differentiator.
- **Kept from #6 Brag Doc/Story Bank:** only as future data enrichment, not a V1 surface.

Removed:

- standalone networking graph
- broad communication coach
- health/performance tracking
- generic mass-application workflow
- full interview-prep product

Changed:

- from “personal internship pipeline brain” to **proof-first internship execution system**
- from “discover more roles” to **identify the few roles where your evidence is strongest and act fast**
- from “resume tailoring” to **evidence-backed candidacy assembly**

Why stronger:
Because it attacks the most painful moment in early-career hiring: **a student finds a role, but cannot quickly tell whether they truly fit, what proof to use, and whether it is worth prioritizing right now.**

---

## STAGE 0: NORMALIZE THE INPUT

### 1) Internship OS

- **Target user:** students pursuing internships
- **Core problem:** too many roles, fragmented pipeline, unclear prioritization
- **Value prop:** one ranked system for what to apply to and what to do next
- **Why now:** internship search is crowded and time-sensitive

### 2) Internship Notifier

- **Target user:** students who benefit from applying early
- **Core problem:** good internships appear across fragmented sources and disappear fast
- **Value prop:** only alert on fresh, relevant roles
- **Why now:** speed matters and manual monitoring is miserable

### 3) Communication AI Coach

- **Target user:** people who want to improve general social fluency
- **Core problem:** weak conversational confidence across contexts
- **Value prop:** scenario-based practice gym for smoother interactions
- **Why now:** voice AI makes simulation accessible

### 4) ATS + Requirement Evidence Mapper

- **Target user:** applicants with decent experience but weak tailoring
- **Core problem:** candidates do not know which evidence best proves each requirement
- **Value prop:** map every requirement to strongest proof and expose true gaps
- **Why now:** hiring is increasingly skills-based and evidence-driven

### 5) Networking Graph + Warm-Intro Finder

- **Target user:** students trying to turn weak networks into targeted outreach
- **Core problem:** networking feels random, manual, and low-confidence
- **Value prop:** show reachable people and best outreach angle
- **Why now:** referrals still matter, but access is uneven

### 6) Brag Doc + Interview Story Bank

- **Target user:** students and early-career candidates with scattered accomplishments
- **Core problem:** good examples are forgotten when needed
- **Value prop:** continuously convert work into reusable stories
- **Why now:** LLMs can structure messy raw material into polished narratives

### 7) Peak Performance Planner

- **Target user:** ambitious students trying to link habits to outcomes
- **Core problem:** no feedback loop between health habits and career performance
- **Value prop:** discover which routines measurably improve energy/confidence/output
- **Why now:** wearables and self-tracking are common

---

## STAGE 1: SCORE EACH IDEA

| Idea                                 | Pain severity | Urgency / frequency | ICP clarity | Distribution wedge | Defensibility / moat | Technical feasibility for V1 | Time-to-value | V1 simplicity | Revenue potential | Founder / concept edge | Verdict |
| ------------------------------------ | ------------: | ------------------: | ----------: | -----------------: | -------------------: | ---------------------------: | ------------: | ------------: | ----------------: | ---------------------: | ------- |
| Internship OS                        |             9 |                   9 |           8 |                  4 |                    5 |                            6 |             7 |             5 |                 7 |                      7 | PIVOT   |
| Internship Notifier                  |             8 |                   9 |           9 |                  5 |                    4 |                            7 |             8 |             8 |                 6 |                      6 | PIVOT   |
| Communication AI Coach               |             6 |                   5 |           6 |                  3 |                    3 |                            7 |             6 |             6 |                 6 |                      5 | KILL    |
| ATS + Requirement Evidence Mapper    |             9 |                   8 |           9 |                  6 |                    6 |                            8 |             9 |             9 |                 7 |                      8 | PROCEED |
| Networking Graph + Warm-Intro Finder |             8 |                   7 |           8 |                  4 |                    5 |                            4 |             5 |             3 |                 7 |                      7 | PIVOT   |
| Brag Doc + Interview Story Bank      |             7 |                   6 |           8 |                  5 |                    5 |                            8 |             7 |             8 |                 6 |                      7 | PIVOT   |
| Peak Performance Planner             |             5 |                   4 |           5 |                  3 |                    4 |                            6 |             5 |             4 |                 6 |                      6 | KILL    |

---

## STAGE 2: BOARD DEBATE

### MARKET TRUTH

The only ideas with real teeth are the ones tied to active hiring pain. Students already have places to find internships; what they do **not** have is a fast answer to: “Is this role actually worth my scarce time, and what proof makes me credible?” The generic coaching and wellness ideas solve softer, less urgent problems.

- **Biggest risk:** building a prettier tracker for a market already flooded with trackers
- **Highest-leverage improvement:** make the product win on **decision quality**, not discovery volume
- **Vote:** PROCEED on a narrowed #1 + #4 synthesis

### MOAT & LEVERAGE

A notifier alone is dead on arrival. A tracker alone is dead on arrival. A networking graph alone gets crushed by incumbents with the graph already. The only potentially compounding edge here is a **personal proof graph**: every project, metric, artifact, and outcome becomes reusable structured evidence that improves matching, prioritization, and future applications.

- **Biggest risk:** no proprietary layer; easy feature copy
- **Highest-leverage improvement:** model the candidate as structured proof, then learn which proof patterns convert
- **Vote:** PROCEED only if proof graph is the core asset

### TECHNICAL TRUTH

The networking graph is a swamp: data access, identity resolution, stale links, privacy, and messy outreach recommendations. The proof-first internship product is much cleaner: parse jobs, parse user evidence, map requirements to evidence, rank opportunities, notify on supported sources. That is shippable.

- **Biggest risk:** hallucinated evidence matching that destroys trust
- **Highest-leverage improvement:** show source excerpts, confidence, and manual edit controls on every match
- **Vote:** PROCEED

### USER MAGIC

Students do not want another dashboard. They want the feeling of “I know exactly what to do next, and I’m not wasting time.” The magic moment is not seeing a list of jobs; it is seeing one role with a clear fit score, concrete proof, real gaps, and a recommended next step.

- **Biggest risk:** overwhelming users with analysis before giving an action
- **Highest-leverage improvement:** one role card should answer four things instantly: why fit, why now, what proof, what next
- **Vote:** PROCEED

### CREATIVE INTEGRITY

The soul of the original idea is not “career SaaS.” It is a **personal pipeline brain** for a stressful, high-stakes season of life. Keep the intimacy and sharpness. Do not dilute it into generic resume optimization sludge.

- **Biggest risk:** committee-ing the product into another beige job tool
- **Highest-leverage improvement:** make the product unapologetically for **internship hunters who care about sharp execution**
- **Vote:** PROCEED

### Direct rebuttals

- **MARKET TRUTH → MOAT & LEVERAGE:** agreed on proof graph, but only if it creates immediate value on day one; do not over-invest in future moat fantasies.
- **TECHNICAL TRUTH → USER MAGIC:** yes to clarity, but the first version must avoid browser-extension sprawl and source-complete fantasies.
- **CREATIVE INTEGRITY → MARKET TRUTH:** narrowing is good; sterilizing is bad. Keep the “command center” feeling.

---

## STAGE 3: CONVERGENCE

### Single best path forward

**Proof-First Internship OS**

### What was kept

- Ranked opportunity queue
- Fresh-role monitoring
- Requirement → evidence mapping
- Next-step guidance

### What was removed

- mass apply
- generic job board behavior
- social graph crawling
- broad interview simulator
- health/focus tracking

### What was changed

- narrowed to **internships only**
- narrowed to **supported public job sources only**
- centered V1 around **evidence coverage and prioritization**
- deferred story-bank generation to later

### Why this beats each standalone original

- Better than **#1** because it is not broad and mushy
- Better than **#2** because it is not a thin alerting layer
- Better than **#4** because it becomes a workflow, not a one-off utility
- Better than **#6** because it starts at the moment of application urgency, not reflection

---

## STAGE 4: EXECUTION FILTER

- **Can this be explained in one sentence?** Yes.  
  A proof-first internship command center that finds fresh roles you fit and shows exactly how to prove it.
- **Can a user get value in the first session?** Yes.  
  Upload resume + links, connect targets, see ranked roles and one evidence map.
- **Can V1 be reduced to 3 core features?** Yes.
- **Is there a credible wedge?** Yes.  
  Structured personal proof graph + internship-only workflow + outcome learning.
- **Is there a clear reason this should exist now?** Yes.  
  Tight market, skills-based screening, application overload, crowded generic tools.

---

## 1. Mission

Help ambitious students win better internships by turning messy applications into a ranked queue of fresh opportunities backed by requirement-level proof.

## 2. Ideal Customer Profile

**Who this is for:**  
Students and recent grads in the U.S. targeting competitive internships in software, product, data, analytics, finance, and adjacent knowledge-work roles, who already have some projects, coursework, club work, prior internships, GitHub, or portfolio evidence.

**Who this is NOT for:**  
Career changers, broad full-time job seekers, users who want a mass-apply bot, users with zero documented work to prove, or users primarily seeking therapy, social coaching, or wellness tracking.

**Initial wedge user:**  
High-agency college juniors, seniors, and MS students applying to 20–80 high-value internships and willing to tailor for quality rather than spam for quantity.

## 3. Problem

Internship applicants face three linked failures:

1. They do not know which open roles are actually worth prioritizing.
2. They do not know how to convert their background into convincing proof for each requirement.
3. They lose time stitching together resume bullets, project links, and next steps across scattered tabs and spreadsheets.

Today they solve this with some mix of job boards, spreadsheets, resume match tools, and intuition. That stack fails because discovery, prioritization, and proof assembly are disconnected. Users either over-apply to weak-fit roles or under-apply to strong-fit roles because they cannot see the evidence clearly enough, fast enough.

## 4. Value Proposition

Proof Queue wins by answering the only four questions that matter before an application: **Why this role? Why now? Why you? What next?** Instead of showing a generic match score, it builds a requirement-level evidence map from the user’s real background and uses that map to rank fresh internships worth acting on. The result is fewer wasted applications, better-tailored applications, and more confidence that each submission is strategically sound.

## 5. Strategic Wedge / Moat

The wedge is a **structured personal proof graph** for internship applicants:

- every project, bullet, metric, repo, artifact, and story becomes reusable evidence
- every role generates a requirement → evidence map
- every application outcome improves future prioritization and evidence ranking

This is stronger than a board, tracker, or notifier because it compounds on user-specific data that generic discovery tools do not naturally own.

## 6. V1 Goal

V1 must prove that students will trust and repeatedly use a proof-first workflow to choose and act on internships. Specifically, V1 should prove that users prefer a ranked queue with evidence coverage over generic match lists, and that requirement-level proof assembly materially reduces application friction while increasing confidence and action on high-fit roles.

## 7. Success Metrics

1. Median time from signup to first ranked role with evidence map: **< 8 minutes**
2. Activation rate: **≥ 55%** of new users create at least one complete evidence-backed role brief in session 1
3. Weekly engagement: **≥ 40%** of activated users review 5+ ranked roles per week
4. Action rate: **≥ 30%** of ranked high-fit roles are marked Apply / Save / Reach Out
5. Usefulness: **≥ 70%** of pilot users rate the requirement → evidence map as “materially helpful” in post-flow feedback

## 8. Core User Journey

### Happy path

1. User uploads resume and adds 1–3 evidence sources (GitHub, portfolio, LinkedIn URL, project links, or manual project entries).
2. User defines target internship filters: function, location, visa constraints, company list, industries.
3. System watches supported sources and generates a ranked fresh-opportunity queue.
4. User opens a role brief and sees:
   - fit summary
   - requirement → evidence map
   - missing gaps
   - recommended emphasis
   - next best action
5. User edits if needed, marks Apply, exports tailored proof summary, and logs outcome.

### Magic moment

A role opens and the user instantly sees: “You fit this because Requirement A maps to Project X, Requirement B maps to Internship Y, your only real gap is Z, and this is worth applying today.”

### Reward

Clarity, reduced application paralysis, and faster high-quality execution.

### Unhappy path

- No relevant roles found → prompt user to widen targets or add more companies
- Weak evidence coverage → prompt user to add projects/artifacts, not fabricate claims
- Parser confidence low → show raw extracted requirements for manual correction
- Source unavailable → notify user that source is unsupported or temporarily stale

## 9. V1 Scope — The Only 3 Features

### Feature 1: Evidence Bank

- **User need:** turn scattered experience into reusable proof
- **What it does:** ingests resume plus optional links and creates structured evidence items (skills, experiences, projects, metrics, artifacts, stories)
- **What it explicitly does NOT do:** generate fake achievements, rewrite the whole resume, or act as a generic portfolio builder

### Feature 2: Fresh Match Queue

- **User need:** know which new internships deserve attention now
- **What it does:** monitors supported public job sources for user-defined targets and ranks roles by fit, freshness, and evidence coverage
- **What it explicitly does NOT do:** become a universal job search engine or support every job board in V1

### Feature 3: Role Brief + Requirement → Evidence Map

- **User need:** understand exactly how to position themselves for one role
- **What it does:** breaks a role into requirements, maps each requirement to strongest evidence, flags real gaps, suggests what to emphasize, and recommends next action
- **What it explicitly does NOT do:** auto-submit applications, write deceptive content, or offer live interview assistance

## 10. State Logic

### Empty state

- Prompt to upload resume
- Explain value in one sentence
- Show example role brief mock
- Offer starter target templates

### Loading state

- Show step-specific progress:
  - parsing profile
  - building evidence items
  - scanning watchlist
  - ranking roles

### Success state

- Ranked queue visible
- Each role card shows fit, freshness, evidence coverage, and next action
- Opening a role reveals requirement map and editable evidence links

### Error state

- Clear cause, not generic failure
- Preserve user input
- Offer retry or manual entry
- Log parser/source issue internally

### No-result / edge case

- Tell user why no roles matched:
  - filters too narrow
  - unsupported source
  - not enough evidence
- Offer the smallest corrective step

## 11. Anti-Features

1. **One-click mass apply** — destroys product quality and differentiation
2. **Generic full-time job support** — broadens ICP too early
3. **Social graph scraping / warm-intro crawling** — high complexity, trust, and platform risk
4. **Live interview copilot** — adjacent, ethically messy, and not core to V1 proof
5. **Cover letter generator** — commodity feature, low leverage
6. **Health, sleep, workout tracking** — broadens mission into lifestyle software
7. **Community feed / social layer** — zero need for V1 validation

## 12. Functional Requirements

### Must-have (V1 blockers)

- User can create account and onboarding profile
- User can upload resume PDF/DOCX and manually edit parsed fields
- User can add at least two optional evidence source types
- System extracts evidence items with editable labels/tags
- User can define target criteria and watchlist
- System can fetch and normalize roles from a constrained set of supported sources
- System ranks roles using explicit weighted factors: fit, freshness, and evidence coverage
- System generates requirement lists from each role
- System maps each requirement to at least one evidence item with confidence score
- User can manually edit mappings and mark gaps
- User can save role status: Ignore / Save / Apply / Applied
- User can export a concise proof summary for a role
- Notification system supports email alerts for newly ranked high-fit roles
- Audit trail stores parser confidence, user edits, and status changes

### Nice-to-have (post-V1)

- Chrome extension for save-to-queue
- GitHub commit/activity enrichment
- Automatic brag doc / story bank generation
- Outcome-based ranking improvements
- Recruiter outreach suggestions
- Collaboration with career coaches
- Mobile push notifications

## 13. Technical Truth

### Recommended stack direction

- **Frontend:** Next.js + TypeScript
- **Backend:** Node/TypeScript API or Python service for parsing/ranking workers
- **DB:** Postgres
- **Search / similarity:** pgvector or equivalent embedding store
- **Async jobs:** queue worker for source polling and parsing
- **Auth/storage:** standard managed auth + object storage
- **LLM usage:** extraction, normalization, evidence mapping, explanation generation with strict source grounding

### Core system components

1. Profile ingestion service
2. Evidence normalization service
3. Job source fetchers
4. Ranking engine
5. Requirement extraction engine
6. Evidence mapping engine
7. Notification worker
8. Outcome logging / analytics layer

### Core entities / schema / nouns

- User
- TargetProfile
- EvidenceItem
- EvidenceSource
- SkillTag
- Role
- Requirement
- EvidenceLink
- Watchlist
- Alert
- ApplicationAction
- OutcomeEvent

### Critical integrations

- Resume/document parser
- GitHub API (optional)
- Email delivery
- Supported ATS/public role pages fetchers
- Analytics / event pipeline

### Major technical risks

1. Requirement extraction quality varies by job posting format
2. Evidence mapping may hallucinate or overstate fit
3. Public source fetchers may be brittle
4. Ranking can feel arbitrary if scoring is opaque

## 14. Non-Functional Requirements

- **Performance:** first ranked queue available within 60 seconds of completed onboarding for a typical user
- **Reliability:** 99.0% uptime is sufficient for V1
- **Privacy / data handling:** user data private by default; no evidence shared publicly
- **Security:** encrypt documents at rest; least-privilege access; clear deletion controls
- **Scalability assumptions for V1:** designed for a pilot cohort, not millions; optimize for correctness and trust before source breadth

## 15. Constraints, Assumptions, Dependencies

### KNOWN

- User’s strongest ideas cluster around internship execution, not generic life improvement
- V1 must stay narrow to avoid commodity job-search competition

### ASSUMED

- Initial users are comfortable uploading resume and links
- Supported-source coverage on a few major public ATS patterns is enough to validate demand
- Users care more about deciding where to apply than applying everywhere

### OPEN QUESTION

- Which internship domains should launch first: SWE/data, business/finance, or mixed?
- Which evidence sources actually drive trust: resume only, GitHub, portfolio, transcript, or prior applications?
- Will users pay directly, or is B2B2C via career centers a better first revenue path?
- How much source breadth is required before the queue feels indispensable?

## 16. Risks and Mitigations

1. **Risk:** users see it as “just another resume tool”  
   **Mitigation:** lead product and UX with ranked role briefs, not resume editing screens

2. **Risk:** evidence maps feel wrong or inflated  
   **Mitigation:** every mapping must show source evidence, confidence, and manual override

3. **Risk:** source coverage is too thin  
   **Mitigation:** launch with explicit supported-source list and strong watchlist UX instead of pretending universal coverage

4. **Risk:** product gets dragged into generic job search features  
   **Mitigation:** internship-only positioning, anti-features enforced, roadmap gate on each expansion

5. **Risk:** no durable edge versus larger incumbents  
   **Mitigation:** prioritize user-owned proof graph and outcome feedback loop over commodity discovery features

## 17. Acceptance Criteria

1. User can sign up, upload a resume, and see parsed profile data.
2. User can review and edit extracted evidence items before matching.
3. User can define target filters and a watchlist.
4. System can fetch at least one supported fresh internship role and normalize it.
5. System can generate a role brief containing requirements, fit summary, and next action.
6. Every requirement shown in a role brief is linked to either:
   - one or more evidence items, or
   - an explicit gap state.
7. User can manually edit or remove any evidence mapping.
8. User can mark a role as Save / Apply / Applied and see that state persist.
9. User can receive an email alert for a newly detected high-fit role.
10. User can export a concise role-specific proof summary without exposing fabricated claims.

## 18. Non-Goals

- Be the best place to discover all jobs on the internet
- Replace LinkedIn, Handshake, or generic boards
- Teach broad social confidence
- Provide therapy or mental health support
- Optimize sleep, workouts, or daily planning
- Auto-apply everywhere
- Offer stealth interview assistance
