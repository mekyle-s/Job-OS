# Requirements: Internship OS: Proof Queue

**Defined:** 2026-03-08
**Core Value:** Students instantly know which fresh internships are worth their time and exactly how to prove they fit - requirement by requirement - so they apply to fewer roles with higher confidence and better-tailored evidence.

## v1 Requirements

Requirements organized by priority: CORE features are the differentiated product, SUPPORT features are minimal infrastructure to enable the core.

### CORE: Proof Assembly & Matching (The Product)

#### Evidence Foundation

- [ ] **CORE-01**: User can upload resume (PDF/DOCX) and system parses into structured evidence items
- [ ] **CORE-02**: User can add evidence sources (GitHub, portfolio, manual projects)
- [ ] **CORE-03**: System extracts evidence items with confidence scores and editable fields
- [ ] **CORE-04**: User can manually correct parsed evidence

#### Requirement Extraction & Mapping

- [ ] **CORE-05**: System generates requirement lists from job postings (LLM-based)
- [ ] **CORE-06**: System maps each requirement to evidence items with confidence scores
- [ ] **CORE-07**: System identifies gaps (requirements with no supporting evidence)
- [ ] **CORE-08**: User can manually edit/remove evidence mappings
- [ ] **CORE-09**: User can view role brief showing: fit summary, requirement→evidence map, gaps, recommended emphasis

#### Proof-Based Ranking

- [ ] **CORE-10**: System ranks roles by weighted factors: fit + freshness + evidence coverage
- [ ] **CORE-11**: User can view Fresh Match Queue with ranked roles
- [ ] **CORE-12**: Each role card shows fit score, freshness indicator, evidence coverage %, and next action

### SUPPORT: Minimal Infrastructure (To Enable Core)

#### Auth (Bare minimum)

- [ ] **SUPP-01**: User can create account with email/password
- [ ] **SUPP-02**: User session persists across refresh
- [ ] **SUPP-03**: User can reset password via email

#### Job Monitoring (Feed the core)

- [ ] **SUPP-04**: User can define target criteria (function, location, visa, companies)
- [ ] **SUPP-05**: System fetches roles from supported sources
- [ ] **SUPP-06**: System normalizes job data for ranking

#### Tracking & Output (Complete the loop)

- [ ] **SUPP-07**: User can mark role status (Ignore/Save/Apply/Applied)
- [ ] **SUPP-08**: User can export proof summary for a role
- [ ] **SUPP-09**: System sends email alert for new high-fit roles
- [ ] **SUPP-10**: Audit trail stores parser confidence and user corrections

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Evidence

- **EVID-V2-01**: LinkedIn integration for work history
- **EVID-V2-02**: Transcript upload and GPA extraction
- **EVID-V2-03**: Evidence versioning (track resume changes over time)
- **EVID-V2-04**: GitHub commit activity enrichment (language stats, contribution patterns)

### Advanced Matching

- **MATCH-V2-01**: Outcome-based ranking improvements (learn from successful applications)
- **MATCH-V2-02**: Company culture fit scoring
- **MATCH-V2-03**: Salary range compatibility checking

### Engagement

- **ENGAG-V2-01**: Chrome extension for save-to-queue
- **ENGAG-V2-02**: Mobile push notifications
- **ENGAG-V2-03**: Weekly digest emails with queue changes
- **ENGAG-V2-04**: In-app notification center

### Collaboration

- **COLLAB-V2-01**: Share role briefs with mentors/coaches
- **COLLAB-V2-02**: Career coach review mode
- **COLLAB-V2-03**: Peer feedback on evidence quality

### Employer Features

- **EMPLOY-V2-01**: Employer dashboard (two-sided marketplace)
- **EMPLOY-V2-02**: Verified skills badges
- **EMPLOY-V2-03**: Recruiter outreach suggestions

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| One-click mass apply | Destroys product quality and differentiation; contradicts proof-first philosophy |
| Generic full-time job support | Broadens ICP too early; internship-only wedge is strategic |
| Social graph scraping / warm-intro crawling | High complexity, trust risk, platform risk; not core to V1 proof |
| Live interview copilot | Adjacent, ethically messy, not core to V1 validation |
| Cover letter generator | Commodity feature, low leverage, doesn't differentiate |
| Health/sleep/workout tracking | Mission creep into lifestyle software |
| Community feed / social layer | Zero need for V1 validation; adds complexity without proving core value |
| OAuth providers (Google, GitHub, LinkedIn login) | Email/password sufficient for V1; can add later if needed |
| Real-time chat / messaging | Not core to application workflow |
| Video interview recording/analysis | Out of scope for proof-first positioning |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | TBD | Pending |
| CORE-02 | TBD | Pending |
| CORE-03 | TBD | Pending |
| CORE-04 | TBD | Pending |
| CORE-05 | TBD | Pending |
| CORE-06 | TBD | Pending |
| CORE-07 | TBD | Pending |
| CORE-08 | TBD | Pending |
| CORE-09 | TBD | Pending |
| CORE-10 | TBD | Pending |
| CORE-11 | TBD | Pending |
| CORE-12 | TBD | Pending |
| SUPP-01 | TBD | Pending |
| SUPP-02 | TBD | Pending |
| SUPP-03 | TBD | Pending |
| SUPP-04 | TBD | Pending |
| SUPP-05 | TBD | Pending |
| SUPP-06 | TBD | Pending |
| SUPP-07 | TBD | Pending |
| SUPP-08 | TBD | Pending |
| SUPP-09 | TBD | Pending |
| SUPP-10 | TBD | Pending |

**Coverage:**
- v1 requirements: 22 total (12 CORE + 10 SUPPORT)
- Mapped to phases: 0 (pending roadmap creation)
- Unmapped: 22 ⚠️

---
*Requirements defined: 2026-03-08*
*Last updated: 2026-03-08 after initial definition*
