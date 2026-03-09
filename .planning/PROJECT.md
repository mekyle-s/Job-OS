# Internship OS: Proof Queue

## What This Is

A proof-first internship command center that helps ambitious students win better internships by turning messy applications into a ranked queue of fresh opportunities backed by requirement-level proof. Instead of generic match scores, students see exactly which roles fit their background, what evidence proves each requirement, where real gaps exist, and what to do next.

## Core Value

Students instantly know which fresh internships are worth their time and exactly how to prove they fit - requirement by requirement - so they apply to fewer roles with higher confidence and better-tailored evidence.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Students can create structured evidence banks from resumes, projects, GitHub, portfolio links, and manual entries
- [ ] Students can define target internship filters (function, location, visa constraints, company list, industries)
- [ ] System monitors supported public job sources and generates a ranked fresh-opportunity queue by fit, freshness, and evidence coverage
- [ ] Students can view role briefs showing requirement → evidence mapping, gaps, and recommended emphasis
- [ ] Students can manually edit evidence mappings and mark gaps
- [ ] Students can save role status (Ignore / Save / Apply / Applied)
- [ ] Students can export concise proof summaries for specific roles
- [ ] Students receive email alerts for newly ranked high-fit roles
- [ ] Every evidence mapping shows source excerpts, confidence scores, and manual override controls
- [ ] Parser confidence and user edits are audited for trust and improvement

### Out of Scope

- **One-click mass apply** — Destroys product quality and differentiation
- **Generic full-time job support** — Broadens ICP too early; internship-only wedge
- **Social graph scraping / warm-intro crawling** — High complexity, trust risk, platform risk
- **Live interview copilot** — Adjacent, ethically messy, not core to V1 proof
- **Cover letter generator** — Commodity feature, low leverage
- **Health/sleep/workout tracking** — Mission creep into lifestyle software
- **Community feed / social layer** — Zero need for V1 validation

## Context

**Market landscape (2025):**
- NACE projects Class of 2026 internship hiring up just 1.6% - tight market requires strategic application
- 27% of internship recruiting happens in spring - freshness and speed matter
- 85% of employers now use skills-based hiring, 76% use skills tests (TestGorilla) - proof required, not claims
- LinkedIn has rolled out AI-powered job search, tracking, and verified skills - cannot compete on discovery volume alone

**The problem we solve:**
Students face three linked failures:
1. Don't know which open roles are worth prioritizing (discovery ≠ decision quality)
2. Don't know how to convert background into convincing proof for each requirement
3. Lose time stitching together resume bullets, project links, next steps across scattered tabs

**Why now:**
The convergence of tight internship markets, skills-based screening, application overload, and crowded generic tools creates space for a proof-first execution system that wins on decision quality and evidence assembly - not discovery breadth.

**Target users:**
High-agency college juniors, seniors, and MS students in U.S. targeting competitive internships in software, product, data, analytics, finance, and adjacent knowledge-work roles. They already have projects, coursework, GitHub, or portfolio evidence and want to tailor for quality rather than spam for quantity (applying to 20-80 high-value roles).

## Constraints

- **Tech stack**: Next.js + TypeScript frontend, Node/TypeScript or Python backend, Postgres + pgvector, async job queue for polling
- **Source coverage**: Supported public job sources only in V1 - explicit list, no pretense of universal coverage
- **Performance**: First ranked queue available within 60 seconds of onboarding completion
- **Privacy**: User data private by default, no evidence shared publicly, documents encrypted at rest
- **Scalability**: V1 designed for pilot cohort, optimize for correctness and trust before source breadth
- **LLM usage**: Strict source grounding required - extraction, normalization, evidence mapping must show confidence and allow manual override

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Lead with proof assembly, not discovery | LinkedIn has AI search/tracking now - can't win on discovery volume. Win on requirement-level evidence mapping and prioritization instead. | — Pending |
| Internship-only V1 | Tight early-career market + clear ICP + focused value prop. Broadening to full-time dilutes wedge too early. | — Pending |
| Trust over automation | Skills-based hiring trend (85% of employers) requires real proof. Show source excerpts, confidence, manual overrides - never hallucinate fit. | — Pending |
| Supported sources only | Being explicit about source coverage builds trust. Better to excel on few sources than fail on many. | — Pending |
| Personal proof graph as moat | Every project/metric/artifact becomes reusable structured evidence. Compounds on user-specific data that generic tools don't own. | — Pending |

---
*Last updated: 2026-03-08 after initialization*
