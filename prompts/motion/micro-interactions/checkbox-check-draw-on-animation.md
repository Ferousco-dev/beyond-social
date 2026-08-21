---
id: micro-interactions-checkbox-check-animation
title: Checkbox check draw-on animation
category: motion
subcategory: interaction-design
tags: [checkbox, radio, forms, animation]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, e-commerce, onboarding]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

A checkbox's check mark should draw on stroke by stroke rather than fade or pop in,
because a drawn line mimics the physical act of marking a box, which is a more
legible metaphor than a generic appearance effect.

- Build the check as an SVG path and animate `stroke-dashoffset` from the path's
  full length down to 0 over 150-200ms, ease-out, so the mark appears to be drawn
  rather than materialized.
- Transition the box's background fill and border color simultaneously with the
  stroke draw, not before or after it; if the fill finishes first, the check
  looks like it's being drawn onto an already-decided box instead of being the
  thing that decides it.
- On uncheck, reverse quickly, around 100ms, without replaying the draw animation
  in reverse frame-by-frame; a full reverse-draw on uncheck reads as slower than
  the action deserves.
- Radio buttons use a scale-in dot (`scale(0)` to `scale(1)`, ease-out, ~120ms)
  rather than a stroke draw, since selecting a radio option isn't "marking"
  anything, it's choosing a single filled state.
- Keep total duration under 200ms specifically because checkboxes are frequently
  used in bulk (select-all on a list); anything slower compounds into visible lag
  when many items animate in quick succession.

Why: the stroke-draw motion echoes the physical gesture of drawing a checkmark
with a pen, which people recognize instantly as "marking," whereas a fade or pop
carries no such association and is indistinguishable from any other element simply
appearing on screen. The speed constraint isn't arbitrary either: a 400ms draw
animation feels fine on a single checkbox but becomes visibly staggered and slow
the moment a user checks 20 rows in a table in rapid succession.

Example: `stroke-dasharray: 20; stroke-dashoffset: 20; transition: stroke-dashoffset 180ms ease-out;` animating to `stroke-dashoffset: 0` on check.

Counter-example: the checkmark is a static SVG that simply fades in via opacity.
It's functionally correct but reads identically to any other icon appearing on
screen, losing the "marking" metaphor, and a bulk select-all with 300ms fades on
every row visibly lags behind the click.
