---
id: empty-loading-error-states-optimistic-ui-loading-contract
title: Optimistic UI replaces the loading state with a rollback contract
category: product-pattern
subcategory: empty-loading-error-states
tags: [loading-state, optimistic-ui, error-state, saas-dashboard]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Optimistic UI intentionally skips the loading state for the action itself, so
its error state carries more weight than usual: it has to visibly undo
something the user already saw succeed.

- Apply the change to the UI immediately (checkbox ticks, item moves, count
  increments) with no spinner, since the point is to feel instantaneous.
- Keep a small, low-attention pending indicator if the mutation is slow
  relative to the UI change, a subtle dimming or a tiny sync icon, not a
  blocking spinner over the changed element.
- On success, do nothing visible beyond removing the pending indicator, the
  change is already there.
- On failure, revert the UI to its prior state and surface the error at the
  point of the reverted change, not as a disconnected toast the user has to
  connect back to an action they've already mentally moved past.
- Never leave a reverted optimistic change unexplained; a checkbox that
  silently un-checks itself two seconds later reads as a bug, not an error.

Why: optimistic UI trades a visible loading state for speed, but that trade
only holds if failures are rare and, when they happen, clearly narrated. If
the revert is silent, the user loses trust in every future optimistic update
because they can no longer tell whether what they see reflects reality.

Example: a Kanban card moves columns instantly on drag; if the server save
fails, the card animates back to its original column and a small toast reads
"Couldn't move card, moved back."
Counter-example: the card moves instantly, the save silently fails in the
background, and the card stays in the new column showing state that
diverges from the server with no indication anything went wrong.
