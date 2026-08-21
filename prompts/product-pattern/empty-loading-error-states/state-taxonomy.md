---
id: empty-loading-error-states-state-taxonomy
title: The three-state contract, empty, loading, and error are not interchangeable
category: product-pattern
subcategory: empty-loading-error-states
tags: [empty-state, loading-state, error-state, ux-heuristic]
applicability:
  platforms: [web, mobile]
  productTypes: [landing-page, saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Each of the three non-happy-path states answers a different question the user is
silently asking, and reusing one state's treatment for another leaves that
question unanswered.

- Loading answers "is this working?" It must communicate that the system
  received the request and is making progress, on a timescale the user can
  calibrate against.
- Empty answers "is this broken, or is there genuinely nothing here?" It must
  distinguish a valid zero from a hidden failure and, where the user can act,
  tell them what to do next.
- Error answers "what happened, and what can I do about it?" It must name the
  failure at a level the user can act on and offer the specific next step, not
  a generic apology.
- Never let one borrow another's UI: a blank screen during a slow fetch reads
  as broken (mistaken for empty), and a spinner that never resolves into an
  error reads as frozen (mistaken for loading).

Why: users do not read state labels, they infer state from the pixels. A screen
that renders identically whether it is loading, empty, or broken destroys the
signal the state was supposed to carry, and the user's only recourse is to
guess, usually by reloading, which duplicates the request-error-reload cycle
without producing new information.

Example: a feed component ships three explicit render branches: `<FeedSkeleton>`,
`<FeedEmpty cta="Create your first post" />`, `<FeedError onRetry={refetch} />`,
selected by request status, never inferred from `data.length === 0`.
Counter-example: rendering `data?.length ? <Feed /> : <EmptyIllustration />` for
every non-success case, so a network failure silently displays the "no posts
yet" empty state and the user never learns anything failed.
