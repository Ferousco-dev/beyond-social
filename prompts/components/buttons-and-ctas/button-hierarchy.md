---
id: buttons-and-ctas-hierarchy
title: Establishing button hierarchy
category: component
subcategory: buttons-and-ctas
tags: [buttons, hierarchy, visual-weight, cta]
applicability:
  platforms: [web, mobile]
  productTypes: [landing-page, saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.91
---

A screen needs exactly one button that reads as "the thing to do here." Everything
else is a supporting action, and its styling should say so before the label does.

The recipe:

- Primary: solid fill, brand color, highest contrast. One per view, sometimes one
  per screen section if sections are independently scrollable.
- Secondary: outline or subtle-fill, same size as primary, lower visual weight.
  For actions that matter but aren't the goal (e.g. "Cancel" next to "Save").
- Tertiary / ghost: text-only or minimal-chrome, for low-commitment actions
  ("Learn more", "Skip").
- Destructive: its own treatment (see the destructive-confirmation pattern),
  never just "secondary but red."
- Never give two buttons in the same view identical visual weight if they don't
  have identical importance — the user should not have to read labels to know
  which one you want them to click.

Why: hierarchy is a visual argument about priority. If every button looks equally
loud, the interface is asking the user to do the prioritization work that the
designer should have done. A single dominant action also reduces decision
fatigue and measurably increases the target action's completion rate, because
there is no competing visual claim on attention.

Example: a pricing card with a solid "Start free trial" button and a plain-text
"Compare plans" link beneath it, not beside it at equal weight.

Counter-example: three outline buttons of identical size and color ("Save",
"Export", "Delete") in a row, forcing the user to read every label because
nothing distinguishes primary intent from secondary from destructive.
