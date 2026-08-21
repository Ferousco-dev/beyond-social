---
id: cards-and-lists-empty-states
title: Differentiating empty list states
category: component
subcategory: cards-and-lists
tags: [empty-state, onboarding, error-handling, copy]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, onboarding, landing-page]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

An empty list needs to tell the user which of three situations they're in — no data yet, no results for this filter, or an error — because each demands a different next action.

- "No data yet" (first use, nothing created): an inviting illustration and a direct CTA ("Create your first project"). This is the only empty state that should feel promotional.
- "No results" (filter or search returned nothing): show exactly what was searched for and offer a one-click way to clear it, not a generic "Nothing here."
- Error (fetch failed): a retry action and, where relevant, a status link — never phrase this as if the user did something wrong.
- Never reuse the same graphic and copy across all three cases; a single generic empty state erases the signal that tells the user what to do next.
- Keep the empty-state CTA scoped to the action available on this exact screen — don't route a "no results" empty state to a full onboarding flow meant for zero-data.

Why: users conflate "there's nothing here" with "something is broken" whenever the empty state doesn't specify which is true. Specific messaging turns a dead end into a directed next step, and this matters disproportionately at the zero-data state, since for many products that empty screen is the first real interaction a new user has with the product after signup — a vague or broken-feeling empty state there reads as evidence the whole product is unfinished.

Example: "No videos match “Q3 launch.” Clear filters to see all 12 projects."
Counter-example: a generic "Nothing here" message and icon shown identically whether the user has never created a project or their search just returned zero matches — both look like the same dead end.
