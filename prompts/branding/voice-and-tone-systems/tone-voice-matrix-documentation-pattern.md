---
id: voice-and-tone-systems-tone-voice-matrix-documentation-pattern
title: Documenting tone as a matrix, not a list of examples
category: branding
subcategory: voice-and-tone
tags: [tone, documentation, style-guide, governance]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

A tone guide that's just a list of good and bad example sentences doesn't
generalize — writers can only pattern-match to examples they've seen. A
matrix that crosses situations against dials generalizes to situations the
guide's authors never wrote an example for.

- Build the matrix with situations as rows (error, success, empty state,
  destructive action, billing, loading, onboarding) and tone dials as
  columns (formality, energy, warmth, humor-permission).
- Score each cell on a simple 1–3 scale rather than free text — "energy: 1"
  is faster to apply consistently than a paragraph of guidance, and faster
  to audit for outliers.
- Add one worked example sentence per cell, but treat the score as the
  source of truth and the example as illustration — when they conflict in
  review, trust the score and rewrite the example.
- Keep the matrix to a single page; if it needs a second page, the
  situations list is too granular and should be collapsed into broader
  categories.
- Version the matrix alongside the voice definition — when the brand voice
  changes, every cell's baseline shifts, so the matrix should be reviewed as
  a whole, not patched cell by cell.

Why: a matrix forces the team to make every situation-by-dial tradeoff
explicit and comparable, which surfaces inconsistencies ("why is energy
higher in loading states than in celebration states?") that a prose style
guide hides inside separate paragraphs a reader never cross-references.

Example: row "destructive action," columns formality: 3, energy: 1, warmth:
1, humor: 0 — a reviewer can check any new delete-confirmation string
against those four numbers without re-reading the whole guide.

Counter-example: a 40-page brand voice doc with dozens of example sentences
but no explicit scoring — two writers reading it independently produce
noticeably different tone for the same new situation, because there's
nothing to check a draft against beyond taste.
