---
id: empty-loading-error-states-cross-state-visual-system
title: Empty, loading, and error states need one shared visual grammar, not three
category: product-pattern
subcategory: empty-loading-error-states
tags: [design-system, visual-hierarchy, error-state, empty-state]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

If every team or feature invents its own icon, color, and layout for empty,
loading, and error states, the product ends up with a dozen visual dialects
for the same three concepts, and users have to relearn what a state means
every time they hit a new screen.

- Define one component per state (EmptyState, LoadingState, ErrorState) with
  a fixed anatomy: icon/illustration slot, headline, body copy, optional
  primary action, taking the same props everywhere they're used.
- Assign each state a consistent color and icon family from the design
  tokens, not per-feature choices: e.g. neutral gray for empty, brand-accent
  motion for loading, a single error color reserved only for error (never
  reused for warnings or empty states).
- Keep illustration style, if used, from one shared set at one consistent
  weight and level of detail, not a mix of hand-drawn illustrations in one
  feature and flat icons in another.
- Vary copy and the specific action per screen, that's expected, but never
  vary the underlying layout, icon language, or color mapping; consistency
  lives in the frame, variation lives in the content inside it.
- Audit new features before shipping; a novel color or icon on an empty state
  signals the shared component wasn't reused.

Why: users build a mental model of what a red icon means, what a gray
illustration means, largely below conscious awareness, and that model only
forms if the mapping holds across the whole product. A consistent grammar
means a user who has never seen a specific screen before can still correctly
read its state at a glance, purely from color and icon, before reading a
word of copy.

Example: every error state in the product uses the same `<ErrorState>`
component with the same warning-triangle icon and the same error-red token,
whether it's a failed chart, a failed form submit, or a failed page load.
Counter-example: the billing team ships a custom illustrated "uh oh" error
graphic in purple while the rest of the product uses a red triangle icon,
so users can't tell at a glance that the purple screen is even an error.
