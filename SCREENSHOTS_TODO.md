# Screenshots To-Do List

Before fully publicizing this repo, capture these screenshots to showcase the project's functionality.

## 📸 Required Screenshots

### 1. **Evidence Bank - Upload & Parsed Resume**

**File**: `screenshots/01-evidence-bank.png`

**What to capture**:

- Dashboard with evidence list
- Show parsed evidence items with confidence scores
- Highlight different item types (experience, project, skill, education)

**How to get good data**:

```bash
1. Sign up for a new account
2. Go to /dashboard/evidence/upload
3. Upload your actual resume (PDF or DOCX)
4. Wait for parsing to complete
5. Navigate to /dashboard/evidence
6. Screenshot the full evidence list
```

---

### 2. **Fresh Match Queue**

**File**: `screenshots/02-match-queue.png`

**What to capture**:

- Queue page with 3-5 ranked job cards
- Show fit scores, coverage percentages, freshness indicators
- Display status filters (All / Save / Apply / Applied)

**How to get good data**:

```bash
1. Set up target criteria at /dashboard/criteria
   - Add companies: "Stripe", "Vercel", "OpenAI", etc.
   - Set job function: "Software Engineering"
   - Add locations: "San Francisco", "Remote"
2. Trigger job polling (or wait for cron)
3. Run matching for your profile
4. Navigate to /dashboard/queue
5. Screenshot the queue with ranked roles
```

---

### 3. **Role Brief - Requirement Mapping**

**File**: `screenshots/03-role-brief.png`

**What to capture**:

- Role brief page for a single job
- Show requirement → evidence mappings
- Highlight confidence bands, gaps, and proof excerpts
- Show manual editing controls

**How to get good data**:

```bash
1. From the queue, click on a high-fit role
2. View the role brief at /dashboard/roles/[jobId]/brief
3. Screenshot showing:
   - Job title, company, location
   - 3-5 requirements with mapped evidence
   - At least one gap (requirement with no evidence)
   - Confidence indicators
```

---

### 4. **Job Listings**

**File**: `screenshots/04-job-listings.png`

**What to capture**:

- Job listings page showing fetched jobs
- Company logos (if available), titles, locations
- Freshness indicators

**How to get good data**:

```bash
1. Navigate to /dashboard/jobs
2. Screenshot the job list with varied companies
```

---

### 5. **Evidence Form - Manual Entry**

**File**: `screenshots/05-evidence-form.png` (Optional but nice)

**What to capture**:

- Manual evidence creation form
- Show fields for title, company, dates, content

**How to get good data**:

```bash
1. Navigate to /dashboard/evidence/new
2. Screenshot the empty or partially filled form
```

---

## 🎨 Screenshot Tips

### Quality Guidelines

- **Resolution**: At least 1920x1080 (full HD)
- **Browser**: Chrome/Edge with dev tools closed
- **Zoom**: 100% (no browser zoom)
- **Theme**: Use light mode for better readability
- **Privacy**: Blur any personal emails or sensitive info

### Tools

- **Windows**: Win + Shift + S (Snipping Tool)
- **Mac**: Cmd + Shift + 4
- **Browser Extension**: Awesome Screenshot, Fireshot

### Composition

- Include enough context (navbar, page title)
- Center the important content
- Crop out empty whitespace
- Consistent window size across all screenshots

---

## 📁 Organization

Once captured, organize them:

```
screenshots/
├── 01-evidence-bank.png
├── 02-match-queue.png
├── 03-role-brief.png
├── 04-job-listings.png
└── 05-evidence-form.png (optional)
```

Then update `README.md` to include them:

```markdown
## 📸 Screenshots

### Evidence Bank

![Evidence Bank](./screenshots/01-evidence-bank.png)
_AI-powered resume parsing extracts structured evidence with confidence scores_

### Fresh Match Queue

![Match Queue](./screenshots/02-match-queue.png)
_Ranked opportunities by fit, freshness, and evidence coverage_

### Role Brief

![Role Brief](./screenshots/03-role-brief.png)
_Requirement-level evidence mapping with gaps and manual override controls_
```

---

## 🚀 Quick Screenshot Sprint (15-20 min)

1. **Seed database** with your resume + 3-5 demo jobs
2. **Run matching pipeline** to generate mappings
3. **Open each page** in a new browser window
4. **Screenshot all 4-5 views** in sequence
5. **Organize files** in `screenshots/` folder
6. **Update README.md** with image embeds
7. **Commit and push**

---

**Delete this file after screenshots are done!**
