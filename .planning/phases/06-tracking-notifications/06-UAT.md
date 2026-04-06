---
status: diagnosed
phase: 06-tracking-notifications
source:
  - 06-01-SUMMARY.md
  - 06-02-SUMMARY.md
  - 06-03-SUMMARY.md
started: 2026-04-06T00:00:00Z
updated: 2026-04-06T00:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. View Queue Filter Bar

expected: Queue page displays a filter bar at the top showing status options: All Roles, Saved, To Apply, Applied, Ignored. Each option should be clickable.
result: pass

### 2. Filter Queue by Status

expected: Click "Saved" filter - URL updates to include ?status=save parameter and queue shows only roles marked as Saved. Other roles are hidden.
result: issue
reported: "the tiers are \"ignore\", \"save\", \"apply\", Applied\", and \"All\" the only tier that is showing things are the \"All tier\" the rest are empty but in the url it shows things like \"=save\" accordingly"
severity: major

### 3. Mark Role Status from Card

expected: Click a status button (Ignore/Save/Apply/Applied) on any role card in the queue. Button becomes highlighted immediately (optimistic update) and status persists.
result: pass

### 4. Status Persists After Refresh

expected: After marking a role with a status, refresh the page. The role card should still show the marked status (not reset to default).
result: pass
note: "User observed: roles disappear from queue after a couple minutes, requiring manual poll trigger. However, marked statuses persist correctly across polls - this is a separate queue refresh issue."

### 5. Access Export Page from Role Brief

expected: Open any role's brief page (/dashboard/roles/[jobId]/brief). Page shows "Export PDF" button in header. Click button navigates to export page.
result: pass

### 6. Export Page Shows Proof Summary

expected: Export page displays print-optimized layout with role details (title, company), requirement list, and matched evidence items with source excerpts. No navigation UI elements visible (print-friendly).
result: pass

### 7. Export to PDF via Print Dialog

expected: On export page, use browser's print function (Ctrl+P or Cmd+P). Print dialog opens showing formatted document ready for "Save as PDF" option.
result: pass
note: "Layout spans 2 pages: page 1 has fit summary/company/title with excess white space, page 2 has gaps/requirements. Functional but pagination could be optimized."

### 8. Shareable Filter URLs

expected: Set queue filter to "To Apply" (URL shows ?status=apply). Copy URL, open in new browser tab. New tab should load with "To Apply" filter already selected and applied.
result: pass

### 9. Clear Filters Returns to All Roles

expected: With an active filter, click "All Roles" filter option. URL param clears (?status= removed), queue shows all roles regardless of status.
result: pass

## Summary

total: 9
passed: 8
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Queue filters show only matching roles when status filter is selected"
  status: failed
  reason: "User reported: the tiers are \"ignore\", \"save\", \"apply\", Applied\", and \"All\" the only tier that is showing things are the \"All tier\" the rest are empty but in the url it shows things like \"=save\" accordingly"
  severity: major
  test: 2
  root_cause: "Filter logic performs strict equality check (roleStatus?.status === statusFilter) which fails for newly matched roles that have status = null by default. null !== 'save' causes all unstatused roles to be filtered out."
  artifacts:
  - path: "src/app/dashboard/queue/page.tsx"
    issue: "shouldShow() function (lines 148-159) doesn't handle null status"
  - path: "src/lib/hooks/use-role-status.ts"
    issue: "Returns null status for untracked roles (line 27) - correct behavior but not handled by filter"
    missing:
  - "Add logic to handle null-status roles in filter (show in 'all' or add 'unreviewed' filter)"
  - "Update shouldShow() to treat null status appropriately for each filter type"
    debug_session: ".planning/debug/queue-filter-empty-results.md"
