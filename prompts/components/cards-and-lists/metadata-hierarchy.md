---
id: cards-and-lists-metadata-hierarchy
title: Choosing which metadata earns a place in the row
category: component
subcategory: cards-and-lists
tags: [metadata, content-design, timestamps, hierarchy]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, landing-page]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Every metadata field competing for a place on a card or row has to earn it by changing what the user does next — not by being interesting to know.

- Show only metadata that changes the user's next action on this screen (status, owner, recency); push everything else — exact ID, creation method, file size — to a detail view or a tooltip.
- Use relative timestamps ("3h ago") for recent items and switch to absolute dates ("Aug 14") past roughly a week; relative time past that point loses precision without gaining clarity.
- Pair icon-only metadata (a lock, an avatar) with a text label on first exposure, or provide a legend — icon-only rows assume the user has already memorized a private glyph language.
- Order fields left-to-right by decision priority, not database column order: if status is the primary triage signal, it goes before owner, which goes before timestamp.
- Cap stacked metadata under a title at two lines; a third line raises card height and directly halves how many items fit on screen, a scan-speed cost the field should have to justify.

Why: metadata isn't free — it competes with row height and scan speed, and the cost multiplies across every row in the list, not just the one being read. A field that "would be nice to know" on one card becomes a real tax on the whole list once repeated fifty times, so the working question for including any field is whether it changes what the user clicks next, not whether it's true and available.

Example: "status pill · owner avatar · '3h ago' — three fields, one line, ordered by decision priority."
Counter-example: a card stacking creation date, last-modified date, file size, resolution, and creator ID on separate lines — none of it answers whether the user should open this one.
