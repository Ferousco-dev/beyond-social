---
id: search-and-filter-patterns-filter-logic-communication
title: Making AND/OR facet logic visible instead of implicit
category: layout
subcategory: search-and-filter
tags: [filter-logic, facets, boolean, information-architecture]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce, saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Most faceted search silently applies OR logic within a facet group (Red OR
Blue) and AND logic across groups (Color AND Price), and most users never
learn that distinction because nothing in the UI states it. The moment
someone selects two brands expecting to narrow, but the count goes up instead
of down, that trust breaks.

- Use checkboxes, not radio buttons, for any facet where OR-within-group is
  the actual behavior, since the input type itself is the clearest signal of
  multi-select.
- When a facet is genuinely AND (an "all of these tags required" filter,
  common in project or asset search), label the group explicitly: "Tags
  (must match all)" rather than leaving it ambiguous.
- Reflect the logic in the applied-filter chip row: within-group OR values can
  render as one combined chip ("Red or Blue") while cross-group AND values
  stay as separate chips.
- Watch the result count as confirmation: if selecting a second checkbox in a
  group ever decreases the count, the logic is wrong for that input type and
  will read as a bug regardless of what's documented.
- For a facet that's genuinely exclusive (only one value can apply, like a
  single "In Stock Only" toggle), use a switch or single checkbox, never a
  multi-select control that implies more than one option is choosable.

Why: the input control is the only place most users ever learn a system's
filter logic, since nobody reads help text before filtering — so the checkbox,
radio, or toggle chosen for a given facet is a promise about behavior, and
breaking that promise (say, checkboxes that behave like AND) reads as broken
software even when it's working as coded.

Example: "Size" as checkboxes with the result count rising when a second size
is added, plus a combined chip reading "Size: S or M."
Counter-example: checkboxes on a "Tags" facet that silently apply AND logic,
so selecting "Outdoor" and "Waterproof" makes the count drop to zero with no
label explaining why two selections behaved like a narrower, not broader,
search.
