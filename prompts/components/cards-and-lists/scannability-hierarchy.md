---
id: cards-and-lists-scannability-hierarchy
title: Building scannable visual hierarchy in lists
category: component
subcategory: cards-and-lists
tags: [scannability, hierarchy, typography, alignment]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, landing-page, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

A scannable list has at most three type-weight tiers and a fixed field position that never changes row to row — the eye should be able to pattern-match rows without fixating on each one individually.

- Cap hierarchy at three tiers: primary (title, boldest/darkest), secondary (the one decision-relevant metadata field, medium weight), tertiary (everything else, lightest, smallest).
- Align the same field to the same x-position across every row or card — a ragged left edge forces the eye to re-search for each field instead of predicting where it lives.
- Reserve color for meaning only. If status uses red/amber/green, nothing else in the same list may use those hues decoratively, or the color channel stops signaling anything.
- Show only the fields that change the user's next decision on this screen; push the rest behind a detail view rather than adding a fourth tier to fit them in.
- Keep the primary field's truncation point consistent (same character count or px width) so the visual rhythm of the column doesn't jump between rows.

Why: this is eye-tracking, not taste. A consistent grid lets peripheral vision recognize a row's shape and skip it if irrelevant, turning list-scanning into a fast repeated saccade instead of a per-row search task. Every inconsistency — a shifted field, a decorative color, a fourth tier of information — forces a fixation the eye wouldn't otherwise need, which is measurable as slower task completion on any list past a handful of items.

Example: "32px thumbnail left, bold 15px title, status pill right-aligned, 12px gray timestamp always in the same x position."
Counter-example: a list where the date sometimes sits left of the title and sometimes right, and the status color is reused as a background tint on unrelated tags — every row now needs full reading, not scanning.
