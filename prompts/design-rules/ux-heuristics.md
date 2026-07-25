---
id: ux-heuristics-nielsen
title: Core usability heuristics
category: ux-heuristic
tags: [usability, heuristics, feedback, error-prevention]
applicability:
  platforms: [web, mobile]
  productTypes: []
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

The durable usability heuristics, applied concretely:

- Visibility of system status: every action gets immediate feedback. Optimistic
  UI for fast paths; clear progress for slow ones (generation, upload).
- Match the real world: use the user's words, not internal jargon.
- User control: make destructive actions undoable (undo beats a confirm dialog);
  always provide an exit.
- Consistency: same thing looks and behaves the same everywhere; follow platform
  conventions rather than inventing.
- Error prevention over error messages: disable impossible actions, validate
  inline, constrain inputs so mistakes are hard to make.
- Recognition over recall: show options and recent context rather than making the
  user remember.
- Aesthetic and minimal: every extra element competes with the essential ones.

Why: these predict measured task success and error rates across a huge range of
products; they are the cheapest quality wins available.

Example: a generate button that immediately shows a pending card with progress,
and an undo toast after delete. Counter-example: a spinner with no context, a
modal confirm on every action, and validation that only fires on submit.
