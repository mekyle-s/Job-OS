---
status: complete
phase: 04-job-data-pipeline
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md, 04-05-PLAN.md]
started: 2026-03-23T00:00:00Z
updated: 2026-03-23T03:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Set up target criteria
expected: Navigate to /dashboard/criteria page. Form allows entering job function (text), locations (multi-chip), visa sponsorship (checkbox), and target companies (multi-chip, max 15). Shows transparency notice: "We currently monitor Greenhouse job boards". After saving, shows success message.
result: pass

### 2. Load existing criteria
expected: If criteria was previously saved, navigating to /dashboard/criteria should populate the form with saved values (function, locations, visa status, companies).
result: pass

### 3. Company limit validation
expected: When trying to add more than 15 companies to the criteria form, the UI should prevent adding more or show validation error "Maximum 15 companies".
result: pass

### 4. Dashboard shows jobs section
expected: Dashboard page (/dashboard) displays a "Jobs" section with links to "Set up job criteria" or "Edit job criteria" (depending on whether criteria exists) and "Browse jobs". Shows status like "Monitoring X companies" or "No criteria set up yet".
result: pass

### 5. View job listings
expected: Navigate to /dashboard/jobs. If criteria is set but no jobs polled yet, shows "No jobs found yet. Jobs are polled hourly — check back soon!". If jobs exist, displays job cards showing title (clickable), company, location, freshness indicator (New/Updated/time ago), parse status (completed/processing/pending/failed), and requirement count if parsed.
result: pass

### 6. Trigger manual job poll
expected: Navigate to /dashboard/jobs and trigger a manual poll via /api/jobs/poll endpoint (may need to call directly or via UI button if available). Poll should fetch jobs from Greenhouse for user's target companies.
result: pass

### 7. Job freshness indicators
expected: After jobs are polled, job cards show appropriate freshness badges - green "New" badge if job appeared within 24 hours, blue "Updated" badge if job was updated within 24 hours, or gray text showing relative time like "3 days ago".
result: pass

### 8. Job detail page loads
expected: Click on a job title from the listings page. Job detail page (/dashboard/jobs/[id]) opens showing job information section (title, company, location, posted date, link to original posting, parse status, freshness indicator).
result: pass

### 9. Requirements display grouped by category
expected: On job detail page, requirements section displays requirements grouped by category (Technical Skill, Experience, Education, Soft Skill, Other). Each category is collapsible with a count. Each requirement shows normalized text, priority badge (Required/Preferred/Unknown), source text below (in muted font), review status badge, and edit/delete buttons.
result: pass

### 10. Edit requirement priority
expected: Click on priority badge for a requirement to toggle between Required, Preferred, Unknown. Change is saved immediately via API and updates the display. If manually edited, shows small "Edited" indicator.
result: pass

### 11. Edit requirement text
expected: Click edit button on a requirement to edit the normalized text. Opens inline edit form or modal. After saving, updates the requirement text via API and shows "Edited" indicator. Source text remains visible and unchanged.
result: pass

### 12. Delete requirement
expected: Click delete button on a requirement. Shows confirmation dialog. After confirming, removes the requirement from the display and deletes via API with audit trail.
result: pass

### 13. Add manual requirement
expected: Click "Add Requirement" button at bottom of requirements section. Opens form with category dropdown, priority dropdown, and normalized text input. After submitting, creates new requirement via API and appears in the appropriate category group.
result: pass

### 14. Source text preservation
expected: When editing a requirement's normalized text or priority, the source text (original text from job posting) remains visible and uneditable. Source text appears below the normalized text in smaller, muted font.
result: pass

### 15. Requirement extraction background job
expected: When a new job is polled and stored, the system automatically queues a requirement extraction job. The parse status shows "processing" while extraction runs, then changes to "completed" when requirements are extracted, or "failed" if extraction errors.
result: pass

### 16. Cron endpoint security
expected: The /api/cron/poll-jobs endpoint requires CRON_SECRET bearer token authorization. Requests without valid token return 401 Unauthorized.
result: pass

### 17. Jobs marked inactive when removed from source
expected: When a job disappears from Greenhouse (no longer returned in latest fetch), the system marks it as inactive (isActive = false) to prevent showing stale job listings.
result: skipped
reason: Cannot verify without waiting for job to be removed from Greenhouse

### 18. Requirement audit trail
expected: All requirement modifications (edits, deletions, manual additions) create audit trail entries tracking userId, timestamp, action, and before/after values. Audit trail is queryable via getRequirementAuditTrail function.
result: pass

## Summary

total: 18
passed: 17
issues: 0
pending: 0
skipped: 1

## Gaps

[none - all issues fixed during testing]
