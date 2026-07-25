---
id: empty-states-first-run
title: Empty states that onboard
category: layout
subcategory: empty-state
tags: [empty-state, onboarding, first-run]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

An empty state is the most-seen screen for a new user and the least-designed. Treat
it as onboarding, not an error. It should teach the value of the space and offer a
single first action that produces a win.

Structure: a one-line explanation of what will live here, one primary action to
create the first item, and optionally a way to seed with a sample or template so
the user sees a populated state immediately. Avoid a lonely icon and the word
"No data". Never show an empty chart axis with nothing on it.

Why: the first-run experience sets the mental model. A clear next action reduces
time-to-value, the single strongest predictor of activation and retention. A dead
empty state reads as "broken" and drives early churn.

Example: "Your videos will appear here. Generate your first one from a product
photo." with a primary "New video" and a secondary "Use a sample project".
Counter-example: a grey cloud icon, "No videos found", and no way forward.
