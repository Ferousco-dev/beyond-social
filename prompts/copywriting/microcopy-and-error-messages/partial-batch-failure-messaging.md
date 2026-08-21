---
id: microcopy-and-error-messages-partial-batch-failure
title: Partial batch failures report status per item, not one rolled-up state
category: copywriting
subcategory: microcopy-and-error-messages
tags: [errors, batch-jobs, multi-shot, ux-writing]
applicability:
  platforms: [web, mobile]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

When a multi-shot or batch generation partially succeeds, a single rolled-up pass/fail summary throws away exactly the information the user needs, because the successful outputs in that same batch are already usable and shouldn't be held hostage to the failed ones.

- List each shot or item with its own status line, not just a summary count like "3 of 5 failed."
- Let the user retry only the failed items without resubmitting or re-paying for the ones that already succeeded.
- Keep successful outputs visible and usable immediately, never gated behind the resolution of the failed ones.
- Name the failure reason per item, since a batch commonly fails for different reasons on different items in the same run.
- Sort or flag the failed items first so the user doesn't have to scan the whole batch to find what needs attention.

Why: batch operations are exactly where a single rolled-up status does the most damage, because a user who sees "batch failed" for the whole run will often discard or blanket-retry everything, throwing away outputs that were already correct and burning credits redoing work that didn't need it.

Example: "4 of 6 shots rendered. Shot 3 failed (source image too small); Shot 5 failed (script exceeded 8s limit)." [Retry shots 3, 5]

Counter-example: "Batch generation failed." with no per-shot detail — the user can't tell which of the six outputs are actually safe to use and which need fixing.
