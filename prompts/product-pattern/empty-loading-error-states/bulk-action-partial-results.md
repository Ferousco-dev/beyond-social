---
id: empty-loading-error-states-bulk-action-partial-results
title: A bulk action's outcome is a report, not a single pass/fail state
category: product-pattern
subcategory: empty-loading-error-states
tags: [error-state, bulk-actions, saas-dashboard, ux-heuristic]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

When a user triggers an action against many items at once, the realistic
outcome is "most succeeded, a few failed," and collapsing that into a single
success or error toast either hides real failures or overstates a mostly-fine
result as a total failure.

- Process items independently and track per-item outcome, don't let the whole
  batch fail because one item hit a conflict or validation error.
- Report a summary, not a binary: "18 of 20 updated. 2 failed: 'Invoice #4021'
  (locked), 'Invoice #4033' (permission denied)." Name the failed items and
  the reason, not just a count.
- Give a scoped retry that resubmits only the failed subset, never force the
  user to re-select and rerun the entire batch to fix the 2 that failed.
- Show progress during the batch itself for anything over a few seconds (a
  counter, "Processing 14 of 20…"), since bulk operations are exactly the
  kind of multi-second task that needs its own loading state, not a spinner
  that gives no sense of scale.
- If the batch is large enough to run asynchronously (hundreds or thousands
  of items), don't block the UI at all, queue it and notify on completion
  with the same success/fail breakdown.

Why: bulk actions operate on independent items, so their failure mode is
naturally partial, and any UI that reduces that to one status bar either
buries which specific items need attention (a vague "some items failed") or
panics the user with a full failure banner when 90% of the batch actually
worked. A named, itemized report is what lets the user fix exactly what broke
without re-doing what already succeeded.

Example: bulk-archiving 50 conversations shows "47 archived, 3 skipped
(already archived by another user)" with the 3 named and a "Dismiss" action,
no need to touch the 47 that worked.
Counter-example: the same bulk archive shows a single red toast, "Bulk action
failed," the moment any one of the 50 hits a conflict, with no indication the
other 49 actually succeeded, prompting the user to retry the whole batch and
risk re-archiving items twice.
