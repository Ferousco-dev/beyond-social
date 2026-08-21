---
id: search-and-filter-patterns-range-filter-input-pattern
title: Pairing a slider with numeric inputs for range filters
category: layout
subcategory: search-and-filter
tags: [range-filter, slider, price-filter, forms]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce, saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A slider alone is bad at precision and a pair of number inputs alone is bad at
giving a sense of the full range, so the durable pattern for price, date, or
any bounded numeric facet is both at once, kept in sync.

- Show a dual-handle slider with the full data range as its bounds, plus two
  editable number inputs (min/max) directly below or beside it.
- Dragging a handle updates the corresponding input live; typing in an input
  moves the corresponding handle on blur or Enter, not on every keystroke.
- Label the slider's absolute min and max at each end so the user knows the
  scale they're working within before touching anything.
- Snap slider steps to sensible increments for the data (whole dollars for
  price under $100, five-dollar steps above that) rather than raw pixel-to-
  value mapping, which produces ugly values like "$47.32".
- Don't auto-apply on every drag tick; apply on release (slider) or blur
  (inputs) so the result grid isn't refetching dozens of times per second.

Why: sliders communicate the shape of the range at a glance but are clumsy for
an exact target ("under $50 exactly"), while raw number inputs are precise but
give no feel for where a value sits in the distribution; combining them serves
both the browser and the shopper with a specific number in mind.

Example: a slider from $0-$500 with handles at $25 and $150, and inputs
reading "$25" / "$150" beside it, both updating together.
Counter-example: a slider with no numeric inputs and no visible current values,
so the only way to check what's selected is to squint at handle position
against unlabeled tick marks.
