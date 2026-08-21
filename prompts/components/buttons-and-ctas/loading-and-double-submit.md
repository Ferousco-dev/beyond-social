---
id: buttons-and-ctas-loading-and-double-submit
title: Loading state and double-submit prevention
category: component
subcategory: buttons-and-ctas
tags: [buttons, loading, forms, async]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, e-commerce, auth, onboarding]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Any button that triggers a network request needs a loading state that both
reassures the user something is happening and physically blocks a second
click from firing a duplicate request.

The recipe:

- On click, immediately swap the label for a spinner (or add a spinner
  alongside a "Saving…" label) and set the button to disabled/aria-disabled in
  the same render pass — there should be zero frames where the button is both
  clickable and mid-request.
- Lock the button's width to its pre-loading size so the layout doesn't jump
  when the label is replaced by a smaller spinner.
- Keep the loading state on-brand: a spinner in the button's foreground color,
  not a generic browser default, and sized to roughly 60-70% of the label's
  line height.
- For requests under ~300ms, still show the loading state — skipping it for
  "fast enough" requests creates inconsistent behavior that reads as a bug
  when the network is briefly slow.
- On error, return to the enabled default state with the error surfaced
  separately (toast or inline message), not encoded in the button itself.
- For destructive or payment actions, add a client-side submission lock (a ref
  or flag, not just the disabled attribute) since disabled can be
  circumvented by rapid double-taps registering before the re-render commits.

Why: users who don't see feedback within roughly 100ms of a click assume the
click failed and click again. Without a hard lock, that second click can fire
a second charge, a second account creation, or a duplicate record — a UI
polish issue that becomes a data-integrity issue.

Example: "Place order" becomes a fixed-width button showing only a spinner,
disabled at the exact moment of click, re-enabled only on error response.

Counter-example: a "Pay now" button that stays clickable while the request is
in flight, letting an impatient double-tap submit two charges.
