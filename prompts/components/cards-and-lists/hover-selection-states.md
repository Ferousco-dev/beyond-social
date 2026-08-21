---
id: cards-and-lists-hover-selection-states
title: Layering hover, selected, and focus states
category: component
subcategory: cards-and-lists
tags: [interaction-states, accessibility, hover, focus]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, landing-page]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A list row needs at least four distinguishable states — default, hover, selected, and keyboard focus — and they must stay visually distinct in combination, not just individually, since a row can carry more than one at once.

- Default: no border or background change, content only.
- Hover (pointer devices only): a subtle background tint (roughly 2-4% opacity shift) or a 1px border — never a shadow-pop or elevation change that shifts layout on mouseover.
- Selected: a persistent left-edge accent bar or a filled background in a hue distinct from the hover tint, so a selected-and-hovered row still reads clearly as selected.
- Keyboard focus: a visible outline or ring that meets contrast requirements and is independent of hover or selected styling — keyboard users never trigger a hover state, so focus cannot borrow it.
- Disabled: reduce contrast and opacity while keeping primary text above roughly 4.5:1 contrast, and strip hover/selected affordances entirely so a disabled row never looks interactive.

Why: states compound — a row can be hovered, selected, and focused simultaneously. If every state is expressed through the same visual channel (background color alone), they collide and the user loses track of which state is actually active. Using separate channels for each state — background for hover, an accent bar for selection, an outline for focus — lets them layer independently and stay legible in any combination.

Example: "hover: bg tint 3%; selected: left 3px accent bar plus bg tint 6%; focus: 2px outline offset 2px, rendered regardless of hover state."
Counter-example: hover and selected both implemented as the same mid-gray background — a selected-but-not-hovered row is visually identical to a plain hovered row, so users lose track of their selection.
