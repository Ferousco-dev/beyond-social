---
id: onboarding-and-empty-state-copy-failure-vs-empty
title: A failed generation is never dressed as an empty state
category: copywriting
subcategory: onboarding-and-empty-state-copy
tags: [error-state, empty-state, generation-failure, trust]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, short-form-video]
  styles: []
source: authored
version: 1
priorQuality: 0.91
---

When a video generation fails, the result list still shows zero items, but
that zero must never be rendered with the same "nothing here yet" copy used
for a true empty state, because the user knows something happened and needs
to know it went wrong.

- Detect and copy for three distinct zero-item causes separately: never
  started, still processing, and failed. Collapsing any two into one empty
  state component is the bug.
- Name what failed and why, in plain terms, when the cause is known: "This
  shot failed because the reference image was too low-resolution," not a
  generic "Generation failed."
- Offer the recovery action inline, not a link elsewhere: "Retry with the same
  prompt" or "Edit and try again."
- State plainly whether the retry spends credits or is free. Ambiguity about
  cost on a failure state is what turns a rendering bug into a support ticket.
- Keep the tone matter-of-fact. A failure is not the place for onboarding
  enthusiasm or brand personality.

Why: a user who just watched a progress bar for forty seconds and lands on the
same empty-gallery copy shown to brand-new signups will assume the product
silently discarded their work, which is a worse trust failure than the
generation error itself, because it leaves them unable to tell whether their
attempt even registered.

Example: "This generation failed: the prompt included a brand name our model
can't render accurately. Remove it and retry, no credits were charged."
Counter-example: showing the standard "No videos yet. Generate your first
one!" empty state after a failed render, indistinguishable from having never
tried at all.
